process.env.MYBODY_ADB_PORT??='5038';
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),{unzipSync,strFromU8}=require('fflate');
const {adb,pause,tap,waitFor,screenshot}=require('./android-smoke.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35')||adb('shell','am','get-current-user').trim()!=='0')throw Error('Owner test device required');
 try{
  adb('shell','cmd','uimode','night','yes');adb('shell','am','force-stop','com.mybody.app');adb('shell','am','start','-n','com.mybody.app/.MainActivity');await pause(100);screenshot('v060-startup-dark-0.png');await pause(100);screenshot('v060-startup-dark-1.png');await waitFor('我的关注');screenshot('v060-overview-dark.png');tap('我的');await waitFor('编辑档案');screenshot('v060-profile-dark.png');tap('设置');await waitFor('数据与备份');screenshot('v060-settings-dark.png');
 }finally{adb('shell','cmd','uimode','night','no');}
 adb('shell','am','force-stop','com.mybody.app');const dir=path.join(root,'.verification/v060-owner-final');fs.mkdirSync(dir,{recursive:true});adb('pull','/data/user/0/com.mybody.app/files/SQLite',dir);
 const now=new DatabaseSync(path.join(dir,'SQLite/mybody.db')),old=new DatabaseSync(path.join(root,'.verification/v060-original-050/SQLite/mybody.db'));
 for(const table of ['mb_readings','mb_photos','mb_metrics'])if(JSON.stringify(now.prepare(`SELECT * FROM ${table} ORDER BY id`).all())!==JSON.stringify(old.prepare(`SELECT * FROM ${table} ORDER BY id`).all()))throw Error('Original data changed: '+table);
 if(JSON.stringify(JSON.parse(now.prepare("SELECT value FROM settings WHERE key='mybody_profile'").get().value))!==JSON.stringify(JSON.parse(old.prepare("SELECT value FROM settings WHERE key='mybody_profile'").get().value)))throw Error('Original profile changed');now.close();old.close();
 const cache='/data/user/0/com.mybody.app/cache',files=adb('shell','ls','-t',cache).split(/\r?\n/),zip=files.find(n=>/^myBody-backup-.*\.zip$/.test(n)),csv=files.find(n=>/^myBody-.*\.csv$/.test(n));if(!zip||!csv)throw Error('Export files absent');
 const zipPath=path.join(root,'.verification/v060-export.zip'),csvPath=path.join(root,'.verification/v060-export.csv');adb('pull',`${cache}/${zip}`,zipPath);adb('pull',`${cache}/${csv}`,csvPath);const archive=unzipSync(fs.readFileSync(zipPath)),manifest=JSON.parse(strFromU8(archive['manifest.json']));if(manifest.version!==2||manifest.snapshot.readings.length!==9||manifest.snapshot.photos.length!==2||manifest.snapshot.photos.some(p=>!archive[p.uri]?.length))throw Error('Backup content incomplete');if(!fs.readFileSync(csvPath,'utf8').includes('"bmi"'))throw Error('Calculated BMI missing from CSV');
 const proofPath=path.join(root,'.verification/android-v060.json'),proof=JSON.parse(fs.readFileSync(proofPath));proof.original050DataPreserved=true;proof.backupVersion=manifest.version;proof.exportedReadings=manifest.snapshot.readings.length;proof.exportedPhotos=manifest.snapshot.photos.length;proof.checks.push('dark native startup and light/dark screenshot review','owner data unchanged after isolated fresh-user check','native ZIP v2 contains all raw readings and both photo files','native CSV contains calculated BMI');fs.writeFileSync(proofPath,JSON.stringify(proof,null,2));console.log('ANDROID_V060_FINALIZED');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
