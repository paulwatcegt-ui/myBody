export * from './trendReport';
import {TrendReport,trendText,trendHtml} from './trendReport';
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
