import React,{useContext,useState} from 'react';
import {Alert,Image,Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {CATEGORY_NAMES,CONTEXT_NAMES,Context,POSE_NAMES,Photo,Pose,Reading,delta,latestPair,localDate,parseLocalDate,series,history,isTextReading,readingValue} from './domain';
import {DateField} from './DateField';
import {removeReading} from './repository';
import {capturePhoto,deletePhoto} from './media';
import {useBody} from './store';
import {Chart} from './Chart';
import {RecordForm,contextItems} from './RecordForm';
import {Actions,Button,Card,Chips,Empty,Field,Sheet,useTheme} from './ui';
export type Tab='总览'|'记录'|'趋势'|'照片'|'我的';
export {Overview} from './OverviewScreen';
export function Trends() {
 const {s,C,scheme}=useTheme();
 const {metrics,readings}=useBody();const {run}=useContext(Actions);
 const [metricId,setMetricId]=useState('weight'),[days,setDays]=useState('30'),[unit,setUnit]=useState(''),[context,setContext]=useState<Context>(''),[edit,setEdit]=useState<Reading|null>(null);
 const favorites=metrics.filter(m=>m.favorite&&m.active).sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
 const m=favorites.find(x=>x.id===metricId)??favorites[0];
 if(!m)return <ScrollView contentContainerStyle={s.page}><Empty text="还没有关注指标，请到总览管理关注后查看趋势"/></ScrollView>;
 const isText=m.value_type==='text';
 const all=isText?history(readings,m.id):series(readings,m.id),units=Array.from(new Set(all.map(r=>r.unit))),actualUnit=units.includes(unit)?unit:all[all.length-1]?.unit??m.unit;
 const actualContext=m.id===metricId?context:series(readings,m.id).slice(-1)[0]?.context??'';
 const rows=isText?history(readings,m.id,Number(days)):series(readings,m.id,Number(days),actualUnit,m.id==='glucose'?actualContext:undefined),first=rows[0],last=rows[rows.length-1];
 function erase(r:Reading){Alert.alert('删除这条记录？','删除后对应趋势也会更新。',[{text:'取消',style:'cancel'},{text:'删除',style:'destructive',onPress:()=>void run(()=>removeReading(r.id))}]);}
 return <ScrollView contentContainerStyle={s.page}><Text style={s.description}>选择指标，看见一段时间里的变化。</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}><Chips items={favorites.map(m=>({key:m.id,label:m.name}))} value={m.id} onChange={v=>{setMetricId(v);setUnit('');setContext(v==='glucose'?series(readings,'glucose').slice(-1)[0]?.context??'':'');}}/></ScrollView>
  <Chips items={[{key:'7',label:'7 天'},{key:'30',label:'30 天'},{key:'90',label:'90 天'},{key:'0',label:'全部'}]} value={days} onChange={setDays}/>
  {units.length>1&&<Chips items={units.map(u=>({key:u,label:u}))} value={actualUnit} onChange={setUnit}/>}
  {m.id==='glucose'&&<Chips items={contextItems} value={actualContext} onChange={v=>{setMetricId(m.id);setContext(v as Context);}}/>}
  <Card><View style={s.between}><Text style={s.h2}>{m.name}</Text><Text style={s.caption}>{actualUnit} · {rows.length} 条</Text></View>{isText?<Text style={s.description}>此项为文本记录，按时间查看内容；当前区间记录 {rows.length} 次。</Text>:<Chart key={`${m.id}-${days}-${actualUnit}-${context}`} rows={rows}/>}
   {!isText&&first&&last&&<View style={[s.row,{marginTop:18}]}>{[['区间首次',readingValue(first)],['区间最新',readingValue(last)],['区间变化',`${delta(first.value,last.value)}${first.value2!==null&&last.value2!==null?` / ${delta(first.value2,last.value2)}`:''}`]].map(([label,val])=><View key={label} style={{flex:1}}><Text style={s.caption}>{label}</Text><Text style={s.stat}>{val}</Text></View>)}</View>}
  </Card><Text style={s.h2}>历史记录</Text>{!rows.length&&<Empty text="当前筛选条件下还没有记录"/>}
  {[...rows].reverse().map(r=><Card key={r.id}><View style={s.between}><Text style={[s.h2,{flex:1,lineHeight:25}]}>{readingValue(r)} <Text style={s.caption}>{r.unit}</Text></Text><Text style={s.caption}>{localDate(r.measured_at)}</Text></View>{r.context!==''&&<Text style={s.caption}>{CONTEXT_NAMES[r.context]}</Text>}
   {(r.reference_min!==null||r.reference_max!==null)&&<Text style={s.caption}>报告参考范围：{r.reference_min??'—'} ～ {r.reference_max??'—'} {r.unit}</Text>}{!!r.note&&<Text style={s.description}>{r.note}</Text>}<View style={s.row}><Button title={r.derived_from?'修改来源体重':'编辑记录'} secondary small onPress={()=>setEdit(r.derived_from?readings.find(source=>source.id===r.derived_from)??null:r)}/>{!r.derived_from&&<Button title="删除记录" danger small onPress={()=>erase(r)}/>}</View></Card>)}
  {edit&&<Sheet title="编辑记录" onClose={()=>setEdit(null)}><RecordForm initial={edit} onSaved={()=>setEdit(null)}/></Sheet>}
 </ScrollView>;
}
export function Photos() {
 const {s,C,scheme}=useTheme();
 const {photos}=useBody();const {run}=useContext(Actions);
 const [pose,setPose]=useState<Pose>('front'),[date,setDate]=useState(localDate(new Date().toISOString())),[note,setNote]=useState(''),[selected,setSelected]=useState<string[]>([]);
 const list=photos.filter(p=>p.pose===pose),compare=list.filter(p=>selected.includes(p.id)).sort((a,b)=>a.taken_at.localeCompare(b.taken_at));
 const take=(camera:boolean)=>void run(async()=>{await capturePhoto(camera,pose,parseLocalDate(date),note);});
 function remove(p:Photo){Alert.alert('删除照片？','照片及其日期备注将从本机移除。',[{text:'取消',style:'cancel'},{text:'删除',style:'destructive',onPress:()=>void run(async()=>{await deletePhoto(p);setSelected(ids=>ids.filter(id=>id!==p.id));})}]);}
 return <ScrollView contentContainerStyle={s.page}><Text style={s.description}>用相同角度，留下不同时间的自己。</Text><Chips items={Object.entries(POSE_NAMES).map(([key,label])=>({key,label}))} value={pose} onChange={v=>{setPose(v as Pose);setSelected([]);}}/>
  <Card><DateField label="照片日期" value={date} onChange={setDate}/><Field label="照片备注（选填）" value={note} onChange={setNote}/><View style={s.row}><Button title="从相册选择" secondary onPress={()=>take(false)}/><Button title="拍照" onPress={()=>take(true)}/></View><Text style={s.caption}>照片保存在应用内；卸载前请导出完整备份。</Text></Card>
  {compare.length===2&&<Card><Text style={s.h2}>身体变化 · {POSE_NAMES[pose]}</Text><View style={s.row}>{compare.map(p=><View key={p.id} style={{flex:1}}><Image accessible accessibilityLabel={`${POSE_NAMES[p.pose]}对比照片 ${localDate(p.taken_at)}`} source={{uri:p.uri}} resizeMode="contain" style={s.compareImage}/><Text style={s.caption}>{localDate(p.taken_at).slice(0,10)}</Text><Text style={s.caption}>{p.note}</Text></View>)}</View></Card>}
  <View style={s.between}><Text style={s.h2}>照片时间线</Text><Text style={s.caption}>选择两张照片进行比较</Text></View>{!list.length&&<Empty text="还没有这个角度的照片，先记录一张吧"/>}
  <View style={s.photoGrid}>{list.map(p=><View key={p.id} style={s.photoCard}><Pressable accessibilityRole="button" accessibilityLabel={`选择照片 ${localDate(p.taken_at)}`} onPress={()=>setSelected(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids.slice(-1),p.id])} style={[s.photoFrame,selected.includes(p.id)&&{borderColor:C.green,borderWidth:3}]}><Image source={{uri:p.uri}} style={s.photoImage} resizeMode="cover"/>{selected.includes(p.id)&&<View style={s.photoCheck}><Ionicons name="checkmark" size={18} color={C.onAccent}/></View>}</Pressable><Text style={s.caption}>{localDate(p.taken_at)}</Text>{!!p.note&&<Text style={s.caption}>{p.note}</Text>}<Button title="删除照片" danger small onPress={()=>remove(p)}/></View>)}</View>
 </ScrollView>;
}
