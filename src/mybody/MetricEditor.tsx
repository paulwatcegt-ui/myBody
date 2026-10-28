import React,{useContext,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {Category,Metric,ValueType,FREQUENCIES,numberInput,uid} from './domain';
import {saveMetric} from './repository';
import {useBody} from './store';
import {Actions,Button,Card,Chips,Field,Sheet,useTheme} from './ui';
import {categoryItems} from './RecordForm';
export function MetricEditor({metric,onClose}:{metric?:Metric;onClose:()=>void}){
 const {s,C,scheme}=useTheme();
 const {metrics}=useBody();const {run}=useContext(Actions);
 const [name,setName]=useState(metric?.name??''),[unit,setUnit]=useState(metric?.unit??''),[category,setCategory]=useState<Category>(metric?.category??'custom');
 const [kind,setKind]=useState<ValueType>(metric?.value_type??'number'),[frequency,setFrequency]=useState(metric?.frequency??'随时');
 const [min,setMin]=useState(String(metric?.reference_min??'')),[max,setMax]=useState(String(metric?.reference_max??''));
 async function save(){const ok=await run(()=>saveMetric({id:metric?.id??`custom_${uid()}`,name:name.trim(),unit:['bmi','bmr'].includes(metric?.id??'')?(metric?.id==='bmr'?'kcal/天':'kg/m²'):kind==='text'?'':unit.trim(),category,value_type:kind,frequency,favorite:metric?.favorite??1,sort_order:metric?.sort_order??metrics.length,active:metric?.active??1,reference_min:kind==='number'&&min.trim()?numberInput(min):null,reference_max:kind==='number'&&max.trim()?numberInput(max):null}));if(ok)onClose();}
 return <Sheet title={metric?'编辑指标':'添加自定义指标'} onClose={onClose}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Card>
  <Field label="指标名称" value={name} onChange={setName} placeholder="例如：精神状态、尿酸"/>
  {['bmi','bmr'].includes(metric?.id??'')?<Text style={s.description}>BMI 与基础代谢根据身体资料自动计算，无需手动填写。</Text>:<><Text style={s.label}>记录类型</Text><Chips items={[{key:'number',label:'数值'},{key:'text',label:'文本'}]} value={kind} onChange={v=>setKind(v as ValueType)}/></>}
  {kind==='number'&&!['bmi','bmr'].includes(metric?.id??'')&&<Field label="默认单位" value={unit} onChange={setUnit} placeholder="例如：μmol/L、分、次"/>}
  <Text style={s.label}>指标分类</Text><Chips items={categoryItems} value={category} onChange={v=>setCategory(v as Category)}/>
  <Text style={s.label}>记录频率</Text><Chips items={FREQUENCIES.map(v=>({key:v,label:v}))} value={frequency} onChange={setFrequency}/>
  {kind==='number'&&<View style={s.row}><Field label="默认参考下限（选填）" value={min} numeric onChange={setMin}/><Field label="默认参考上限（选填）" value={max} numeric onChange={setMax}/></View>}
  <Text style={s.caption}>{kind==='text'?'文本按时间线和记录次数展示，不会被当成数值绘图。':'数值支持变化图表；默认单位和参考范围用于新记录，历史数据保持原样。'}</Text>
 </Card><Button title="保存指标" onPress={()=>void save()}/></ScrollView></Sheet>;
}
