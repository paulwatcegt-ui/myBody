import {ageInYears,validateProfile,withAutomaticBMI} from '../calculations';
import {Profile,Reading} from '../domain';
const profile:Profile={name:'',height:'175',birthday:'2000-10-28'};
const row=(id:string,metric_id:string,value:number,time='2026-10-20T08:00:00Z',unit=metric_id==='height'?'cm':'kg'):Reading=>({id,metric_id,value,unit,measured_at:time,value2:null,reference_min:null,reference_max:null,context:'',note:''});
test('age changes only on birthday and invalid or future birthdays are rejected',()=>{
 expect(ageInYears(profile.birthday,new Date(2026,9,27))).toBe(25);
 expect(ageInYears(profile.birthday,new Date(2026,9,28))).toBe(26);
 expect(ageInYears('2026-02-30')).toBeNull();expect(()=>validateProfile({...profile,birthday:'2099-01-01'})).toThrow();
 expect(()=>validateProfile({...profile,sex:'male',target_weight:'65'})).not.toThrow();
 expect(()=>validateProfile({...profile,sex:'invalid' as any})).toThrow();
});
test('BMI follows each weight and the height available at its measurement time',()=>{
 const raw=[row('w','weight',70),row('h','height',180,'2026-10-21T08:00:00Z'),row('w2','weight',70,'2026-10-22T08:00:00Z')];
 const result=withAutomaticBMI(raw,profile).filter(r=>r.derived_from);
 expect(result.map(r=>r.value)).toEqual([22.86,21.6]);expect(raw).toHaveLength(3);
 expect(withAutomaticBMI(withAutomaticBMI(raw,profile),profile)).toHaveLength(5);
 const backfilled=withAutomaticBMI([...raw,row('old-height','height',170,'2026-10-19T08:00:00Z')],profile);
 expect(backfilled.find(r=>r.derived_from==='w')?.value).toBe(24.22);
});
test('BMI responds to editing, deleting and profile updates without stale persisted copies',()=>{
 const weight=row('w','weight',70);
 expect(withAutomaticBMI([weight],profile).find(r=>r.derived_from)?.value).toBe(22.86);
 expect(withAutomaticBMI([{...weight,value:65}],profile).find(r=>r.derived_from)?.value).toBe(21.22);
 expect(withAutomaticBMI([],profile)).toEqual([]);
 expect(withAutomaticBMI([weight],{...profile,height:'180'}).find(r=>r.derived_from)?.value).toBe(21.6);
 expect(withAutomaticBMI([weight],{...profile,height:''})).toEqual([weight]);
});
test('known units convert explicitly; unknown or nonpositive values never generate BMI',()=>{
 expect(withAutomaticBMI([row('w','weight',140,undefined,'斤')],profile).find(r=>r.derived_from)?.value).toBe(22.86);
 expect(withAutomaticBMI([row('w','weight',70,undefined,'stones')],profile)).toHaveLength(1);
 expect(withAutomaticBMI([row('w','weight',0)],profile)).toHaveLength(1);
 expect(withAutomaticBMI([row('w','weight',70),row('h','height',180,undefined,'unknown')],profile)).toHaveLength(2);
});
test('legacy manual BMI is retained alongside calculated history',()=>{
 const legacy=row('manual','bmi',22,undefined,'kg/m²');
 expect(withAutomaticBMI([legacy,row('w','weight',70)],profile)).toContainEqual(legacy);
});
