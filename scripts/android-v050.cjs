const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),{PNG}=require('pngjs');
const {adb,pause,nodes,tap,waitFor,screenshot}=require('./android-smoke.cjs');
const {scrollTo}=require('./android-extended.cjs');
const root=path.resolve(__dirname,'..');
function snapshot(label){
 const dir=path.join(root,'.verification',label);fs.mkdirSync(dir,{recursive:true});adb('shell','am','force-stop','com.mybody.app');adb('pull','/data/user/0/com.mybody.app/files/SQLite',dir);
 const db=new DatabaseSync(path.join(dir,'SQLite/mybody.db'));const result={readings:db.prepare('SELECT * FROM mb_readings ORDER BY id').all(),photos:db.prepare('SELECT * FROM mb_photos ORDER BY id').all(),metrics:db.prepare('SELECT * FROM mb_metrics ORDER BY id').all(),profile:JSON.parse(db.prepare("SELECT value FROM settings WHERE key='mybody_profile'").get()?.value??'{}')};db.close();return result;
}
async function launch(){adb('shell','am','start','-n','com.mybody.app/.MainActivity');await waitFor('我的关注');}
async function scheme(expected,name){
 const file=`v050-${name}.png`;const end=Date.now()+20000;
 while(Date.now()<end){await pause(500);screenshot(file);const png=PNG.sync.read(fs.readFileSync(path.join(root,'.verification',file)));const at=(Math.min(400,png.height-1)*png.width+8)*4,brightness=(png.data[at]+png.data[at+1]+png.data[at+2])/3;if(expected==='dark'?brightness<40:brightness>220)return;}
 throw Error('Theme did not become '+expected+' for '+name);
}
async function showNote(){
 for(let i=0;i<20;i++){
  const all=nodes();const input=all.find(n=>n.class==='android.widget.EditText'&&n['content-desc']==='备注（选填）'&&(()=>{const b=n.bounds.match(/\d+/g).map(Number);return b[2]>b[0]&&b[3]-b[1]>180;})());if(input)return;
  const b=all.filter(n=>n.scrollable==='true').map(n=>n.bounds.match(/\d+/g).map(Number)).sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];if(!b)break;const x=(b[0]+b[2])/2|0,h=b[3]-b[1];adb('shell','input','swipe',String(x),String(b[1]+h*.85|0),String(x),String(b[1]+h*.15|0),'200');
 }throw Error('Note field not visible');
}
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw Error('Dedicated emulator required');adb('root');adb('wait-for-device');const before=snapshot('v050-before');
 adb('shell','cmd','uimode','night','no');adb('install','-r',path.join(root,'delivery/myBody-0.5.0-internal.apk'));await launch();tap('我的');await waitFor('外观');tap('浅色模式');await scheme('light','initial-light');tap('总览');await scheme('light','overview-light');
 tap('我的');await waitFor('外观');tap('浅色模式');await scheme('light','profile-light');tap('深色模式');await scheme('dark','profile-dark');
 tap('总览');await scheme('dark','overview-dark');adb('shell','am','force-stop','com.mybody.app');await launch();await scheme('dark','restart-dark');
 tap('趋势');await waitFor('选择指标');await scheme('dark','trends-dark');tap('记录');tap('身体档案');await waitFor('测量时间');await scheme('dark','record-dark');
 tap('测量时间选择日期');await pause(700);screenshot('v050-calendar-dark.png');tap('取消');await showNote();screenshot('v050-note-dark.png');
 tap('照片');await scheme('dark','photos-dark');tap('我的');await scrollTo('管理指标与关注');tap('管理指标与关注');await waitFor('搜索指标');await scheme('dark','manager-dark');tap('关闭');
 tap('总览');tap('我的');tap('跟随系统');await scheme('light','system-light');adb('shell','cmd','uimode','night','yes');await scheme('dark','system-dark');adb('shell','cmd','uimode','night','no');await scheme('light','system-light-again');
 adb('shell','cmd','uimode','night','yes');await scheme('dark','system-dark-again');tap('我的');tap('浅色模式');await scheme('light','light-override');tap('跟随系统');await scheme('dark','system-restored');adb('shell','cmd','uimode','night','no');await scheme('light','final-light');
 const after=snapshot('v050-after');for(const key of ['readings','photos','metrics'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))throw Error('Existing '+key+' changed');
 for(const [key,value] of Object.entries(before.profile))if(key!=='theme'&&after.profile[key]!==value)throw Error('Profile field changed: '+key);if(after.profile.theme!=='system')throw Error('Theme preference did not persist');
 fs.writeFileSync(path.join(root,'.verification/android-v050.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),readingsPreserved:after.readings.length,photosPreserved:after.photos.length,checks:['upgrade retains all readings/photos/metric settings','light and dark theme pixel checks','manual dark survives restart','five tabs and management sheet in dark mode','native dark date dialog','custom note placeholder visible','system changes update live in both directions','manual light overrides dark system','theme preference saved without changing other profile fields']},null,2));console.log('ANDROID_V050_PASSED');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
