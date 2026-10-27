process.env.MYBODY_ADB_PORT??='5038';
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const {adb,pause,tap,waitFor,screenshot}=require('./android-smoke.cjs');
const root=path.resolve(__dirname,'..');
async function currentUser(id){for(let i=0;i<30;i++){if(adb('shell','am','get-current-user').trim()===String(id))return;await pause(400);}throw Error('User switch timeout');}
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw Error('Dedicated emulator required');
 const name=`myBody-v060-fresh-${Date.now()}`,created=adb('shell','pm','create-user',name),id=Number(created.match(/user id (\d+)/)?.[1]);
 if(!Number.isSafeInteger(id)||id<10)throw Error('Fresh user could not be created: '+created);
 try{
  adb('shell','settings','--user',String(id),'put','secure','user_setup_complete','1');adb('shell','am','switch-user',String(id));await currentUser(id);adb('shell','input','keyevent','82');adb('install','--user',String(id),'-r',path.join(root,'delivery/myBody-0.6.0-internal.apk'));
  adb('shell','am','start','--user',String(id),'-n','com.mybody.app/.MainActivity');await pause(100);screenshot('v060-first-install-startup.png');await waitFor('我的关注');screenshot('v060-first-install-overview.png');tap('我的');await waitFor('完善档案');screenshot('v060-first-install-profile.png');tap('完善档案');await waitFor('保存个人资料');tap('关闭');await waitFor('完善档案');
  adb('shell','am','force-stop','--user',String(id),'com.mybody.app');const target=path.join(root,'.verification/v060-fresh-user');fs.mkdirSync(target,{recursive:true});adb('pull',`/data/user/${id}/com.mybody.app/files/SQLite`,target);const db=new DatabaseSync(path.join(target,'SQLite/mybody.db'));const metrics=db.prepare('SELECT COUNT(*) AS n FROM mb_metrics').get().n,readings=db.prepare('SELECT COUNT(*) AS n FROM mb_readings').get().n,photos=db.prepare('SELECT COUNT(*) AS n FROM mb_photos').get().n;db.close();if(metrics<50||readings!==0||photos!==0)throw Error('Fresh database invalid');
  fs.writeFileSync(path.join(root,'.verification/android-v060-fresh.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),metrics,readings,photos,checks:['isolated Android user first installation','fresh SQLite creates presets without records','optional empty profile summary','open and close empty editor without confirmation','owner data never cleared']},null,2));console.log('ANDROID_V060_FRESH_PASSED');
 }finally{
  adb('shell','am','switch-user','0');await currentUser(0);adb('shell','am','stop-user','-w','-f',String(id));const users=adb('shell','pm','list','users');if(!users.includes(`UserInfo{${id}:${name}:`))throw Error('Refusing to remove an unrelated user');adb('shell','pm','remove-user','--wait',String(id));
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
