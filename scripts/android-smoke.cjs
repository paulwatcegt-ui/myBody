const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.verification'),adbPath=path.join(root,'.tooling/android-sdk/platform-tools/adb.exe');
const device='emulator-5554';
const adb=(...args)=>execFileSync(adbPath,['-s',device,...args],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function nodes(){
 adb('shell','uiautomator','dump','/sdcard/mybody-window.xml');
 const xml=adb('exec-out','cat','/sdcard/mybody-window.xml');fs.writeFileSync(path.join(out,'window.xml'),xml);
 return [...xml.matchAll(/<node\b[^>]*>/g)].map(match=>Object.fromEntries([...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])));
}
function find(label){const all=nodes().filter(n=>{const b=n.bounds?.match(/\d+/g)?.map(Number);return b&&b[2]>b[0]&&b[3]>b[1];});return all.find(n=>n['content-desc']===label)??all.find(n=>n.text===label);}
function tap(label){const node=find(label);if(!node)throw new Error('Missing UI element: '+label);const b=node.bounds.match(/\d+/g).map(Number);adb('shell','input','tap',String((b[0]+b[2])/2|0),String((b[1]+b[3])/2|0));}
function assertText(text){if(!nodes().some(n=>(n.text||'').includes(text)||(n['content-desc']||'').includes(text)))throw new Error('Missing expected text: '+text);}
async function waitFor(text){const end=Date.now()+30000;while(Date.now()<end){try{assertText(text);return;}catch{await pause(500);}}throw new Error('Timed out waiting for: '+text);}
function screenshot(name){const image=execFileSync(adbPath,['-s',device,'exec-out','screencap','-p'],{maxBuffer:10*1024*1024,timeout:30000});fs.writeFileSync(path.join(out,name),image);}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const avd=adb('emu','avd','name');if(!avd.includes('mybody_api35'))throw new Error('Only the dedicated mybody_api35 test device may be modified');
 adb('shell','wm','size','1080x2340');adb('shell','wm','density','420');
 adb('install','-r',path.join(root,'delivery/myBody-0.1.0-internal.apk'));
 adb('shell','pm','clear','com.mybody.app');adb('shell','am','start','-n','com.mybody.app/.MainActivity');await pause(2500);
 await waitFor('我的关注');screenshot('overview-empty.png');
 tap('记录');await pause(300);tap('体重数值');adb('shell','input','text','70.5');await pause(300);if(/(?:mInputShown|mIsInputViewShown|isInputViewShown)=true/.test(adb('shell','dumpsys','input_method')))adb('shell','input','keyevent','4');tap('保存本次记录');await waitFor('已保存');tap('好的');
 tap('总览');await pause(300);assertText('70.5');screenshot('overview-record.png');
 adb('shell','am','force-stop','com.mybody.app');adb('shell','am','start','-n','com.mybody.app/.MainActivity');await pause(1200);assertText('70.5');
 tap('趋势');await pause(300);assertText('历史记录');assertText('70.5');screenshot('trends-record.png');
 tap('照片');await pause(300);assertText('照片时间线');screenshot('photos-empty.png');
 tap('我的');await pause(300);assertText('我的档案');screenshot('profile.png');
 adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');
 adb('shell','am','force-stop','com.mybody.app');adb('shell','am','start','-n','com.mybody.app/.MainActivity');await pause(1200);assertText('70.5');
 fs.writeFileSync(path.join(out,'android-smoke.json'),JSON.stringify({passed:true,device:avd.trim(),checks:['installation','fresh SQLite initialization','five Chinese screens','weight entry','latest measurement','restart persistence','trend history','offline restart'],testedAt:new Date().toISOString()},null,2));
 console.log('ANDROID_SMOKE_PASSED');
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={adb,pause,nodes,find,tap,waitFor,assertText,screenshot};
