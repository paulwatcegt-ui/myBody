import {Alert} from './dialogs';
import React,{useContext,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useBody} from './store';
import {Actions,Button,Card,Sheet,useTheme} from './ui';
import {AppearanceSettings} from './AppearanceSettings';
import {exportBackup,exportCsv,exportNotices,importBackup} from './media';
import {LICENSE_TEXT} from './licenseText';
type Page='root'|'appearance'|'data'|'about'|'license';
const TITLES:Record<Page,string>={root:'设置',appearance:'外观',data:'数据与备份',about:'关于 myBody',license:'开源许可与来源'};
export function SettingsScreen({onClose}:{onClose:()=>void}){
 const {s,C}=useTheme(),{run}=useContext(Actions),{readings,photos}=useBody(),[page,setPage]=useState<Page>('root');
 const back=()=>page==='root'?onClose():setPage(page==='license'?'about':'root');
 function restore(){Alert.alert('从备份恢复？','将用所选备份整体替换当前的指标、记录、资料和照片。建议先导出当前完整备份。',[{text:'取消',style:'cancel'},{text:'选择备份并恢复',onPress:()=>void run(async()=>{if(await importBackup())Alert.alert('已恢复','记录和照片已从备份恢复。',[{text:'好的'}]);})}]);}
 const entries:{page:Page;icon:keyof typeof Ionicons.glyphMap;hint:string}[]=[{page:'appearance',icon:'contrast-outline',hint:'浅色、深色与跟随系统'},{page:'data',icon:'archive-outline',hint:'备份、恢复与 CSV 导出'},{page:'about',icon:'information-circle-outline',hint:'版本、开源许可与来源'}];
 return <Sheet title={TITLES[page]} closeLabel="返回" onClose={back}><ScrollView contentContainerStyle={s.page}>
  {page==='root'&&<Card>{entries.map((entry,index)=><Pressable key={entry.page} accessibilityRole="button" accessibilityLabel={TITLES[entry.page]} onPress={()=>setPage(entry.page)} style={{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14,borderTopWidth:index?0.5:0,borderColor:C.border}}><Ionicons name={entry.icon} size={23} color={C.green}/><View style={{flex:1,gap:4}}><Text style={s.h2}>{TITLES[entry.page]}</Text><Text style={s.caption}>{entry.hint}</Text></View><Ionicons name="chevron-forward" size={18} color={C.muted}/></Pressable>)}</Card>}
  {page==='appearance'&&<AppearanceSettings/>}
  {page==='data'&&<Card><Text style={s.h2}>本机数据</Text><Text style={s.description}>{readings.filter(r=>!r.derived_from).length} 条原始记录 · {photos.length} 张照片</Text><Button title="导出完整备份 ZIP" onPress={()=>void run(exportBackup)}/><Button title="从 ZIP 备份恢复" secondary onPress={restore}/><Button title="导出指标记录 CSV" secondary onPress={()=>void run(exportCsv)}/><Text style={s.caption}>完整备份包含照片，当前支持总大小 64 MB。CSV 仅含指标记录。文件未加密，请保存到自己信任的位置。网页版更换域名前请先导出备份；Safari 与主屏幕应用不能假定共享数据，建议添加主屏幕后再正式记录。</Text></Card>}
  {page==='about'&&<Card><Text style={s.h2}>myBody</Text><Text style={s.description}>0.6.0 · 离线身体变化记录</Text><Text style={s.caption}>数据保存在本机。清除网站数据或删除应用可能删除记录，请定期备份。参考范围来自你的填写，变化描述仅表示记录之间的差异。</Text><Button title="开源许可与来源" secondary onPress={()=>setPage('license')}/><Button title="导出第三方软件声明" secondary onPress={()=>void run(exportNotices)}/></Card>}
  {page==='license'&&<Text selectable style={s.description}>{LICENSE_TEXT}</Text>}
 </ScrollView></Sheet>;
}
