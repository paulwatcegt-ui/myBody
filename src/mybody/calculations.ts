import {Profile,Reading,SEX_NAMES,localDate} from './domain';

export function ageInYears(birthday:string,now=new Date()):number|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthday))return null;
 const d=new Date(birthday+'T00:00:00');
 if(!Number.isFinite(d.getTime())||localDate(d.toISOString()).slice(0,10)!==birthday||d>now)return null;
 let age=now.getFullYear()-d.getFullYear();
 if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))age--;
 return age;
}
export function validateProfile(profile:Profile):void {
 if(profile.theme!==undefined&&!['system','light','dark'].includes(profile.theme))throw new Error('外观设置无效');
 if(typeof profile.name!=='string'||profile.name.length>2000||typeof profile.height!=='string'||typeof profile.birthday!=='string')throw new Error('个人资料格式无效');
 if(profile.sex!==undefined&&(typeof profile.sex!=='string'||!Object.keys(SEX_NAMES).includes(profile.sex)))throw new Error('请选择有效性别');
 if(profile.target_weight!==undefined&&typeof profile.target_weight!=='string')throw new Error('目标体重格式无效');
 for(const [label,value] of [['身高',profile.height],['目标体重',profile.target_weight]] as const){
  if(value&&(!Number.isFinite(Number(value))||Number(value)<=0))throw new Error(`${label}请填写大于 0 的数字`);
 }
 if(profile.birthday&&ageInYears(profile.birthday)===null)throw new Error('生日必须是有效日期，且不能晚于今天');
}
export function weightKg(value:number,unit:string):number|null {
 const factor:Record<string,number>={kg:1,'公斤':1,'斤':.5,lb:.45359237};
 return value>0&&Number.isFinite(value)&&factor[unit]!==undefined?value*factor[unit]:null;
}
export function heightCm(value:number,unit:string):number|null {
 const factor:Record<string,number>={cm:1,m:100,'厘米':1};
 return value>0&&Number.isFinite(value)&&factor[unit]!==undefined?value*factor[unit]:null;
}
export function calculateBMI(weight:number,height:number):number|null {
 const bmi=weight/(height/100)**2;
 return weight>0&&height>0&&Number.isFinite(bmi)?Math.round(bmi*100)/100:null;
}
// Mifflin–St Jeor estimate (kcal/day); no sex coefficient is assumed.
export function calculateBMR(weight:number,height:number,profile:Profile,now=new Date()):number|null {
 const age=ageInYears(profile.birthday,now);
 if(age===null||age<18||!['male','female'].includes(profile.sex??'')||weight<=0||height<=0)return null;
 const value=10*weight+6.25*height-5*age+(profile.sex==='male'?5:-161);
 return Number.isFinite(value)&&value>0?Math.round(value):null;
}
// Computed records are a view of source measurements, never persisted or backed up.
// Rebuilding the view makes edits, deletions and backfills update BMI consistently.
export function withAutomaticBMI(readings:Reading[],profile:Profile):Reading[]{
 const raw=readings.filter(r=>!r.derived_from),heights=raw.filter(r=>r.metric_id==='height').sort((a,b)=>Date.parse(a.measured_at)-Date.parse(b.measured_at)||a.id.localeCompare(b.id));
 let index=0,height:Reading|undefined;
 const weights=raw.filter(r=>r.metric_id==='weight').sort((a,b)=>Date.parse(a.measured_at)-Date.parse(b.measured_at)||a.id.localeCompare(b.id));
 const derived:Reading[]=[];
 for(const weight of weights){
  const time=Date.parse(weight.measured_at);
  while(index<heights.length&&Date.parse(heights[index].measured_at)<=time)height=heights[index++];
  const kg=weightKg(weight.value,weight.unit),cm=height?heightCm(height.value,height.unit):heightCm(Number(profile.height),'cm');
  const value=kg!==null&&cm!==null?calculateBMI(kg,cm):null;
  const bmr=kg!==null&&cm!==null?calculateBMR(kg,cm,profile,new Date(weight.measured_at)):null;
  for(const [metric_id,result,unit] of [['bmi',value,'kg/m²'],['bmr',bmr,'kcal/天']] as const){
   if(result===null)continue;
   derived.push({id:`derived_${metric_id}:${weight.id}`,metric_id,measured_at:weight.measured_at,value:result,value2:null,unit,context:'',reference_min:null,reference_max:null,text_value:null,derived_from:weight.id,note:`自动计算${metric_id==='bmr'?'（Mifflin–St Jeor 估算）':''}：体重 ${weight.value} ${weight.unit}；身高 ${height?`${height.value} ${height.unit}`:`${profile.height} cm（档案身高）`}`});
  }
 }
 return [...raw,...derived].sort((a,b)=>Date.parse(a.measured_at)-Date.parse(b.measured_at)||a.id.localeCompare(b.id));
}
