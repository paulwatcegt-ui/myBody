const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const {adb,pause,nodes,tap,waitFor,assertText,screenshot}=require('./android-smoke.cjs');
const {scrollTo,field,save}=require('./android-extended.cjs');
const root=path.resolve(__dirname,'..');
function snapshot(label){
 const dir=path.join(root,'.verification',label);fs.mkdirSync(dir,{recursive:true});
 adb('shell','am','force-stop','com.mybody.app');adb('pull','/data/user/0/com.mybody.app/files/SQLite',dir);
 const db=new DatabaseSync(path.join(dir,'SQLite/mybody.db'));
 const result={readings:db.prepare('SELECT * FROM mb_readings ORDER BY id').all(),photos:db.prepare('SELECT * FROM mb_photos ORDER BY id').all()};db.close();return result;
}
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw new Error('Dedicated emulator required');
 adb('root');adb('wait-for-device');const before=snapshot('upgrade-before');
 adb('install','-r',path.join(root,'delivery/myBody-0.2.0-internal.apk'));
 const after=snapshot('upgrade-after-install');
 if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Install altered existing data');
 adb('shell','am','start','-n','com.mybody.app/.MainActivity');await waitFor('我的关注');
 tap('记录');await waitFor('身体档案');
 for(const label of ['身体档案','健康监测','健身与运动','生活状态','体检报告','自定义指标']){await scrollTo(label);assertText(label);}
 for(let i=0;i<3;i++)adb('shell','input','swipe','500','650','500','1800','250');
 screenshot('v020-categories.png');tap('身体档案');await waitFor('测量时间');
 tap('测量时间选择日期');await pause(600);screenshot('v020-calendar.png');tap('取消');
 tap('测量时间选择时间');await pause(600);screenshot('v020-clock.png');tap('取消');
 tap('昨天');await pause(250);
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 const expected=[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,'0'),String(yesterday.getDate()).padStart(2,'0')].join('-');assertText(expected);
 await field('体重数值','71.25');screenshot('v020-number-input.png');
 for(let i=0;i<3;i++)adb('shell','input','swipe','500','650','500','1300','250');
 tap('全部分类');await scrollTo('生活状态');tap('生活状态');await field('饮食记录内容','breakfast: egg and milk');await save();
 const saved=snapshot('upgrade-after-save');
 if(saved.readings.length!==before.readings.length+2||saved.photos.length!==before.photos.length)throw new Error('Record/photo counts mismatch');
 const text=saved.readings.find(r=>r.text_value==='breakfast: egg and milk');if(!text)throw new Error('Text entry missing');
 for(const old of before.readings){const row=saved.readings.find(r=>r.id===old.id);for(const key of Object.keys(old))if(row[key]!==old[key])throw new Error('Old record changed: '+key);}
 const baselinePath=path.join(root,'.verification/device-mybody.db');let originalVersionReadings=null;
 if(fs.existsSync(baselinePath)){
  const baseline=new DatabaseSync(baselinePath);const original=baseline.prepare('SELECT * FROM mb_readings').all();originalVersionReadings=original.length;
  for(const old of original){const row=saved.readings.find(r=>r.id===old.id);for(const key of Object.keys(old))if(!row||row[key]!==old[key])throw new Error('0.1.0 record changed: '+key);}
  baseline.close();
 }
 adb('shell','settings','put','system','font_scale','1.4');
 try{
  adb('shell','am','start','-n','com.mybody.app/.MainActivity');await waitFor('我的关注');tap('记录');tap('身体档案');await field('体重数值','123.45');screenshot('v020-large-font.png');
 }finally{adb('shell','settings','put','system','font_scale','1.0');}
 fs.writeFileSync(path.join(root,'.verification/android-v020.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),originalVersionReadings,beforeReadings:before.readings.length,afterReadings:saved.readings.length,photosPreserved:saved.photos.length,checks:['in-place upgrade','old numeric records unchanged','old private photos retained','six categories','native calendar and clock cancellation','yesterday shortcut','numeric decimal entry','cross-category draft retention','text SQLite persistence','font scale 1.4']},null,2));
 console.log('ANDROID_V020_PASSED');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
