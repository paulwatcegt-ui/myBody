import React from 'react';
import {Alert} from 'react-native';
import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {MetricManager} from '../MetricManager';
import {ProfileScreen} from '../ProfileScreen';
import {Overview,Trends} from '../MainScreens';
import {PRESETS} from '../domain';
import {ageInYears} from '../calculations';
import {saveProfile,moveFavorite} from '../repository';
import {useBody} from '../store';
import {Actions} from '../ui';
jest.mock('../repository',()=>({saveProfile:jest.fn().mockResolvedValue(undefined),moveFavorite:jest.fn().mockResolvedValue(undefined)}));
jest.mock('../media',()=>({}));
jest.mock('../Chart',()=>({Chart:()=>null}));
beforeEach(()=>{useBody.setState({metrics:PRESETS,readings:[],photos:[],profile:{name:'',height:'175',birthday:'2000-01-01'}});jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
test('metric management filters by category and keyword',()=>{
 render(<MetricManager onClose={()=>{}}/>);
 fireEvent.press(screen.getByLabelText('健康监测'));
 expect(screen.getByLabelText('编辑 心率')).toBeTruthy();expect(screen.queryByLabelText('编辑 体重')).toBeNull();
 fireEvent.changeText(screen.getByLabelText('搜索指标'),'血糖');
 expect(screen.getByLabelText('编辑 血糖')).toBeTruthy();expect(screen.queryByLabelText('编辑 心率')).toBeNull();
 fireEvent.changeText(screen.getByLabelText('搜索指标'),'找不到');expect(screen.getByText('没有匹配的指标，试试其他分类或关键词')).toBeTruthy();
});
test('profile age is computed and optional gender and goal persist',async()=>{
 const run=async(task:()=>Promise<unknown>)=>{await task();return true;};
 render(<Actions.Provider value={{busy:false,run}}><ProfileScreen manage={()=>{}}/></Actions.Provider>);
 expect(screen.getByText(`年龄：${ageInYears('2000-01-01')} 岁`)).toBeTruthy();
 fireEvent.press(screen.getByLabelText('女'));fireEvent.changeText(screen.getByLabelText('目标体重 kg（选填）'),'65');
 await act(async()=>fireEvent.press(screen.getByLabelText('保存个人资料')));
 expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({sex:'female',target_weight:'65',birthday:'2000-01-01'}));
});
test('theme refresh does not clear unsaved profile edits and profile saving retains theme',async()=>{
 const run=async(task:()=>Promise<unknown>)=>{await task();return true;};
 render(<Actions.Provider value={{busy:false,run}}><ProfileScreen manage={()=>{}}/></Actions.Provider>);
 fireEvent.changeText(screen.getByLabelText('称呼（选填）'),'小林');
 act(()=>useBody.setState(state=>({profile:{...state.profile,theme:'dark'}})));
 expect(screen.getByLabelText('称呼（选填）').props.value).toBe('小林');
 await act(async()=>fireEvent.press(screen.getByLabelText('保存个人资料')));
 expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({name:'小林',theme:'dark'}));
});
test('overview card opens the corresponding direct entry',()=>{
 const record=jest.fn();render(<Overview navigate={()=>{}} manage={()=>{}} onRecord={record}/>);
 fireEvent.press(screen.getByLabelText('记录体重'));expect(record).toHaveBeenCalledWith('weight');
});
test('overview provides ordering controls and invokes persisted favorite order',async()=>{
 const run=async(task:()=>Promise<unknown>)=>{await task();return true;};
 render(<Actions.Provider value={{busy:false,run}}><Overview navigate={()=>{}} manage={()=>{}} onRecord={()=>{}}/></Actions.Provider>);
 fireEvent.press(screen.getByLabelText('排序'));
 await act(async()=>fireEvent.press(screen.getByLabelText('体重下移')));
 expect(moveFavorite).toHaveBeenCalledWith('weight',1);
});
test('trends shows only active favorites and handles removing the selected metric',()=>{
 useBody.setState({metrics:PRESETS.map(m=>({...m,favorite:m.id==='weight'?1:0}))});
 render(<Trends/>);expect(screen.getByLabelText('体重')).toBeTruthy();expect(screen.queryByLabelText('BMI')).toBeNull();expect(screen.queryByLabelText('心率')).toBeNull();
 act(()=>useBody.setState({metrics:PRESETS.map(m=>({...m,favorite:m.id==='pulse'?1:0}))}));
 expect(screen.queryByLabelText('体重')).toBeNull();expect(screen.getByLabelText('心率')).toBeTruthy();
 act(()=>useBody.setState({metrics:PRESETS.map(m=>({...m,favorite:0}))}));
 expect(screen.getByText('还没有关注指标，请到总览管理关注后查看趋势')).toBeTruthy();
});
