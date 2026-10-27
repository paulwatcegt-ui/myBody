import React from 'react';
import {Alert} from 'react-native';
import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {RecordForm} from '../RecordForm';
import {Actions} from '../ui';
import {useBody} from '../store';
import {PRESETS,Reading} from '../domain';
import {saveBatch} from '../repository';
jest.mock('../repository',()=>({saveBatch:jest.fn().mockResolvedValue(undefined)}));
beforeEach(()=>{useBody.setState({metrics:PRESETS,readings:[],photos:[]});jest.spyOn(Alert,'alert').mockImplementation(()=>{});(saveBatch as jest.Mock).mockClear();});
afterEach(()=>jest.restoreAllMocks());
const run=async(task:()=>Promise<unknown>)=>{await task();return true;};
test('multi-field form saves only filled measurements',async()=>{
 render(<Actions.Provider value={{busy:false,run}}><RecordForm/></Actions.Provider>);
 fireEvent.press(screen.getByLabelText('身体档案'));
 fireEvent.changeText(screen.getByLabelText('体重数值'),'71.2');
 fireEvent.changeText(screen.getByLabelText('腰围数值'),'82');
 await act(async()=>fireEvent.press(screen.getByLabelText('保存本次记录')));
 const rows=(saveBatch as jest.Mock).mock.calls[0][0];expect(rows.map((r:Reading)=>r.metric_id)).toEqual(['weight','waist']);
 expect(rows[0]).toMatchObject({value:71.2,unit:'kg'});
});
test('editing one reading does not copy its second value or unit into unrelated metrics',async()=>{
 const initial:Reading={id:'old',metric_id:'bp',value:120,value2:80,unit:'mmHg',context:'',note:'复测',reference_min:null,reference_max:null,measured_at:new Date().toISOString()};
 const close=jest.fn();render(<Actions.Provider value={{busy:false,run}}><RecordForm initial={initial} onSaved={close}/></Actions.Provider>);
 fireEvent.changeText(screen.getByLabelText('收缩压'),'118');await act(async()=>fireEvent.press(screen.getByLabelText('保存修改')));
 expect(saveBatch).toHaveBeenCalledWith([expect.objectContaining({id:'old',metric_id:'bp',value:118,value2:80,unit:'mmHg'})]);expect(close).toHaveBeenCalled();
});
test('switching categories retains drafts and saves text alongside numbers',async()=>{
 render(<Actions.Provider value={{busy:false,run}}><RecordForm/></Actions.Provider>);
 fireEvent.press(screen.getByLabelText('身体档案'));
 fireEvent.changeText(screen.getByLabelText('体重数值'),'70.5');
 fireEvent.changeText(screen.getByLabelText('身高数值'),'175');
 expect(screen.queryByLabelText('BMI数值')).toBeNull();
 expect(screen.getByText('23.02')).toBeTruthy();
 fireEvent.press(screen.getByLabelText('全部分类'));fireEvent.press(screen.getByLabelText('生活状态'));
 fireEvent.changeText(screen.getByLabelText('饮食记录内容'),'早餐有鸡蛋');
 await act(async()=>fireEvent.press(screen.getByLabelText('保存本次记录')));
 const rows=(saveBatch as jest.Mock).mock.calls[0][0];
 expect(rows).toHaveLength(3);expect(rows.find((r:Reading)=>r.metric_id==='diet_notes')).toMatchObject({text_value:'早餐有鸡蛋',value:0,unit:''});
});
test('overview shortcut shows only the selected metric and its paired fields',async()=>{
 render(<Actions.Provider value={{busy:false,run}}><RecordForm metricId="bp"/></Actions.Provider>);
 expect(screen.getByLabelText('收缩压')).toBeTruthy();expect(screen.getByLabelText('舒张压')).toBeTruthy();expect(screen.queryByLabelText('心率数值')).toBeNull();
 fireEvent.changeText(screen.getByLabelText('收缩压'),'120');fireEvent.changeText(screen.getByLabelText('舒张压'),'80');
 await act(async()=>fireEvent.press(screen.getByLabelText('保存本次记录')));
 expect((saveBatch as jest.Mock).mock.calls[0][0]).toEqual([expect.objectContaining({metric_id:'bp',value:120,value2:80})]);
});
test('measurement note shows the requested example text',()=>{
 render(<RecordForm metricId="weight"/>);expect(screen.getByLabelText('备注（选填）').props.placeholder).toBe('例如：训练情况，报告说明，以及一切想记录下来的。。。。。');
});
