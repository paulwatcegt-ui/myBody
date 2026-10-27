import {calculateBMI,weightKg,heightCm} from './calculations';
import React,{useContext,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Category,Context,Metric,Reading,CATEGORY_NAMES,CATEGORY_DESCRIPTIONS,CONTEXT_NAMES,localDate,parseLocalDate,numberInput,uid,history} from './domain';
import {saveBatch} from './repository';
import {useBody} from './store';
import {Actions,Button,Card,Chips,Empty,Field,useTheme} from './ui';
import {DateField} from './DateField';
export const contextItems=Object.entries(CONTEXT_NAMES).map(([key,label])=>({key,label}));
export const categoryItems=Object.entries(CATEGORY_NAMES).map(([key,label])=>({key,label}));
const icons:Record<Category,keyof typeof Ionicons.glyphMap>={body:'person-outline',health:'heart-outline',fitness:'barbell-outline',lifestyle:'moon-outline',lab:'flask-outline',custom:'options-outline'};
interface Draft {value:string;value2:string;unit:string;context:Context;min:string;max:string}
export function RecordForm({initial,onSaved,onPhotos,onManage,metricId}:{metricId?:string;initial?:Reading;onSaved?:()=>void;onPhotos?:()=>void;onManage?:()=>void}){
 const {s,C,scheme}=useTheme();
 const {metrics,readings,profile}=useBody();const {run}=useContext(Actions);
 const [category,setCategory]=useState<Category|null>(initial||metricId?metrics.find(m=>m.id===(initial?.metric_id??metricId))?.category??'body':null);
 const [date,setDate]=useState(localDate(initial?.measured_at??new Date().toISOString()));
 const [note,setNote]=useState(initial?.note??'');const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const draft=(m:Metric):Draft=>drafts[m.id]??{value:initial?.metric_id===m.id?initial.text_value??String(initial.value):'',value2:initial?.metric_id===m.id&&initial.value2!=null?String(initial.value2):'',unit:initial?.metric_id===m.id?initial.unit:m.unit,context:initial?.metric_id===m.id?initial.context:'',min:String(initial?.metric_id===m.id?initial.reference_min??'':m.reference_min??''),max:String(initial?.metric_id===m.id?initial.reference_max??'':m.reference_max??'')};
 const change=(m:Metric,key:keyof Draft,value:string)=>setDrafts(prev=>({...prev,[m.id]:{...(prev[m.id]??draft(m)),[key]:value}}));
 const targets=metricId&&['weight','height','bmi'].includes(metricId)?['weight','height']:[metricId];
 const active=metrics.filter(m=>initial?m.id===initial.metric_id:metricId?targets.includes(m.id):!!m.active&&m.category===category&&m.id!=='bmi');
 const filled=metrics.filter(m=>{const d=draft(m);return !!d.value.trim()||!!d.value2.trim();}).length;
 function previewBMI(){
  try{
   const time=Date.parse(parseLocalDate(date)),w=metrics.find(m=>m.id==='weight'),h=metrics.find(m=>m.id==='height');
   const previousWeight=history(readings,'weight',0,time).slice(-1)[0],previousHeight=history(readings,'height',0,time).slice(-1)[0];
   const dw=w?draft(w):null,dh=h?draft(h):null;
   const kg=dw?.value.trim()?weightKg(numberInput(dw.value),dw.unit):previousWeight?weightKg(previousWeight.value,previousWeight.unit):null;
   const cm=dh?.value.trim()?heightCm(numberInput(dh.value),dh.unit):previousHeight?heightCm(previousHeight.value,previousHeight.unit):heightCm(Number(profile.height),'cm');
   return kg!==null&&cm!==null?calculateBMI(kg,cm):null;
  }catch{return null;}
 }
 const bmiPreview=previewBMI();
 async function save(){
  const ok=await run(async()=>{
   const measured_at=parseLocalDate(date);if(Date.parse(measured_at)>Date.now())throw new Error('记录时间不能晚于当前时间');const rows:Reading[]=[];
   for(const m of metrics){
    if(initial&&m.id!==initial.metric_id||!initial&&m.id==='bmi'||metricId&&!targets.includes(m.id))continue;const d=draft(m);if(!d.value.trim()&&!d.value2.trim())continue;
    const isText=m.value_type==='text';
    rows.push({id:initial?.id??uid(),metric_id:m.id,measured_at,value:isText?0:numberInput(d.value,m.name),text_value:isText?d.value.trim():null,value2:!isText&&m.id==='bp'?numberInput(d.value2,'舒张压'):null,unit:isText?'':d.unit.trim(),context:m.id==='glucose'?d.context:'',note,reference_min:!isText&&d.min.trim()?numberInput(d.min,'参考下限'):null,reference_max:!isText&&d.max.trim()?numberInput(d.max,'参考上限'):null});
   }
   await saveBatch(rows);
  });
  if(ok){setDrafts({});setNote('');setDate(localDate(new Date().toISOString()));if(onSaved)onSaved();else Alert.alert('已保存','可以在总览和趋势中查看这次记录。',[{text:'好的'}]);}
 }
 return <View style={{flex:1}}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  {!category&&!initial?<>
   <Text style={s.description}>选择分类开始记录；已经填写的内容会在切换分类时保留。</Text>
   {categoryItems.map(({key,label})=>{const id=key as Category;return <Pressable key={key} accessibilityRole="button" accessibilityLabel={label} onPress={()=>setCategory(id)} style={[s.card,{flexDirection:'row',alignItems:'center',paddingVertical:22,gap:16}]}>
    <View style={{backgroundColor:C.pale,padding:12,borderRadius:14}}><Ionicons name={icons[id]} size={24} color={C.green}/></View>
    <View style={{flex:1,gap:6}}><Text style={s.h2}>{label}</Text><Text style={s.caption}>{CATEGORY_DESCRIPTIONS[id]}</Text></View><Ionicons name="chevron-forward" size={18} color={C.muted}/>
   </Pressable>;})}
  </>:<>
   {!initial&&!metricId&&<View style={s.between}><Button title="全部分类" secondary small onPress={()=>setCategory(null)}/><Text style={s.h2}>{category?CATEGORY_NAMES[category]:''}</Text></View>}
   <Text style={s.description}>{category==='lab'?'按检查日期填写检测结果、单位与报告参考范围。':'按实际发生时间记录，留空项目不会保存。'}</Text>
   <Card><DateField label={category==='lab'?'检查时间':'测量时间'} value={date} onChange={setDate}/></Card>
   {category==='body'&&initial?.metric_id!=='bmi'&&<Card><Text style={s.h2}>BMI · 自动计算</Text><Text style={s.stat}>{bmiPreview??'—'}</Text><Text style={s.caption}>保存体重后自动更新 BMI 和趋势，无需填写。优先使用测量时间当时的身高记录，没有时使用档案身高。</Text>{onPhotos&&!metricId&&<Button title="进度照片" secondary onPress={onPhotos}/>}</Card>}
   {active.map(m=>{const d=draft(m);return <Card key={m.id}><View style={s.between}><Text style={s.h2}>{m.name}</Text>{m.frequency&&m.frequency!=='随时'&&<Text style={s.badge}>{m.frequency}</Text>}</View>
    {m.value_type==='text'?<Field label={`${m.name}内容`} value={d.value} onChange={v=>change(m,'value',v)} multiline placeholder="填写内容、感受或说明"/>:<>
     <View style={s.row}><Field label={m.id==='bp'?'收缩压':`${m.name}数值`} numeric value={d.value} onChange={v=>change(m,'value',v)} placeholder="未填写"/>{m.id==='bp'&&<Field label="舒张压" numeric value={d.value2} onChange={v=>change(m,'value2',v)} placeholder="未填写"/>}<Field label={`${m.name}单位`} value={d.unit} onChange={v=>change(m,'unit',v)}/></View>
     {m.id==='glucose'&&<Chips items={contextItems} value={d.context} onChange={v=>change(m,'context',v)}/>}
     {(m.category==='lab'||m.reference_min!==null||m.reference_max!==null||initial?.reference_min!=null||initial?.reference_max!=null)&&<View style={s.row}><Field label={`${m.name}参考下限（选填）`} numeric value={d.min} onChange={v=>change(m,'min',v)}/><Field label={`${m.name}参考上限（选填）`} numeric value={d.max} onChange={v=>change(m,'max',v)}/></View>}
    </>}
   </Card>;})}
   {!active.length&&<Empty text="此分类暂无指标，可添加自己想跟踪的项目"/>}
   {category==='custom'&&onManage&&<Button title="添加／管理自定义指标" secondary onPress={onManage}/>}
   <Card><Field label="备注（选填）" value={note} onChange={setNote} multiline placeholder="例如：训练情况，报告说明，以及一切想记录下来的。。。。。"/></Card>
  </>}
 </ScrollView>{(category||initial||filled>0)&&<View style={{padding:12,backgroundColor:C.bg}}>{filled>0&&!initial&&<Text style={[s.caption,{textAlign:'center',marginBottom:4}]}>已填写 {filled} 项</Text>}<Button title={initial?'保存修改':'保存本次记录'} onPress={()=>void save()}/></View>}</View>;
}
