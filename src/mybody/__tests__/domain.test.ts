import {Reading,Snapshot,PRESETS,series,latestPair,delta,parseLocalDate,numberInput,validateReading,csv} from '../domain';
import {validateManifest} from '../backupFormat';
const reading=(more:Partial<Reading>={}):Reading=>({id:'r1',metric_id:'weight',measured_at:'2026-10-20T01:00:00.000Z',value:70,value2:null,unit:'kg',context:'',note:'',reference_min:null,reference_max:null,...more});
const snapshot=():Snapshot=>({metrics:PRESETS,readings:[reading()],photos:[],profile:{name:'',height:'',birthday:''}});
describe('measurement semantics',()=>{
 test('backfilled records sort by actual measurement time, not insertion id',()=>{
  const rows=[reading({id:'new',measured_at:'2026-10-21T01:00:00Z',value:68}),reading({id:'backfill',value:71})];
  expect(latestPair(rows,'weight').map(r=>r.value)).toEqual([71,68]);
 });
 test('units and glucose contexts never mix in trend or deltas',()=>{
  const rows=[reading({metric_id:'glucose',unit:'mmol/L',context:'fasting',value:5}),reading({id:'r2',metric_id:'glucose',unit:'mg/dL',context:'fasting',value:90}),reading({id:'r3',metric_id:'glucose',context:'postmeal',unit:'mmol/L',value:7})];
  expect(series(rows,'glucose',0,'mmol/L','fasting').map(r=>r.value)).toEqual([5]);
 });
 test('range excludes future and out-of-window records',()=>{
  const now=Date.parse('2026-10-27T01:00:00Z');
  expect(series([reading(),reading({id:'future',measured_at:'2027-01-01T01:00:00Z'})],'weight',7,undefined,undefined,now)).toHaveLength(1);
 });
 test('one record stays one record, empty records stay empty',()=>{expect(series([],'weight')).toEqual([]);expect(series([reading()],'weight')).toHaveLength(1);});
 test('blood pressure requires two finite positive readings',()=>{
  expect(()=>validateReading(reading({metric_id:'bp',value:120,value2:null,unit:'mmHg'}))).toThrow();
  expect(()=>validateReading(reading({metric_id:'bp',value:120,value2:80,unit:'mmHg'}))).not.toThrow();
 });
 test.each(['2026-02-30 10:00','garbage','2026-13-01 10:00'])('rejects invalid date %s',v=>expect(()=>parseLocalDate(v)).toThrow());
 test('valid local time round trips and delta stays neutral',()=>{expect(Number.isFinite(Date.parse(parseLocalDate('2026-10-27 09:30')))).toBe(true);expect(delta(70.1,69.8)).toBe('-0.3');});
 test.each(['NaN','Infinity','0x12','1e999',''])('rejects invalid number %s',v=>expect(()=>numberInput(v)).toThrow());
 test('CSV quotes Unicode, newlines and spreadsheet formulas',()=>{const s=snapshot();s.readings[0].note='=SUM(1,2)\n备注';expect(csv(s)).toContain('"\'=SUM(1,2)\n备注"');});
 test('CSV preserves negative numeric measurements',()=>{const s=snapshot();s.readings[0].value=-1.5;expect(csv(s)).toContain('"-1.5"');expect(csv(s)).not.toContain('"\'-1.5"');});
});
describe('backup validation before mutation',()=>{
 const manifest=()=>({app:'myBody',version:1,exported_at:'2026-10-27T00:00:00Z',snapshot:snapshot()});
 test('valid backup retains references, contexts and timestamps',()=>expect(validateManifest(manifest()).snapshot.readings[0]).toMatchObject(reading()));
 test('rejects unknown versions and foreign backups',()=>{expect(()=>validateManifest({...manifest(),version:99})).toThrow();expect(()=>validateManifest({...manifest(),app:'other'})).toThrow();});
 test('rejects dangling metrics and duplicate ids',()=>{const m=manifest();m.snapshot.readings[0].metric_id='missing';expect(()=>validateManifest(m)).toThrow();const n=manifest();n.snapshot.readings.push(n.snapshot.readings[0]);expect(()=>validateManifest(n)).toThrow();});
 test('rejects traversal in photo paths and absent metric definitions',()=>{const m=manifest();m.snapshot.photos=[{id:'p',uri:'../../escape.jpg',pose:'front',taken_at:'2026-10-27T00:00:00Z',note:''}];expect(()=>validateManifest(m)).toThrow();const n=manifest();n.snapshot.metrics=[];expect(()=>validateManifest(n)).toThrow();});
 test('rejects malformed numeric fields and reversed references',()=>{const m=manifest();m.snapshot.readings[0].value=NaN;expect(()=>validateManifest(m)).toThrow();const n=manifest();n.snapshot.readings[0].reference_min=10;n.snapshot.readings[0].reference_max=1;expect(()=>validateManifest(n)).toThrow();});
});
