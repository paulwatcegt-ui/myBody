import React,{useContext,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {CATEGORY_NAMES,Category,Metric} from './domain';
import {moveFavorite,saveMetric} from './repository';
import {useBody} from './store';
import {Actions,Button,Card,Chips,Empty,Field,Sheet,useTheme} from './ui';
import {MetricEditor} from './MetricEditor';

export function MetricManager({onClose}:{onClose:()=>void}){
 const {s,C,scheme}=useTheme();
 const {metrics}=useBody(),{run}=useContext(Actions);
 const [editing,setEditing]=useState<Metric|'new'|null>(null),[category,setCategory]=useState('all'),[query,setQuery]=useState(''),[scope,setScope]=useState('all');
 const categories=Object.entries(CATEGORY_NAMES) as [Category,string][];
 const matches=metrics.filter(m=>(category==='all'||m.category===category)&&(scope==='all'||!!m.favorite)&&`${m.name} ${m.unit}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <Sheet title="指标与关注管理" onClose={onClose}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <Button title="添加自定义指标" onPress={()=>setEditing('new')}/>
  <Field label="搜索指标" value={query} onChange={setQuery} placeholder="输入名称或单位"/>
  <Chips items={[{key:'all',label:'全部分类'},...categories.map(([key,label])=>({key,label}))]} value={category} onChange={setCategory}/>
  <Chips items={[{key:'all',label:'全部指标'},{key:'favorites',label:'仅看关注'}]} value={scope} onChange={setScope}/>
  <Text style={s.caption}>找到 {matches.length} 项。上移／下移调整总览中的全部关注顺序，停用后仍保留历史。</Text>
  {!matches.length&&<Empty text="没有匹配的指标，试试其他分类或关键词"/>}
  {categories.map(([key,label])=>{const group=matches.filter(m=>m.category===key).sort((a,b)=>b.favorite-a.favorite||a.sort_order-b.sort_order);return group.length?<View key={key} style={{gap:14}}>
   <Text style={s.h2}>{label} · {group.length} 项</Text>
   {group.map(m=><Card key={m.id}><View style={s.between}><Text style={[s.h2,{flex:1}]}>{m.name}</Text><Text style={s.caption}>{m.unit}</Text></View>
    <Text style={s.caption}>{m.active?'已启用':'已停用'}{m.id==='bmi'?' · 自动计算':m.value_type==='text'?' · 文本':''}{m.frequency&&m.frequency!=='随时'?` · ${m.frequency}`:''}</Text>
    <View style={s.row}><Button title={`${m.favorite?'取消关注':'关注'} ${m.name}`} secondary small onPress={()=>void run(()=>saveMetric({...m,favorite:m.favorite?0:1}))}/><Button title={`编辑 ${m.name}`} secondary small onPress={()=>setEditing(m)}/><Button title={`${m.active?'停用':'启用'} ${m.name}`} secondary small onPress={()=>void run(()=>saveMetric({...m,active:m.active?0:1}))}/></View>
    {!!m.favorite&&!!m.active&&<View style={s.row}><Button title={`${m.name}上移`} secondary small onPress={()=>void run(()=>moveFavorite(m.id,-1))}/><Button title={`${m.name}下移`} secondary small onPress={()=>void run(()=>moveFavorite(m.id,1))}/></View>}
   </Card>)}
  </View>:null;})}
 </ScrollView>{editing&&<MetricEditor metric={editing==='new'?undefined:editing} onClose={()=>setEditing(null)}/>}</Sheet>;
}
