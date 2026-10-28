import React from 'react';
import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {PRESETS,Reading} from '../domain';
import {trendReport,trendText,trendHtml,shareTrendReport} from '../trendExport';
import {TrendExportSheet} from '../TrendExportSheet';
import {Actions} from '../ui';
import {useBody} from '../store';
const mockWrite=jest.fn(),mockMove=jest.fn();
jest.mock('expo-file-system',()=>({Paths:{cache:'cache'},File:jest.fn().mockImplementation((...parts:string[])=>({uri:parts.join('/'),write:mockWrite,move:mockMove}))}));
jest.mock('expo-sharing',()=>({isAvailableAsync:jest.fn().mockResolvedValue(true),shareAsync:jest.fn().mockResolvedValue(undefined)}));
jest.mock('expo-print',()=>({printToFileAsync:jest.fn().mockResolvedValue({uri:'cache/output.pdf'})}));
jest.mock('../motion',()=>({useReducedMotion:()=>true}));
const now=Date.parse('2026-10-28T12:00:00Z');
const row=(id:string,metric_id:string,time=now):Reading=>({id,metric_id,measured_at:new Date(time).toISOString(),value:120,value2:80,unit:'mmHg',context:'',note:'复测 <script>alert(1)</script>',reference_min:90,reference_max:140});
test('export filters dates and selected metrics, preserving dual readings, text and escaped notes',()=>{
 const rows=[row('bp','bp'),row('old','weight',now-31*86400000),row('future','bp',now+1000),{...row('txt','diet_notes'),text_value:'早餐\n鸡蛋',unit:'',value:0,value2:null}];
 const report=trendReport(PRESETS,rows,30,undefined,now);
 expect(report.readings.map(r=>r.id)).toEqual(['bp','txt']);
 const text=trendText(report);expect(text).toContain('120 / 80 mmHg');expect(text).toContain('早餐\n鸡蛋');expect(text).toContain('参考范围：90 ～ 140');
 const html=trendHtml(report);expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');
 expect(trendReport(PRESETS,rows,0,'weight',now).readings.map(r=>r.id)).toEqual(['old']);
});
test('TXT and PDF write and share real file URIs; empty selection fails before generating',async()=>{
 const Sharing=require('expo-sharing'),Print=require('expo-print');
 const report=trendReport(PRESETS,[row('bp','bp')],0,undefined,now);
 await shareTrendReport(report,'txt');expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('120 / 80'));
 expect(Sharing.shareAsync).toHaveBeenLastCalledWith(expect.stringMatching(/\.txt$/),expect.objectContaining({mimeType:'text/plain'}));
 await shareTrendReport(report,'pdf');expect(Print.printToFileAsync).toHaveBeenCalledWith({html:expect.stringContaining('<!DOCTYPE html>')});expect(mockMove).toHaveBeenCalled();
 expect(Sharing.shareAsync).toHaveBeenLastCalledWith(expect.stringMatching(/\.pdf$/),expect.objectContaining({mimeType:'application/pdf'}));
 await expect(shareTrendReport({...report,readings:[]},'pdf')).rejects.toThrow('没有可导出');
});
test('export sheet changes from current metric to all metrics even without favorites',async()=>{
 useBody.setState({metrics:PRESETS.map(m=>({...m,favorite:0})),readings:[row('bp','bp',Date.now()-1000),row('weight','weight',Date.now()-1000)]});
 const run=jest.fn(async(task:()=>Promise<unknown>)=>{await task();return true;});
 render(<Actions.Provider value={{busy:false,run}}><TrendExportSheet metricId="bp" days="0" onClose={()=>{}}/></Actions.Provider>);
 expect(screen.getByText('血压 · 1 条记录')).toBeTruthy();fireEvent.press(screen.getByLabelText('全部指标'));expect(screen.getByText('全部指标 · 2 条记录')).toBeTruthy();
 await act(async()=>fireEvent.press(screen.getByLabelText('导出文本 TXT')));expect(run).toHaveBeenCalled();
});
