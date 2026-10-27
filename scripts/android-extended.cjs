const fs=require('node:fs'),path=require('node:path');
const {adb,pause,nodes,find,tap,waitFor,assertText,screenshot}=require('./android-smoke.cjs');
const root=path.resolve(__dirname,'..');
async function scrollTo(label){for(let i=0;i<10;i++){const node=find(label);if(node&&node.bounds!=='[0,0][0,0]')return;const scroll=nodes().filter(n=>n.scrollable==='true').map(n=>n.bounds.match(/\d+/g).map(Number)).sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];if(!scroll)break;const x=(scroll[0]+scroll[2])/2|0,h=scroll[3]-scroll[1];adb('shell','input','swipe',String(x),String(scroll[1]+h*.8|0),String(x),String(scroll[1]+h*.25|0),'250');await pause(100);}throw new Error('Cannot scroll to '+label);}
async function field(label,value){
 let input;
 for(let i=0;i<12;i++){
  const all=nodes();input=all.find(n=>n.class==='android.widget.EditText'&&n['content-desc']===label&&(()=>{const b=n.bounds.match(/\d+/g).map(Number);return b[2]>b[0]&&b[3]-b[1]>=80;})());
  if(input)break;
  const b=all.filter(n=>n.scrollable==='true').map(n=>n.bounds.match(/\d+/g).map(Number)).sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];if(!b)break;
  const x=(b[0]+b[2])/2|0,h=b[3]-b[1];adb('shell','input','swipe',String(x),String(b[1]+h*.8|0),String(x),String(b[1]+h*.35|0),'250');await pause(100);
 }
 if(!input)throw new Error('Editable field not visible: '+label);
 tapNode(input);adb('shell','input','keyevent','123',...Array(35).fill('67'));adb('shell','input','text',value.replace(/ /g,'%s'));await pause(200);
 if(!nodes().some(n=>n.class==='android.widget.EditText'&&n['content-desc']===label&&n.text===value))throw new Error('Field was not entered: '+label);
 if(/(?:mInputShown|mIsInputViewShown|isInputViewShown)=true/.test(adb('shell','dumpsys','input_method')))adb('shell','input','keyevent','4');
 await pause(450);
}
async function save(){tap('保存本次记录');await waitFor('已保存');tap('好的');}
function tapNode(node){const b=node.bounds.match(/\d+/g).map(Number);adb('shell','input','tap',String((b[0]+b[2])/2|0),String((b[1]+b[3])/2|0));}
async function photo(){
 tap('从相册选择');await pause(800);
 const all=nodes();const thumbnail=all.find(n=>/icon_thumbnail|image_thumbnail/.test(n['resource-id']||''))??all.find(n=>n.clickable==='true'&&/Photo taken|Photo,|照片|图片/.test(n['content-desc']||''));
 if(!thumbnail){fs.writeFileSync(path.join(root,'.verification/photo-picker-nodes.json'),JSON.stringify(all,null,2));throw new Error('Photo picker thumbnail selector needs adjustment');}
 tapNode(thumbnail);await pause(1000);await waitFor('照片时间线');
}
async function main(){
 if(!adb('emu','avd','name').includes('mybody_api35'))throw new Error('Dedicated emulator required');
 tap('总览');tap('记录');await field('测量时间','2026-10-20 08:00');await field('体重数值','72.6');await save();tap('总览');assertText('70.5');assertText('-2.1');screenshot('overview-changes.png');
 tap('记录');tap('健康指标');await field('收缩压','120');await field('舒张压','80');await field('血糖数值','5.2');await scrollTo('空腹');tap('空腹');await save();
 adb('push',path.join(root,'assets/icon.png'),'/sdcard/Pictures/mybody-test-1.png');adb('push',path.join(root,'assets/icon.png'),'/sdcard/Pictures/mybody-test-2.png');
 for(const name of ['mybody-test-1.png','mybody-test-2.png'])adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file:///sdcard/Pictures/'+name);
 tap('照片');await field('照片备注（选填）','demo-front-a');await photo();await field('照片日期','2026-10-20 08:00');await field('照片备注（选填）','demo-front-b');await photo();
 const choices=nodes().filter(n=>(n['content-desc']||'').startsWith('选择照片 '));if(choices.length<2)throw new Error('Expected two private photo records');tapNode(choices[0]);tapNode(choices[1]);await waitFor('身体变化');screenshot('photos-compare.png');
 tap('我的');await scrollTo('导出完整备份 ZIP');tap('导出完整备份 ZIP');await pause(1000);adb('shell','input','keyevent','4');await pause(500);
 adb('root');adb('wait-for-device');
 const cache='/data/user/0/com.mybody.app/cache';const name=adb('shell','ls','-t',cache).split(/\r?\n/).find(n=>/^myBody-backup-.*\.zip$/.test(n));if(!name)throw new Error('Native backup ZIP was not created');
 const target=path.join(root,'.verification/device-backup.zip');adb('pull',cache+'/'+name,target);
 const {unzipSync,strFromU8}=require('fflate');const payload=unzipSync(new Uint8Array(fs.readFileSync(target)));const manifest=JSON.parse(strFromU8(payload['manifest.json']));
 if(manifest.snapshot.photos.length<2||!manifest.snapshot.readings.some(r=>r.metric_id==='bp'&&r.value===120&&r.value2===80)||!manifest.snapshot.readings.some(r=>r.metric_id==='glucose'&&r.context==='fasting'))throw new Error('Native backup does not contain expected measurements/photos');
 fs.writeFileSync(path.join(root,'.verification/android-extended.json'),JSON.stringify({passed:true,checks:['backfill preserves latest','actual delta','paired blood pressure','fasting glucose','system photo picker','private photo copies','two-photo comparison','native ZIP export with photos'],readings:manifest.snapshot.readings.length,photos:manifest.snapshot.photos.length,testedAt:new Date().toISOString()},null,2));
 console.log('ANDROID_EXTENDED_PASSED');
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={scrollTo,field,save,tapNode,photo};
