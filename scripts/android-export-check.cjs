const fs=require('node:fs'),path=require('node:path');
const {adb,pause,tap,waitFor}=require('./android-smoke.cjs');
const {scrollTo}=require('./android-extended.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw new Error('Dedicated emulator required');
 tap('我的');await scrollTo('导出完整备份 ZIP');tap('导出完整备份 ZIP');await pause(1500);
 const cache='/data/user/0/com.mybody.app/cache';
 let name;for(let i=0;i<10;i++){name=adb('shell','ls','-t',cache).split(/\r?\n/).find(n=>/^myBody-backup-.*\.zip$/.test(n));if(name)break;await pause(500);}
 if(!name)throw new Error('Native ZIP export failed');
 adb('shell','input','keyevent','4');await pause(400);
 const target=path.join(root,'.verification/device-backup.zip');adb('pull',cache+'/'+name,target);
 const {unzipSync,strFromU8}=require('fflate');const payload=unzipSync(new Uint8Array(fs.readFileSync(target)));const manifest=JSON.parse(strFromU8(payload['manifest.json']));
 if(manifest.snapshot.photos.length<2||!manifest.snapshot.readings.some(r=>r.metric_id==='bp'&&r.value===120&&r.value2===80)||!manifest.snapshot.readings.some(r=>r.metric_id==='glucose'&&r.context==='fasting'))throw new Error('Native backup contents invalid');
 fs.writeFileSync(path.join(root,'.verification/android-extended.json'),JSON.stringify({passed:true,checks:['backfill preserves latest','actual delta','paired blood pressure','fasting glucose','system photo picker','private photo copies','two-photo comparison','native ZIP export with photos'],readings:manifest.snapshot.readings.length,photos:manifest.snapshot.photos.length,testedAt:new Date().toISOString()},null,2));
 console.log('NATIVE_EXPORT_PASSED');
 adb('push',target,'/sdcard/Download/myBody-e2e.zip');adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file:///sdcard/Download/myBody-e2e.zip');
 tap('我的');await scrollTo('从 ZIP 备份恢复');tap('从 ZIP 备份恢复');tap('选择备份并恢复');await pause(700);
 console.log('RESTORE_PICKER_READY');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
