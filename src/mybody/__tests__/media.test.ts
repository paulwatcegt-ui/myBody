import {File} from 'expo-file-system';
import * as Picker from 'expo-image-picker';
import * as Documents from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {Image} from 'react-native';
import {PRESETS,Snapshot} from '../domain';
import {capturePhoto,exportBackup,importBackup} from '../media';
import {addPhoto,readSnapshot,replaceSnapshot} from '../repository';
const mockFiles=new Map<string,Uint8Array>();const mockDirs=new Set<string>();
jest.mock('expo-file-system',()=>({
 Paths:{document:'documents',cache:'cache'},
 File:class {
  uri:string;constructor(...parts:any[]){this.uri=parts.map(p=>typeof p==='string'?p:p.uri).join('/');}
  get exists(){return mockFiles.has(this.uri);}get size(){return mockFiles.get(this.uri)?.length??0;}
  write(bytes:Uint8Array|string){mockFiles.set(this.uri,typeof bytes==='string'?new TextEncoder().encode(bytes):bytes.slice());}
  async bytes(){return mockFiles.get(this.uri)!;}copy(to:any){mockFiles.set(to.uri,mockFiles.get(this.uri)!.slice());}delete(){mockFiles.delete(this.uri);}
 },
 Directory:class {uri:string;constructor(...parts:any[]){this.uri=parts.map(p=>typeof p==='string'?p:p.uri).join('/');}get exists(){return mockDirs.has(this.uri);}create(){mockDirs.add(this.uri);}delete(){for(const key of mockFiles.keys())if(key.startsWith(this.uri+'/'))mockFiles.delete(key);mockDirs.delete(this.uri);}},
}));
jest.mock('expo-image-picker',()=>({requestCameraPermissionsAsync:jest.fn(),launchCameraAsync:jest.fn(),launchImageLibraryAsync:jest.fn()}));
jest.mock('expo-document-picker',()=>({getDocumentAsync:jest.fn()}));
jest.mock('expo-sharing',()=>({isAvailableAsync:jest.fn().mockResolvedValue(true),shareAsync:jest.fn().mockResolvedValue(undefined)}));
jest.mock('../repository',()=>({readSnapshot:jest.fn(),addPhoto:jest.fn(),replaceSnapshot:jest.fn(),removePhoto:jest.fn(),validateMetric:jest.fn()}));
let snapshot:Snapshot;
beforeEach(()=>{mockFiles.clear();mockDirs.clear();jest.clearAllMocks();jest.spyOn(Image,'getSize').mockImplementation((_uri,success)=>{success(100,100);return Promise.resolve({width:100,height:100});});snapshot={metrics:PRESETS,readings:[],photos:[],profile:{name:'测试',height:'',birthday:''}};(readSnapshot as jest.Mock).mockImplementation(async()=>snapshot);(addPhoto as jest.Mock).mockImplementation(async p=>snapshot.photos.push(p));(replaceSnapshot as jest.Mock).mockImplementation(async s=>{snapshot=s;});});
afterEach(()=>jest.restoreAllMocks());
test('camera permission denial never adds a photo',async()=>{
 (Picker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({granted:false});await expect(capturePhoto(true,'front',new Date().toISOString(),'')).rejects.toThrow(/权限/);expect(addPhoto).not.toHaveBeenCalled();
});
test('cancelled picker never creates a record',async()=>{
 (Picker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({canceled:true});expect(await capturePhoto(false,'front',new Date().toISOString(),'')).toBe(false);expect(addPhoto).not.toHaveBeenCalled();
});
async function createBackup(){
 mockFiles.set('picked/photo.jpg',new Uint8Array([255,216,255,1,2,3]));(Picker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({canceled:false,assets:[{uri:'picked/photo.jpg'}]});
 await capturePhoto(false,'front',new Date().toISOString(),'晨起');await exportBackup();
 const archiveUri=(Sharing.shareAsync as jest.Mock).mock.calls.at(-1)[0];(Documents.getDocumentAsync as jest.Mock).mockResolvedValue({canceled:false,assets:[{uri:archiveUri}]});
 return snapshot.photos[0].uri;
}
test('photo is copied privately, then survives full ZIP restore',async()=>{
 const oldUri=await createBackup();expect(oldUri).toContain('documents/mybody-photos/');expect(await importBackup()).toBe(true);expect(snapshot.photos[0].note).toBe('晨起');expect(mockFiles.has(snapshot.photos[0].uri)).toBe(true);expect(mockFiles.has(oldUri)).toBe(false);
});
test('database restore failure removes staged photos but preserves old files',async()=>{
 const oldUri=await createBackup();(replaceSnapshot as jest.Mock).mockRejectedValueOnce(new Error('disk full'));await expect(importBackup()).rejects.toThrow('disk full');expect(mockFiles.has(oldUri)).toBe(true);expect([...mockFiles.keys()].filter(k=>k.includes('restore-'))).toEqual([]);
});
test('corrupt ZIP and cancelled restore leave the database untouched',async()=>{
 mockFiles.set('cache/bad.zip',new Uint8Array([1,2,3]));(Documents.getDocumentAsync as jest.Mock).mockResolvedValue({canceled:false,assets:[{uri:'cache/bad.zip'}]});await expect(importBackup()).rejects.toThrow();expect(replaceSnapshot).not.toHaveBeenCalled();
 (Documents.getDocumentAsync as jest.Mock).mockResolvedValue({canceled:true});expect(await importBackup()).toBe(false);
});
test('undecodable photo rejects restore before replacing database',async()=>{
 const oldUri=await createBackup();(Image.getSize as jest.Mock).mockImplementationOnce((_uri,_success,failure)=>failure(new Error('invalid image')));
 await expect(importBackup()).rejects.toThrow(/照片/);expect(replaceSnapshot).not.toHaveBeenCalled();expect(mockFiles.has(oldUri)).toBe(true);
});
