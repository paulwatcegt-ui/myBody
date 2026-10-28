import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {Button,useTheme} from './ui';
export function PwaRuntime(){
 const {s}=useTheme(),[status,setStatus]=useState('正在准备离线资源…'),[waiting,setWaiting]=useState<ServiceWorker|null>(null);
 useEffect(()=>{if(!('serviceWorker'in navigator)){setStatus('当前浏览器不支持离线启动');return;}
 let active=true;let registration:ServiceWorkerRegistration|undefined;
 const inspect=()=>{if(!active||!registration)return;if(registration.waiting)setWaiting(registration.waiting);if(navigator.serviceWorker.controller)setStatus('可离线使用 · 请定期导出备份');};
 navigator.serviceWorker.register('./sw.js').then(r=>{registration=r;inspect();r.addEventListener('updatefound',()=>r.installing?.addEventListener('statechange',inspect));return navigator.serviceWorker.ready;}).then(()=>{if(active)setStatus('可离线使用 · 请定期导出备份');inspect();}).catch(()=>{if(active)setStatus('离线资源准备失败，请联网重新打开');});
 const changed=()=>{if((window as any).__mybodyUpdating)window.location.reload();};navigator.serviceWorker.addEventListener('controllerchange',changed);
 return()=>{active=false;navigator.serviceWorker.removeEventListener('controllerchange',changed);};
 },[]);
 return <View style={{paddingHorizontal:16,paddingVertical:5}}><Text style={s.caption}>{status}</Text>{waiting&&<Button title="新版本已准备，更新应用" secondary small onPress={()=>{if(window.confirm('请先保存正在编辑的内容。现在重新加载并更新应用？本机记录和照片会保留。')){(window as any).__mybodyUpdating=true;waiting.postMessage('ACTIVATE');}}}/>}</View>;
}
