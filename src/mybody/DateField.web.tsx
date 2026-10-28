import React from 'react';
import {Text,View} from 'react-native';
import {Button,useTheme} from './ui';
import {localDate} from './domain';
export function DateField({label,value,onChange,dateOnly=false,quick=true,clearable=false}:{label:string;value:string;onChange:(v:string)=>void;dateOnly?:boolean;quick?:boolean;clearable?:boolean}){
 const {s,C}=useTheme();const max=localDate(new Date().toISOString());
 return <View style={{gap:10}}><Text style={s.label}>{label}</Text><input aria-label={label} type={dateOnly?'date':'datetime-local'} value={value.replace(' ','T')} max={dateOnly?max.slice(0,10):max.replace(' ','T')} onChange={e=>{const v=e.target.value.replace('T',' ');if(v&&v<=(dateOnly?max.slice(0,10):max))onChange(v);}} style={{boxSizing:'border-box',width:'100%',minHeight:52,fontSize:16,padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.ink}}/>{quick&&!dateOnly&&<View style={s.row}>{['今天','昨天'].map((t,i)=><Button key={t} title={t} secondary small onPress={()=>{const d=new Date();d.setDate(d.getDate()-i);onChange(localDate(d.toISOString()).slice(0,10)+' '+(value.slice(11,16)||max.slice(11,16)));}}/>)}</View>}{clearable&&!!value&&<Button title="清除日期" secondary small onPress={()=>onChange('')}/>}</View>;
}
