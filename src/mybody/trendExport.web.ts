export * from './trendReport';
import {TrendReport,trendText,trendHtml} from './trendReport';
import {offerFile} from './browserFiles';
export async function shareTrendReport(report:TrendReport,format:'txt'|'pdf'){
 if(!report.readings.length)throw new Error('所选范围没有可导出的记录');
 if(format==='txt'){offerFile(trendText(report),'myBody-trends.txt','text/plain;charset=utf-8');return;}
 const page=window.open('','_blank');if(!page)throw new Error('请允许弹出窗口以打开报告');page.document.write(trendHtml(report));page.document.close();const button=page.document.createElement('button');button.textContent='打印／保存 PDF';button.onclick=()=>page.print();page.document.body.prepend(button);const style=page.document.createElement('style');style.textContent='@media print{button{display:none}}';page.document.head.append(style);
}
