import {CONTEXT_NAMES,Metric,Reading,localDate,readingValue,history} from './domain';

export interface TrendReport {metrics:Metric[];readings:Reading[];days:number;now:number;label:string}
export function trendReport(metrics:Metric[],readings:Reading[],days:number,metricId?:string,now=Date.now()):TrendReport {
 const selected=metricId?metrics.filter(m=>m.id===metricId):metrics;
 const ids=new Set(selected.map(m=>m.id));
 return {metrics:selected,readings:readings.filter(r=>ids.has(r.metric_id)&&Date.parse(r.measured_at)<=now&&(!days||Date.parse(r.measured_at)>=now-days*86400000)),days,now,label:metricId?selected[0]?.name??'指标':'全部指标'};
}
const details=(r:Reading)=>[
 `${localDate(r.measured_at)}  ${readingValue(r)}${r.unit?` ${r.unit}`:''}`,
 r.context?`场景：${CONTEXT_NAMES[r.context]}`:'',
 r.reference_min!==null||r.reference_max!==null?`参考范围：${r.reference_min??'—'} ～ ${r.reference_max??'—'} ${r.unit}`:'',
 r.derived_from?'来源：自动计算':'',r.note?`备注：${r.note}`:'',
].filter(Boolean).join('\n');
export function trendText(report:TrendReport):string {
 return [`myBody · ${report.label}记录`, `导出时间：${localDate(new Date(report.now).toISOString())}`,`时间范围：${report.days?`最近 ${report.days} 天`:'全部时间'} · ${report.readings.length} 条`,
 ...report.metrics.flatMap(m=>{const rows=history(report.readings,m.id,0,report.now);return rows.length?[`\n${m.name}（${rows.length} 条）`,...rows.map(details)]:[];})].join('\n\n');
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function trendHtml(report:TrendReport):string {
 return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm}body{font-family:Arial,"PingFang SC","Noto Sans CJK SC",sans-serif;color:#22332d;font-size:12px;line-height:1.65}h1{font-size:24px}h2{font-size:18px;margin-top:24px;page-break-after:avoid}article{border-bottom:1px solid #ddd;padding:10px 0;white-space:pre-wrap;overflow-wrap:anywhere}header{color:#52635b}</style></head><body><h1>myBody · ${escape(report.label)}记录</h1><header>导出时间：${escape(localDate(new Date(report.now).toISOString()))}<br>时间范围：${report.days?`最近 ${report.days} 天`:'全部时间'} · ${report.readings.length} 条</header>${report.metrics.map(m=>{const rows=history(report.readings,m.id,0,report.now);return rows.length?`<h2>${escape(m.name)}（${rows.length} 条）</h2>${rows.map(r=>`<article>${escape(details(r))}</article>`).join('')}`:'';}).join('')}</body></html>`;
}
export async function shareTrendReport(report:TrendReport,format:'txt'|'pdf'):Promise<void>{
 if(!report.readings.length)throw new Error('所选范围没有可导出的记录');
 const Sharing:typeof import('expo-sharing')=require('expo-sharing');
 if(!await Sharing.isAvailableAsync())throw new Error('当前设备不支持文件分享');
 const {File,Paths}:typeof import('expo-file-system')=require('expo-file-system');
 const file=new File(Paths.cache,`myBody-trends-${Date.now()}.${format}`);
 if(format==='txt')file.write(trendText(report));
 else {const Print:typeof import('expo-print')=require('expo-print');const result=await Print.printToFileAsync({html:trendHtml(report)});new File(result.uri).move(file);}
 await Sharing.shareAsync(file.uri,{mimeType:format==='pdf'?'application/pdf':'text/plain',UTI:format==='pdf'?'com.adobe.pdf':'public.plain-text',dialogTitle:'保存或分享指标记录'});
}
