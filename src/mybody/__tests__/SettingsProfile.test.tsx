import React from 'react';
import {Alert} from 'react-native';
import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {ProfileScreen} from '../ProfileScreen';
import {SettingsScreen} from '../SettingsScreen';
import {BootScreen} from '../BootScreen';
import {BottomNavigation} from '../BottomNavigation';
import {Actions} from '../ui';
import {useBody} from '../store';
import {saveProfile} from '../repository';
import {exportBackup,exportCsv,importBackup} from '../media';
jest.mock('../repository',()=>({saveProfile:jest.fn().mockResolvedValue(undefined)}));
jest.mock('../media',()=>({exportBackup:jest.fn().mockResolvedValue(undefined),exportCsv:jest.fn().mockResolvedValue(undefined),importBackup:jest.fn().mockResolvedValue(false)}));
jest.mock('../motion',()=>({useReducedMotion:()=>true}));
const run=async(task:()=>Promise<unknown>)=>{await task();return true;};
beforeEach(()=>{useBody.setState({profile:{name:'小林',height:'175',birthday:'1995-06-01',sex:'female',target_weight:'65'},readings:[],photos:[]});jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
test('profile is a summary until editing and closes after successful save',async()=>{
 render(<Actions.Provider value={{run,busy:false}}><ProfileScreen manage={()=>{}}/></Actions.Provider>);
 expect(screen.queryByLabelText('称呼（选填）')).toBeNull();expect(screen.getByText('小林')).toBeTruthy();expect(screen.queryByLabelText('深色模式')).toBeNull();
 fireEvent.press(screen.getByLabelText('编辑档案'));fireEvent.changeText(screen.getByLabelText('称呼（选填）'),'新称呼');
 await act(async()=>fireEvent.press(screen.getByLabelText('保存个人资料')));expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({name:'新称呼'}));expect(screen.queryByLabelText('称呼（选填）')).toBeNull();
});
test('discard protection keeps edits until the user confirms',()=>{
 render(<ProfileScreen manage={()=>{}}/>);fireEvent.press(screen.getByLabelText('编辑档案'));fireEvent.changeText(screen.getByLabelText('称呼（选填）'),'未保存');fireEvent.press(screen.getByLabelText('关闭'));
 expect(Alert.alert).toHaveBeenCalledWith('放弃未保存的修改？',expect.any(String),expect.any(Array));expect(screen.getByLabelText('称呼（选填）').props.value).toBe('未保存');
 const buttons=(Alert.alert as jest.Mock).mock.calls[0][2];act(()=>buttons.find((b:any)=>b.text==='放弃修改').onPress());expect(screen.queryByLabelText('称呼（选填）')).toBeNull();
});
test('failed saves keep the editor and input',async()=>{
 render(<Actions.Provider value={{busy:false,run:async()=>false}}><ProfileScreen manage={()=>{}}/></Actions.Provider>);fireEvent.press(screen.getByLabelText('编辑档案'));fireEvent.changeText(screen.getByLabelText('身高 cm（选填）'),'-1');await act(async()=>fireEvent.press(screen.getByLabelText('保存个人资料')));expect(screen.getByLabelText('身高 cm（选填）').props.value).toBe('-1');
});
test('empty profile is optional and can be opened and closed without confirmation',()=>{
 useBody.setState({profile:{name:'',height:'',birthday:''}});render(<ProfileScreen manage={()=>{}}/>);fireEvent.press(screen.getByLabelText('完善档案'));fireEvent.press(screen.getByLabelText('关闭'));expect(Alert.alert).not.toHaveBeenCalled();expect(screen.getByLabelText('完善档案')).toBeTruthy();
});
test('settings subpages return to settings first and remain open across theme updates',()=>{
 const close=jest.fn();render(<SettingsScreen onClose={close}/>);fireEvent.press(screen.getByLabelText('外观'));expect(screen.getByLabelText('深色模式')).toBeTruthy();act(()=>useBody.setState(state=>({profile:{...state.profile,theme:'dark'}})));expect(screen.getByLabelText('深色模式')).toBeTruthy();fireEvent.press(screen.getByLabelText('返回'));expect(close).not.toHaveBeenCalled();expect(screen.getByLabelText('数据与备份')).toBeTruthy();fireEvent.press(screen.getByLabelText('返回'));expect(close).toHaveBeenCalledTimes(1);
});
test('backup and CSV actions remain accessible and restore still needs confirmation',async()=>{
 render(<Actions.Provider value={{run,busy:false}}><SettingsScreen onClose={()=>{}}/></Actions.Provider>);fireEvent.press(screen.getByLabelText('数据与备份'));
 await act(async()=>fireEvent.press(screen.getByLabelText('导出完整备份 ZIP')));expect(exportBackup).toHaveBeenCalled();
 await act(async()=>fireEvent.press(screen.getByLabelText('导出指标记录 CSV')));expect(exportCsv).toHaveBeenCalled();
 fireEvent.press(screen.getByLabelText('从 ZIP 备份恢复'));expect(Alert.alert).toHaveBeenCalledWith('从备份恢复？',expect.any(String),expect.any(Array));expect(importBackup).not.toHaveBeenCalled();
});
test('navigation has the five agreed entries and records from the middle',()=>{
 const change=jest.fn();render(<BottomNavigation tab="总览" onChange={change} busy={false}/>);expect(screen.getAllByRole('tab').map(n=>n.props.accessibilityLabel)).toEqual(['总览','趋势','记录','照片','我的']);fireEvent.press(screen.getByLabelText('记录'));expect(change).toHaveBeenCalledWith('记录');
});
test('startup shows real loading state and exposes retry on errors',()=>{
 const retry=jest.fn(),{rerender}=render(<BootScreen error="" onRetry={retry}/>);expect(screen.getByLabelText('myBody 启动标志')).toBeTruthy();expect(screen.queryByLabelText('重新加载')).toBeNull();rerender(<BootScreen error="数据库暂时不可用" onRetry={retry}/>);expect(screen.getByText('数据库暂时不可用')).toBeTruthy();fireEvent.press(screen.getByLabelText('重新加载'));expect(retry).toHaveBeenCalledTimes(1);
});
