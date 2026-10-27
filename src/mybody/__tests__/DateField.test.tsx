import React from 'react';
import {Platform} from 'react-native';
import {fireEvent,render,screen} from '@testing-library/react-native';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {DateField,dateWithDay} from '../DateField';
jest.mock('@react-native-community/datetimepicker',()=>({__esModule:true,default:()=>null,DateTimePickerAndroid:{open:jest.fn()}}));
test('calendar selection preserves the measurement time and cancellation preserves input',()=>{
 Object.defineProperty(Platform,'OS',{value:'android',configurable:true});
 const change=jest.fn();render(<DateField label="测量时间" value="2024-03-02 09:35" onChange={change}/>);
 fireEvent.press(screen.getByLabelText('测量时间选择日期'));
 const config=(DateTimePickerAndroid.open as jest.Mock).mock.calls[0][0];
 config.onChange({type:'dismissed'});expect(change).not.toHaveBeenCalled();
 config.onChange({type:'set'},new Date(2024,1,29));expect(change).toHaveBeenCalledWith('2024-02-29 09:35');
});
test('changing leap-day year does not overflow the selected day',()=>{
 const result=dateWithDay(new Date(2024,1,29,9,35),new Date(2023,1,28));
 expect([result.getFullYear(),result.getMonth(),result.getDate(),result.getHours()]).toEqual([2023,1,28,9]);
});
test('date shortcuts contain only today and yesterday and retain the selected time',()=>{
 const change=jest.fn();render(<DateField label="测量时间" value="2020-01-01 00:01" onChange={change}/>);
 expect(screen.queryByLabelText('现在')).toBeNull();expect(screen.getByLabelText('今天')).toBeTruthy();
 fireEvent.press(screen.getByLabelText('昨天'));const date=new Date();date.setDate(date.getDate()-1);
 const expected=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 expect(change).toHaveBeenCalledWith(`${expected} 00:01`);
});
