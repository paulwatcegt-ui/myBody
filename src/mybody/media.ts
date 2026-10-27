import {withAutomaticBMI} from './calculations';
import { Directory, File, Paths } from 'expo-file-system';
import * as Picker from 'expo-image-picker';
import * as Documents from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Image } from 'react-native';
import { strToU8, strFromU8 } from 'fflate';
import { encodeArchive, decodeArchive } from './archive';
import { Photo, Pose, Snapshot, uid, csv } from './domain';
import { addPhoto, readSnapshot, removePhoto, replaceSnapshot } from './repository';
import { BACKUP_VERSION, MAX_ARCHIVE_BYTES, validateManifest } from './backupFormat';

const photoRoot = () => new Directory(Paths.document, 'mybody-photos');
export async function capturePhoto(camera: boolean, pose: Pose, takenAt: string, note: string): Promise<boolean> {
  if (camera) {
    const permission = await Picker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('未获得相机权限。你可以从相册选择，或在系统设置中允许相机权限。');
  }
  // Android's system photo picker needs no broad gallery permission.
  const result = camera
    ? await Picker.launchCameraAsync({ mediaTypes:['images'], quality:0.75, allowsEditing:false })
    : await Picker.launchImageLibraryAsync({ mediaTypes:['images'], quality:0.75, allowsEditing:false });
  if (result.canceled || !result.assets[0]) return false;
  const source = new File(result.assets[0].uri);
  if (source.size > 12 * 1024 * 1024) throw new Error('单张照片请控制在 12 MB 以内');
  const root = photoRoot(); root.create({ intermediates:true, idempotent:true });
  const id = uid(); const target = new File(root, `${id}.jpg`);
  source.copy(target);
  try { await addPhoto({ id, uri:target.uri, pose, taken_at:takenAt, note }); }
  catch (e) { if (target.exists) target.delete(); throw e; }
  return true;
}
export async function deletePhoto(photo: Photo): Promise<void> {
  await removePhoto(photo.id);
  // A failed file cleanup must not recreate the already-deleted database row.
  try { const file = new File(photo.uri); if (file.exists) file.delete(); } catch (e) { console.warn('Photo cleanup failed',e); }
}
async function share(file: File, mimeType: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('当前设备不支持文件分享');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle:'保存或分享 myBody 文件' });
}
export async function exportCsv(): Promise<void> {
  const file = new File(Paths.cache, `myBody-${Date.now()}.csv`);
  const snapshot=await readSnapshot();file.write(csv({...snapshot,readings:withAutomaticBMI(snapshot.readings,snapshot.profile)})); await share(file,'text/csv');
}
export async function exportNotices(): Promise<void> {
  const file = new File(Paths.cache, 'myBody-third-party-notices.json');
  file.write(JSON.stringify(require('../../THIRD_PARTY_NOTICES.json'), null, 2));
  await share(file,'application/json');
}
export async function exportBackup(): Promise<void> {
  const snapshot = await readSnapshot();
  const files: Record<string, Uint8Array> = {};
  let total = 0;
  const photos: Photo[] = [];
  for (let i=0; i<snapshot.photos.length; i++) {
    const photo = snapshot.photos[i]; const file = new File(photo.uri);
    if (!file.exists) throw new Error('有照片文件缺失，请先删除该照片记录后再备份');
    total += file.size; if (total > MAX_ARCHIVE_BYTES - 4*1024*1024) throw new Error('完整备份当前支持约 60 MB 照片，请减少照片后重试');
    const name = `photos/${i}.jpg`; files[name] = await file.bytes(); photos.push({ ...photo, uri:name });
  }
  const manifest = validateManifest({ app:'myBody', version:BACKUP_VERSION, exported_at:new Date().toISOString(), snapshot:{...snapshot, photos} });
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  if (files['manifest.json'].length > 16*1024*1024) throw new Error('记录清单超过 16 MB 上限，请先导出 CSV 保存记录');
  total += files['manifest.json'].length;
  if (total > MAX_ARCHIVE_BYTES) throw new Error('备份超过 64 MB 上限');
  const archive = encodeArchive(files);
  const file = new File(Paths.cache, `myBody-backup-${Date.now()}.zip`); file.write(archive);
  await share(file,'application/zip');
}
export async function importBackup(): Promise<boolean> {
  const picked = await Documents.getDocumentAsync({ type:['application/zip','application/octet-stream','application/x-zip-compressed'], copyToCacheDirectory:true });
  if (picked.canceled) return false;
  const input = new File(picked.assets[0].uri);
  if (input.size > MAX_ARCHIVE_BYTES + 1024*1024) throw new Error('备份文件超过 64 MB 上限');
  const contents = decodeArchive(await input.bytes());
  const manifest = validateManifest(JSON.parse(strFromU8(contents['manifest.json'])));
  if (manifest.snapshot.photos.some(p=>!contents[p.uri]?.length)) throw new Error('备份中的照片不完整');
  const old = await readSnapshot();
  const directory = new Directory(photoRoot(), `restore-${uid()}`);
  directory.create({ intermediates:true });
  let committed = false;
  try {
    const photos = manifest.snapshot.photos.map((p,i) => {
      const file = new File(directory,`${i}.jpg`); file.write(contents[p.uri]); return { ...p, uri:file.uri };
    });
    for (const photo of photos) await new Promise<void>((resolve,reject) => {
      Image.getSize(photo.uri,(width,height)=>width>0&&height>0?resolve():reject(new Error('备份照片无效')),()=>reject(new Error('备份中存在无法读取的照片，原有数据未更改')));
    });
    await replaceSnapshot({ ...manifest.snapshot, photos }); committed = true;
  } finally {
    if (!committed && directory.exists) directory.delete();
  }
  // Only remove old photo files after SQLite has committed successfully.
  for (const p of old.photos) {
    try { const file = new File(p.uri); if (file.exists) file.delete(); } catch (e) { console.warn('Old photo cleanup failed', e); }
  }
  return true;
}
