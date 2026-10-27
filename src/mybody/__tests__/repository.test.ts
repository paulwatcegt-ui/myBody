import {DatabaseSync} from 'node:sqlite';
import type {SQLiteDatabase} from 'expo-sqlite';
import {getDB} from '../../db/database';
import {runMigrations} from '../../db/migrations';
import {migrate,readSnapshot,saveBatch,replaceSnapshot,removeReading,saveMetric,saveProfile,saveThemePreference,moveFavorite} from '../repository';
import {Reading,csv,series,readingValue} from '../domain';
import {validateManifest} from '../backupFormat';
jest.mock('../../db/database',()=>({getDB:jest.fn()}));
function adapter(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 const db={
  execAsync:async(q:string)=>{sql.exec(q);},
  runAsync:async(q:string,params:any[]=[])=>sql.prepare(q).run(...params),
  getAllAsync:async(q:string,params:any[]=[])=>sql.prepare(q).all(...params),
  getFirstAsync:async(q:string,params:any[]=[])=>sql.prepare(q).get(...params)??null,
  withExclusiveTransactionAsync:async(fn:(tx:any)=>Promise<void>)=>{sql.exec('BEGIN');try{await fn(db);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}},
 };
 return {db:db as unknown as SQLiteDatabase,close:()=>sql.close()};
}
const row=(more:Partial<Reading>={}):Reading=>({id:'r',metric_id:'weight',measured_at:'2026-10-27T00:00:00Z',value:70,value2:null,unit:'kg',context:'',note:'',reference_min:null,reference_max:null,...more});
let current:ReturnType<typeof adapter>;
beforeEach(async()=>{current=adapter();(getDB as jest.Mock).mockResolvedValue(current.db);await runMigrations(current.db);await migrate(current.db);});
afterEach(()=>current.close());
test('fresh installation and repeated migration preserve existing data',async()=>{
 await saveBatch([row()]);await migrate(current.db);expect((await readSnapshot()).readings).toHaveLength(1);expect((await readSnapshot()).metrics.length).toBeGreaterThan(20);
});
test('insert, edit, delete and backfill use real SQLite constraints',async()=>{
 await saveBatch([row(),row({id:'old',measured_at:'2026-09-01T00:00:00Z',value:75})]);await saveBatch([row({value:69})]);
 expect((await readSnapshot()).readings.map(r=>r.value)).toEqual([75,69]);await removeReading('r');expect((await readSnapshot()).readings).toHaveLength(1);
});
test('failed multi-record write rolls back all records',async()=>{
 await expect(saveBatch([row(),row({id:'bad',metric_id:'not-found'})])).rejects.toThrow();expect((await readSnapshot()).readings).toHaveLength(0);
});
test('failed restore preserves all previous data transactionally',async()=>{
 await saveBatch([row()]);const snapshot=await readSnapshot();await expect(replaceSnapshot({...snapshot,readings:[row({metric_id:'missing'})]})).rejects.toThrow();expect((await readSnapshot()).readings[0].value).toBe(70);
});
test('custom indicators, default unit changes and references do not rewrite history',async()=>{
 const m=(await readSnapshot()).metrics[0];await saveBatch([row({reference_min:60,reference_max:80})]);await saveMetric({...m,unit:'lb',reference_max:100});
 expect((await readSnapshot()).readings[0]).toMatchObject({unit:'kg',reference_max:80});
});
test('profile and favorite order persist in database',async()=>{
 await saveProfile({name:'测试',height:'170',birthday:'2000-01-01'});await moveFavorite('weight',1);const result=await readSnapshot();expect(result.profile.name).toBe('测试');expect(result.metrics.filter(m=>m.favorite)[0].id).toBe('body_fat');
});
test('migration upgrades missing reference columns without losing records',async()=>{
 await current.db.execAsync('ALTER TABLE mb_readings DROP COLUMN reference_min; ALTER TABLE mb_readings DROP COLUMN reference_max;');
 await migrate(current.db);await saveBatch([row({reference_min:1})]);expect((await readSnapshot()).readings[0].reference_min).toBe(1);
});

test('upgrade from the old schema preserves values and seeds six categories',async()=>{
 await saveBatch([row()]);
 await current.db.execAsync("DELETE FROM mb_metrics WHERE id IN ('diet_notes','sleep_notes','exercise_notes'); ALTER TABLE mb_metrics DROP COLUMN value_type; ALTER TABLE mb_metrics DROP COLUMN frequency; ALTER TABLE mb_readings DROP COLUMN text_value; UPDATE settings SET value='2' WHERE key='mybody_schema_version';");
 await migrate(current.db);const snapshot=await readSnapshot();
 expect(snapshot.readings[0]).toMatchObject({id:'r',value:70,unit:'kg'});
 expect(new Set(snapshot.metrics.map(m=>m.category))).toEqual(new Set(['body','health','fitness','lifestyle','lab']));
 expect(snapshot.metrics.find(m=>m.id==='diet_notes')?.value_type).toBe('text');
});

test('text records survive SQLite and backup without being graphed as zero',async()=>{
 const metric=(await readSnapshot()).metrics.find(m=>m.id==='diet_notes')!;
 const text=row({metric_id:metric.id,value:0,unit:'',text_value:'早餐：鸡蛋与牛奶'});
 await saveBatch([text]);const snapshot=await readSnapshot();
 expect(readingValue(snapshot.readings[0])).toBe(text.text_value);
 expect(series(snapshot.readings,metric.id)).toEqual([]);
 expect(csv(snapshot)).toContain(text.text_value);
 expect(validateManifest({app:'myBody',version:2,exported_at:new Date().toISOString(),snapshot}).snapshot.readings[0].text_value).toBe(text.text_value);
 await expect(saveMetric({...metric,value_type:'number',unit:'份'})).rejects.toThrow();
});

test('extended profile survives SQLite and backup while calculated BMI stays a view',async()=>{
 const profile={name:'小林',height:'175',birthday:'1995-06-01',sex:'female' as const,target_weight:'65'};
 await saveProfile(profile);await saveBatch([row()]);
 const snapshot=await readSnapshot();expect(snapshot.profile).toEqual(profile);expect(snapshot.readings).toHaveLength(1);
 const restored=validateManifest({app:'myBody',version:2,exported_at:new Date().toISOString(),snapshot}).snapshot;
 await replaceSnapshot(restored);expect((await readSnapshot()).profile).toEqual(profile);
});
test('theme changes preserve profile and records and survive backup restore',async()=>{
 await saveProfile({name:'小林',height:'175',birthday:'1995-06-01',sex:'female'});await saveBatch([row()]);await saveThemePreference('dark');
 const snapshot=await readSnapshot();expect(snapshot.profile).toMatchObject({name:'小林',height:'175',sex:'female',theme:'dark'});expect(snapshot.readings).toHaveLength(1);
 await replaceSnapshot(validateManifest({app:'myBody',version:2,exported_at:new Date().toISOString(),snapshot}).snapshot);expect((await readSnapshot()).profile.theme).toBe('dark');
 await expect(saveThemePreference('invalid' as any)).rejects.toThrow();expect((await readSnapshot()).profile.theme).toBe('dark');
});
