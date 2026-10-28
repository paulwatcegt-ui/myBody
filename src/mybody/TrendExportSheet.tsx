import React,{useContext,useState} from 'react';
import {ScrollView,Text} from 'react-native';
import {useBody} from './store';
import {Actions,Button,Card,Chips,Sheet,useTheme} from './ui';
import {shareTrendReport,trendReport} from './trendExport';
export function TrendExportSheet({metricId,days='30',onClose}:{metricId?:string;days?:string;onClose:()=>void}){
 const {metrics,readings}=useBody(),{s}=useTheme(),{run}=useContext(Actions);
 const [selected,setSelected]=useState(metricId??'all'),[range,setRange]=useState(days);
 const report=trendReport(metrics,readings,Number(range),selected==='all'?undefined:selected);
 return <Sheet title="导出指标记录" onClose={onClose}><ScrollView contentContainerStyle={s.page}><Card>
  <Text style={s.h2}>选择指标</Text><Chips items={[{key:'all',label:'全部指标'},...metrics.filter(m=>m.active||readings.some(r=>r.metric_id===m.id)).map(m=>({key:m.id,label:m.name}))]} value={selected} onChange={setSelected}/>
  <Text style={s.h2}>时间范围</Text><Chips items={[{key:'7',label:'7 天'},{key:'30',label:'30 天'},{key:'90',label:'90 天'},{key:'0',label:'全部时间'}]} value={range} onChange={setRange}/>
  <Text style={s.description}>{report.label} · {report.readings.length} 条记录</Text><Text style={s.caption}>包含所选指标的全部单位和测量场景、备注与参考范围，以及自动计算的 BMI 和基础代谢记录。</Text>
 </Card><Button title="导出文本 TXT" onPress={()=>void run(()=>shareTrendReport(report,'txt'))}/><Button title="导出 PDF 文档" secondary onPress={()=>void run(()=>shareTrendReport(report,'pdf'))}/></ScrollView></Sheet>;
}
