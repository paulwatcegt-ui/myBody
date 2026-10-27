import {validateProfile} from './calculations';
import { Snapshot, Metric, Reading, Photo, Profile, isDate, validateReading } from './domain';
import { validateMetric } from './repository';
export const BACKUP_VERSION = 2;
export const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
export interface BackupManifest { app: 'myBody'; version: number; exported_at: string; snapshot: Snapshot }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 20000;
export function validateManifest(value: unknown): BackupManifest {
  if (!object(value) || value.app !== 'myBody' || ![1,BACKUP_VERSION].includes(value.version as number) || !isDate(value.exported_at) || !object(value.snapshot)) throw new Error('备份损坏或格式版本不支持');
  const s = value.snapshot;
  if (!Array.isArray(s.metrics) || !s.metrics.length || !Array.isArray(s.readings) || !Array.isArray(s.photos) || !object(s.profile) || s.metrics.length > 1000 || s.readings.length > 200000 || s.photos.length > 2000) throw new Error('备份内容不完整或记录数超出限制');
  const metrics = s.metrics.map((v: unknown): Metric => {
    if (!object(v) || !text(v.id) || !text(v.name) || !text(v.unit) || !text(v.category) || ![0,1].includes(v.active as number) || ![0,1].includes(v.favorite as number) || !Number.isSafeInteger(v.sort_order) || ![v.reference_min,v.reference_max].every(n => n === null || typeof n === 'number' && Number.isFinite(n))) throw new Error('备份指标格式无效');
    const m = {...v,value_type:v.value_type??'number',frequency:v.frequency??'随时',category:value.version===1&&(v.id as string).startsWith('custom_')?'custom':v.category} as unknown as Metric; validateMetric(m); return m;
  });
  if (new Set(metrics.map(m=>m.id)).size !== metrics.length) throw new Error('备份含重复指标');
  const ids = new Set(metrics.map(m=>m.id));
  const readings = s.readings.map((v: unknown): Reading => {
    if (!object(v) || !text(v.id) || !text(v.metric_id) || !ids.has(v.metric_id) || !text(v.unit) || !text(v.context) || !text(v.note) || typeof v.value !== 'number' || ![v.value2,v.reference_min,v.reference_max].every(n => n === null || typeof n === 'number' && Number.isFinite(n))) throw new Error('备份读数格式无效');
    const r = {...v,text_value:v.text_value??null} as unknown as Reading; validateReading(r);
    if((metrics.find(m=>m.id===r.metric_id)?.value_type==='text')!==(r.text_value!==null))throw new Error('备份记录类型与指标不一致');return r;
  });
  if (new Set(readings.map(r=>r.id)).size !== readings.length) throw new Error('备份含重复读数');
  const photos = s.photos.map((v: unknown): Photo => {
    if (!object(v) || !text(v.id) || !text(v.uri) || !/^photos\/[a-zA-Z0-9_-]+\.jpg$/.test(v.uri) || !['front','side','back'].includes(v.pose as string) || !isDate(v.taken_at) || !text(v.note)) throw new Error('备份照片格式无效');
    return v as unknown as Photo;
  });
  if (new Set(photos.map(p=>p.id)).size !== photos.length || new Set(photos.map(p=>p.uri)).size !== photos.length) throw new Error('备份含重复照片');
  if (!text(s.profile.name) || !text(s.profile.height) || !text(s.profile.birthday)) throw new Error('备份个人资料无效');
  validateProfile(s.profile as unknown as Profile);
  return { app:'myBody', version:BACKUP_VERSION, exported_at: value.exported_at, snapshot: { metrics, readings, photos, profile: s.profile as unknown as Profile } };
}
