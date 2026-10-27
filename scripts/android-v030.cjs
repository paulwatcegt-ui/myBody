const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const {adb,pause,nodes,find,tap,waitFor,assertText,screenshot}=require('./android-smoke.cjs');
const {scrollTo,field}=require('./android-extended.cjs');
const root=path.resolve(__dirname,'..');
async function top(){
 for(let i=0;i<4;i++){
  const b=nodes().filter(n=>n.scrollable==='true').map(n=>n.bounds.match(/\d+/g).map(Number)).sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];
  if(!b)return;const x=(b[0]+b[2])/2|0,h=b[3]-b[1];adb('shell','input','swipe',String(x),String(b[1]+h*.25|0),String(x),String(b[1]+h*.85|0),'220');
 }
}
function snapshot(label){
 const dir=path.join(root,'.verification',label);fs.mkdirSync(dir,{recursive:true});
 adb('shell','am','force-stop','com.mybody.app');adb('pull','/data/user/0/com.mybody.app/files/SQLite',dir);
 const db=new DatabaseSync(path.join(dir,'SQLite/mybody.db'));
 const result={readings:db.prepare('SELECT * FROM mb_readings ORDER BY id').all(),photos:db.prepare('SELECT * FROM mb_photos ORDER BY id').all(),profile:JSON.parse(db.prepare("SELECT value FROM settings WHERE key='mybody_profile'").get()?.value??'{}')};db.close();return result;
}
async function launch(){adb('shell','am','start','-n','com.mybody.app/.MainActivity');await waitFor('我的关注');}
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw Error('Dedicated test device required');
 adb('root');adb('wait-for-device');const before=snapshot('v030-before');
 adb('install','-r',path.join(root,'delivery/myBody-0.3.0-internal.apk'));await launch();
 tap('我的');await field('身高 cm（选填）','175');await scrollTo('女');tap('女');await scrollTo('生日（选填）选择日期');tap('生日（选填）选择日期');await pause(400);tap('20');tap('确定');
 await field('目标体重 kg（选填）','65');await scrollTo('保存个人资料');tap('保存个人资料');await waitFor('已保存');tap('好的');
 screenshot('v030-profile-details.png');await top();screenshot('v030-profile.png');
 await scrollTo('管理指标与关注');tap('管理指标与关注');await waitFor('搜索指标');await scrollTo('健康监测');tap('健康监测');await top();await field('搜索指标','mmHg');
 await scrollTo('编辑 血压');assertText('编辑 血压');if(find('编辑 体重'))throw Error('Category/search included unrelated metric');screenshot('v030-manager.png');tap('关闭');
 tap('总览');await scrollTo('记录体重');tap('记录体重');await waitFor('记录体重');
 await field('体重数值','75.25');if(find('体脂率数值'))throw Error('Quick entry includes unrelated metric');await top();assertText('24.57');screenshot('v030-quick-entry.png');
 tap('保存本次记录');await waitFor('我的关注');await scrollTo('记录BMI');screenshot('v030-overview-bmi.png');
 const after=snapshot('v030-after');
 if(after.readings.length!==before.readings.length+1)throw Error('Unexpected number of raw records: BMI should not be persisted');
 for(const old of before.readings){const saved=after.readings.find(r=>r.id===old.id);if(JSON.stringify(old)!==JSON.stringify(saved))throw Error('Existing record changed');}
 if(JSON.stringify(after.photos)!==JSON.stringify(before.photos))throw Error('Photos changed');
 if(after.profile.height!=='175'||after.profile.sex!=='female'||after.profile.target_weight!=='65'||!after.profile.birthday)throw Error('Profile did not persist');
 await launch();await scrollTo('记录BMI');tap('记录BMI');await waitFor('BMI · 自动计算');assertText('24.57');tap('关闭');
 fs.writeFileSync(path.join(root,'.verification/android-v030.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),beforeReadings:before.readings.length,afterReadings:after.readings.length,photosPreserved:after.photos.length,profile:after.profile,checks:['in-place upgrade preserves every raw reading','profile gender/height/birthday/goal persist','native birthday selection','management category and unit search','overview opens single-metric entry','automatic BMI preview 24.57','automatic BMI survives restart','derived BMI is not duplicated in SQLite','old photos unchanged']},null,2));
 console.log('ANDROID_V030_PASSED');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
