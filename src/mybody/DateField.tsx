import React,{useContext,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid,DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {Actions,Button,useTheme} from './ui';
import {localDate} from './domain';

export function dateWithDay(current:Date,day:Date):Date {
 const next=new Date(current);next.setFullYear(day.getFullYear(),day.getMonth(),day.getDate());return next;
}
export function DateField({label,value,onChange,dateOnly=false,quick=true,clearable=false}:{label:string;value:string;onChange:(v:string)=>void;dateOnly?:boolean;quick?:boolean;clearable?:boolean}){
 const {s,C,scheme}=useTheme();
 const {busy}=useContext(Actions);const [iosMode,setIosMode]=useState<'date'|'time'|null>(null);
 const parsed=new Date(value?value.replace(' ','T')+(dateOnly?'T00:00:00':':00'):Date.now());
 const current=Number.isFinite(parsed.getTime())?parsed:new Date();
 function commit(next:Date){const safe=next.getTime()>Date.now()?new Date():next;onChange(dateOnly?localDate(safe.toISOString()).slice(0,10):localDate(safe.toISOString()));}
 function selected(mode:'date'|'time',event:DateTimePickerEvent,day?:Date){
  setIosMode(null);if(event.type==='dismissed'||!day)return;
  const next=mode==='date'?dateWithDay(current,day):new Date(current);
  if(mode==='time')next.setHours(day.getHours(),day.getMinutes(),0,0);commit(next);
 }
 function open(mode:'date'|'time'){
  if(Platform.OS!=='android'){setIosMode(mode);return;}
  DateTimePickerAndroid.open({value:current,mode,display:mode==='date'?'calendar':'clock',is24Hour:true,maximumDate:mode==='date'?new Date():undefined,positiveButton:{label:'确定',textColor:C.green},negativeButton:{label:'取消'},onChange:(event,day)=>selected(mode,event,day)});
 }
 function shortcut(offset:number){const day=new Date();day.setDate(day.getDate()+offset);commit(dateWithDay(current,day));}
 return <View style={{gap:10}}><Text style={s.label}>{label}</Text><View style={s.row}>
  <Pressable accessibilityRole="button" accessibilityLabel={`${label}选择日期`} disabled={busy} onPress={()=>open('date')} style={[s.input,{flex:1,minWidth:150,justifyContent:'center',minHeight:56}]}><Text style={{fontFamily:Platform.OS==='android'?'sans-serif':undefined,fontSize:17,lineHeight:26,color:C.ink,includeFontPadding:true}}>{value?value.slice(0,10):'点击选择日期'}</Text></Pressable>
  {!dateOnly&&<Pressable accessibilityRole="button" accessibilityLabel={`${label}选择时间`} disabled={busy} onPress={()=>open('time')} style={[s.input,{minWidth:94,justifyContent:'center',minHeight:56}]}><Text style={{fontFamily:Platform.OS==='android'?'sans-serif':undefined,fontSize:17,lineHeight:26,color:C.ink,includeFontPadding:true}}>{value.slice(11,16)||'选择时间'}</Text></Pressable>}
 </View>{quick&&!dateOnly&&<View style={s.row}><Button title="今天" secondary small onPress={()=>shortcut(0)}/><Button title="昨天" secondary small onPress={()=>shortcut(-1)}/></View>}
 {clearable&&!!value&&<Button title="清除日期" secondary small onPress={()=>onChange('')}/>}
 {iosMode&&<DateTimePicker value={current} mode={iosMode} maximumDate={new Date()} is24Hour locale="zh-CN" onChange={(event,day)=>selected(iosMode,event,day)}/>}
 </View>;
}
