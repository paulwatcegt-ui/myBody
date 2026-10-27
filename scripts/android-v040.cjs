const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const {adb,pause,nodes,tap,waitFor,assertText,screenshot}=require('./android-smoke.cjs');
const root=path.resolve(__dirname,'..');
function snapshot(label){
 const dir=path.join(root,'.verification',label);fs.mkdirSync(dir,{recursive:true});adb('shell','am','force-stop','com.mybody.app');adb('pull','/data/user/0/com.mybody.app/files/SQLite',dir);
 const db=new DatabaseSync(path.join(dir,'SQLite/mybody.db'));const result={readings:db.prepare('SELECT * FROM mb_readings ORDER BY id').all(),photos:db.prepare('SELECT * FROM mb_photos ORDER BY id').all(),favorites:db.prepare('SELECT id FROM mb_metrics WHERE favorite=1 AND active=1 ORDER BY sort_order,id').all().map(m=>m.id)};db.close();return result;
}
async function launch(){adb('shell','am','start','-n','com.mybody.app/.MainActivity');await waitFor('我的关注');}
function firstFavorite(){return nodes().filter(n=>['记录体重','记录体脂率','记录腰围','记录血压','记录心率','记录血糖'].includes(n['content-desc'])).filter(n=>{const b=n.bounds.match(/\d+/g).map(Number);return b[2]>b[0]&&b[3]>b[1];}).sort((a,b)=>{const x=a.bounds.match(/\d+/g).map(Number),y=b.bounds.match(/\d+/g).map(Number);return x[1]-y[1]||x[0]-y[0];})[0]?.['content-desc'];}
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw Error('Dedicated device required');adb('root');adb('wait-for-device');const before=snapshot('v040-before');
 adb('install','-r',path.join(root,'delivery/myBody-0.4.0-internal.apk'));await launch();
 const cards=nodes().filter(n=>/^记录(体重|体脂率|腰围|血压|心率|血糖)$/.test(n['content-desc'])).filter(n=>{const b=n.bounds.match(/\d+/g).map(Number);return b[2]>b[0]&&b[3]>b[1];});
 if(cards.length<4)throw Error('Compact overview should display at least four cards without scrolling');screenshot('v040-overview.png');
 const down=before.favorites[0]==='weight'?'体重下移':'体脂率下移';tap('排序');await waitFor('关注排序');screenshot('v040-sort.png');tap(down);await pause(600);tap('关闭');
 const expected=before.favorites[1]==='weight'?'记录体重':'记录体脂率';if(firstFavorite()!==expected)throw Error('Overview order did not update');
 tap('趋势');await waitFor('历史记录');if(nodes().some(n=>['BMI','训练量','睡眠时长'].includes(n['content-desc'])))throw Error('Unfollowed metric appeared in trends');screenshot('v040-trends.png');
 tap('总览');tap('记录体重');await waitFor('测量时间');
 if(nodes().some(n=>n['content-desc']==='现在'||n.text==='现在'))throw Error('Duplicate now shortcut remains');assertText('今天');assertText('昨天');tap('昨天');screenshot('v040-date.png');tap('关闭');
 const after=snapshot('v040-after');if(JSON.stringify(before.readings)!==JSON.stringify(after.readings)||JSON.stringify(before.photos)!==JSON.stringify(after.photos))throw Error('Existing records changed');
 if(after.favorites[0]!==before.favorites[1]||after.favorites[1]!==before.favorites[0])throw Error('Favorite order not saved');
 await launch();if(firstFavorite()!==expected)throw Error('Favorite order not retained on restart');screenshot('v040-reordered.png');
 fs.writeFileSync(path.join(root,'.verification/android-v040.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),cardsVisible:cards.length,readingsPreserved:after.readings.length,photosPreserved:after.photos.length,beforeOrder:before.favorites,afterOrder:after.favorites,checks:['compact overview shows at least four cards','overview up/down ordering','SQLite and restart preserve order','trends excludes unfollowed presets','date shortcuts only today and yesterday','all old readings and photos unchanged']},null,2));console.log('ANDROID_V040_PASSED');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
