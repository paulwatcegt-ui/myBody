import {Alert} from './dialogs';
import React,{useContext,useRef,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {Profile,SEX_NAMES,latestPair,readingValue} from './domain';
import {ageInYears,calculateBMR,weightKg,heightCm} from './calculations';
import {saveProfile} from './repository';
import {useBody} from './store';
import {Actions,Button,Card,Chips,Field,Sheet,useTheme} from './ui';
import {DateField} from './DateField';
const draftOf=(p:Profile)=>({name:p.name,height:p.height,birthday:p.birthday,sex:p.sex??'unspecified',target_weight:p.target_weight??''});
export function ProfileEditor({onClose}:{onClose:()=>void}){
 const {profile}=useBody(),{s}=useTheme(),{run}=useContext(Actions);
 const initial=useRef(draftOf(profile)),[draft,setDraft]=useState(initial.current);
 const change=(key:keyof typeof draft,value:string)=>setDraft(prev=>({...prev,[key]:value}));
 function close(){if(JSON.stringify(draft)===JSON.stringify(initial.current)){onClose();return;}Alert.alert('放弃未保存的修改？','这次修改还没有保存。',[{text:'继续编辑',style:'cancel'},{text:'放弃修改',style:'destructive',onPress:onClose}]);}
 async function save(){const ok=await run(()=>saveProfile({...profile,...draft,name:draft.name.trim(),height:draft.height.trim(),birthday:draft.birthday.trim(),target_weight:draft.target_weight.trim()}));if(ok)onClose();}
 const age=ageInYears(draft.birthday);
 return <Sheet title="编辑档案" onClose={close}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Card>
  <Field label="称呼（选填）" value={draft.name} onChange={v=>change('name',v)}/><Field label="身高 cm（选填）" numeric value={draft.height} onChange={v=>change('height',v)}/>
  <Text style={s.label}>性别（选填）</Text><Chips items={Object.entries(SEX_NAMES).map(([key,label])=>({key,label}))} value={draft.sex} onChange={v=>change('sex',v)}/>
  <DateField label="生日（选填）" value={draft.birthday} onChange={v=>change('birthday',v)} dateOnly quick={false} clearable/>
  <Text style={s.description}>年龄：{age===null?'填写生日后自动计算':`${age} 岁`}</Text>
  <Field label="目标体重 kg（选填）" numeric value={draft.target_weight} onChange={v=>change('target_weight',v)}/>
 </Card><Button title="保存个人资料" onPress={()=>void save()}/></ScrollView></Sheet>;
}
export function ProfileScreen({manage}:{manage:()=>void}){
 const {s,C}=useTheme(),{profile,readings}=useBody(),[editing,setEditing]=useState(false);
 const age=ageInYears(profile.birthday),weight=latestPair(readings,'weight').slice(-1)[0],bmi=latestPair(readings,'bmi').slice(-1)[0];
 const height=latestPair(readings,'height').slice(-1)[0],kg=weight?weightKg(weight.value,weight.unit):null,cm=height?heightCm(height.value,height.unit):heightCm(Number(profile.height),'cm');
 const bmr=kg!==null&&cm!==null?calculateBMR(kg,cm,profile):null;
 const populated=!!(profile.name||profile.height||profile.birthday||profile.target_weight||profile.sex&&profile.sex!=='unspecified');
 const rows=[['性别',profile.sex&&profile.sex!=='unspecified'?SEX_NAMES[profile.sex]:'未填写'],['年龄',age===null?'未填写':`${age} 岁`],['身高',profile.height?`${profile.height} cm`:'未填写'],['目标体重',profile.target_weight?`${profile.target_weight} kg`:'未填写'],['最新体重',weight?`${readingValue(weight)} ${weight.unit}`:'未填写'],['BMI',bmi?readingValue(bmi):'未填写']];
 return <><ScrollView contentContainerStyle={s.page}>
  <Card><View style={s.between}><View style={{flex:1,gap:4}}><Text style={s.h2}>{profile.name||'我的档案'}</Text><Text style={s.caption}>{populated?'你的身体档案':'从一份简单的档案开始'}</Text></View><Button title={populated?'编辑档案':'完善档案'} secondary small onPress={()=>setEditing(true)}/></View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:16,marginTop:8}}>{rows.map(([label,value])=><View key={label} style={{width:'46%',gap:5}}><Text style={s.caption}>{label}</Text><Text style={{fontSize:16,lineHeight:23,color:C.ink,fontWeight:'500'}}>{value}</Text></View>)}</View>
   <Text style={s.label}>基础代谢（估算）</Text><Text style={s.stat}>{bmr===null?'待完善资料':`${bmr} kcal/天`}</Text>
   <Text style={s.caption}>年龄、BMI 与基础代谢自动计算。基础代谢采用 Mifflin–St Jeor 公式，需要身高、体重、生日及男女性别，仅用于成人估算。</Text>
  </Card>
  <Card><Text style={s.h2}>我的指标</Text><Text style={s.description}>选择关注指标，调整顺序，或添加自己的记录项目。</Text><Button title="管理指标与关注" secondary onPress={manage}/></Card>
 </ScrollView>{editing&&<ProfileEditor onClose={()=>setEditing(false)}/>}</>;
}
