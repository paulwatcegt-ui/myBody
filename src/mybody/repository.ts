import {validateMetric} from './validation';
export {validateMetric} from './validation';
import {validateProfile} from './calculations';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDB } from '../db/database';
import { Metric, Reading, Photo, Profile, Snapshot, PRESETS, validateReading, CATEGORY_NAMES, FREQUENCIES, isTextReading } from './domain';

// Reuses PulseSense's SQLite singleton/migration infrastructure and typed query pattern.
export const TABLES = ['mb_metrics', 'mb_readings', 'mb_photos'] as const;
export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async tx => {
    const previous=await tx.getFirstAsync<{value:string}>("SELECT value FROM settings WHERE key='mybody_schema_version'");
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS mb_metrics (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, unit TEXT NOT NULL,
        favorite INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1,
        reference_min REAL, reference_max REAL
      );
      CREATE TABLE IF NOT EXISTS mb_readings (
        id TEXT PRIMARY KEY, metric_id TEXT NOT NULL REFERENCES mb_metrics(id), measured_at TEXT NOT NULL,
        value REAL NOT NULL, value2 REAL, unit TEXT NOT NULL, context TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
        reference_min REAL, reference_max REAL
      );
      CREATE TABLE IF NOT EXISTS mb_photos (
        id TEXT PRIMARY KEY, uri TEXT NOT NULL, pose TEXT NOT NULL, taken_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS mb_readings_metric_time ON mb_readings(metric_id, measured_at);
    `);
    // Support early myBody databases without per-record reference ranges.
    for (const table of ['mb_metrics', 'mb_readings']) {
      const columns = await tx.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      for (const name of ['reference_min', 'reference_max']) {
        if (!columns.some(c => c.name === name)) await tx.execAsync(`ALTER TABLE ${table} ADD COLUMN ${name} REAL`);
      }
    }
    const metricColumns=await tx.getAllAsync<{name:string}>('PRAGMA table_info(mb_metrics)');
    if(!metricColumns.some(c=>c.name==='value_type'))await tx.execAsync("ALTER TABLE mb_metrics ADD COLUMN value_type TEXT NOT NULL DEFAULT 'number'");
    if(!metricColumns.some(c=>c.name==='frequency'))await tx.execAsync("ALTER TABLE mb_metrics ADD COLUMN frequency TEXT NOT NULL DEFAULT '随时'");
    const readingColumns=await tx.getAllAsync<{name:string}>('PRAGMA table_info(mb_readings)');
    if(!readingColumns.some(c=>c.name==='text_value'))await tx.execAsync('ALTER TABLE mb_readings ADD COLUMN text_value TEXT');
    if(Number(previous?.value??0)<4)await tx.execAsync("UPDATE mb_metrics SET category='custom' WHERE id LIKE 'custom_%'");
    for (const m of PRESETS) await writeMetric(tx, m, true);
    await tx.runAsync("INSERT OR REPLACE INTO settings(key,value) VALUES('mybody_schema_version','4')");
  });
}
export async function initialize(): Promise<void> { await migrate(await getDB()); }
async function writeMetric(db: SQLiteDatabase, m: Metric, ignore = false): Promise<void> {
  await db.runAsync(`INSERT ${ignore ? 'OR IGNORE' : 'OR REPLACE'} INTO mb_metrics
    (id,name,category,unit,favorite,sort_order,active,reference_min,reference_max,value_type,frequency) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [m.id, m.name, m.category, m.unit, m.favorite, m.sort_order, m.active, m.reference_min, m.reference_max,m.value_type??'number',m.frequency??'随时']);
}
async function writeReading(db: SQLiteDatabase, r: Reading): Promise<void> {
  await db.runAsync(`INSERT OR REPLACE INTO mb_readings
    (id,metric_id,measured_at,value,value2,unit,context,note,reference_min,reference_max,text_value) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [r.id,r.metric_id,r.measured_at,r.value,r.value2,r.unit,r.context,r.note,r.reference_min,r.reference_max,r.text_value??null]);
}
export async function readSnapshot(db?: SQLiteDatabase): Promise<Snapshot> {
  const conn = db ?? await getDB();
  const metrics = await conn.getAllAsync<Metric>('SELECT * FROM mb_metrics ORDER BY sort_order,id');
  const readings = await conn.getAllAsync<Reading>('SELECT * FROM mb_readings ORDER BY measured_at,id');
  const photos = await conn.getAllAsync<Photo>('SELECT * FROM mb_photos ORDER BY taken_at DESC,id');
  const row = await conn.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key='mybody_profile'");
  const profile: Profile = row ? JSON.parse(row.value) : { name: '', height: '', birthday: '' };
  return { metrics, readings, photos, profile };
}
export async function saveBatch(rows: Reading[], db?: SQLiteDatabase): Promise<void> {
  if (!rows.length) throw new Error('请至少填写一项指标');
  if(rows.some(r=>r.derived_from))throw new Error('自动计算的指标请修改来源记录');
  rows.forEach(validateReading);
  const conn = db ?? await getDB();
  await conn.withExclusiveTransactionAsync(async tx => {
    for (const r of rows) {
      const metric=await tx.getFirstAsync<{value_type:string}>('SELECT value_type FROM mb_metrics WHERE id=?',[r.metric_id]);
      if(!metric)throw new Error('指标已不存在，请重新选择');
      if((metric.value_type==='text')!==isTextReading(r))throw new Error('记录内容与指标类型不一致');
      await writeReading(tx, r);
    }
  });
}
export async function removeReading(id: string): Promise<void> {
  await (await getDB()).runAsync('DELETE FROM mb_readings WHERE id=?', [id]);
}
export async function saveMetric(m: Metric): Promise<void> {
 validateMetric(m);const db=await getDB();const old=await db.getFirstAsync<Metric>('SELECT * FROM mb_metrics WHERE id=?',[m.id]);
 if(old&&(old.value_type??'number')!==(m.value_type??'number')){const count=await db.getFirstAsync<{n:number}>('SELECT COUNT(*) AS n FROM mb_readings WHERE metric_id=?',[m.id]);if(count?.n)throw new Error('已有记录的指标不能切换数值／文本类型，请新建指标');}
 await writeMetric(db,m);
}
export async function moveFavorite(id: string, direction: -1 | 1): Promise<void> {
  const db = await getDB();
  await db.withExclusiveTransactionAsync(async tx => {
    const all = await tx.getAllAsync<Metric>('SELECT * FROM mb_metrics WHERE favorite=1 AND active=1 ORDER BY sort_order,id');
    const i = all.findIndex(m => m.id === id), next = i + direction;
    if (i < 0 || next < 0 || next >= all.length) return;
    [all[i], all[next]] = [all[next], all[i]];
    // Re-number instead of swapping equal sort_order values from imported data.
    for (let j = 0; j < all.length; j++) await tx.runAsync('UPDATE mb_metrics SET sort_order=? WHERE id=?', [j,all[j].id]);
  });
}
export async function saveProfile(profile: Profile): Promise<void> {
  validateProfile(profile);
  await (await getDB()).runAsync("INSERT OR REPLACE INTO settings(key,value) VALUES('mybody_profile',?)", [JSON.stringify(profile)]);
}
export async function saveThemePreference(theme:NonNullable<Profile['theme']>):Promise<void>{
 const row=await (await getDB()).getFirstAsync<{value:string}>("SELECT value FROM settings WHERE key='mybody_profile'");
 const profile:Profile=row?JSON.parse(row.value):{name:'',height:'',birthday:''};await saveProfile({...profile,theme});
}
export async function addPhoto(photo: Photo): Promise<void> {
  await (await getDB()).runAsync('INSERT INTO mb_photos(id,uri,pose,taken_at,note) VALUES(?,?,?,?,?)', [photo.id,photo.uri,photo.pose,photo.taken_at,photo.note]);
}
export async function removePhoto(id: string): Promise<void> { await (await getDB()).runAsync('DELETE FROM mb_photos WHERE id=?', [id]); }
export async function replaceSnapshot(snapshot: Snapshot, db?: SQLiteDatabase): Promise<void> {
  const conn = db ?? await getDB();
  await conn.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync('DELETE FROM mb_readings; DELETE FROM mb_photos; DELETE FROM mb_metrics;');
    for (const m of snapshot.metrics) await writeMetric(tx,m);
    for (const m of PRESETS) await writeMetric(tx,m,true);
    for (const r of snapshot.readings) await writeReading(tx,r);
    for (const p of snapshot.photos) await tx.runAsync('INSERT INTO mb_photos(id,uri,pose,taken_at,note) VALUES(?,?,?,?,?)', [p.id,p.uri,p.pose,p.taken_at,p.note]);
    await tx.runAsync("INSERT OR REPLACE INTO settings(key,value) VALUES('mybody_profile',?)", [JSON.stringify(snapshot.profile)]);
  });
}
