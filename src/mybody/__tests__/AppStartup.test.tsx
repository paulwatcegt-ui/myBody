import React from 'react';
import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import MyBodyApp from '../MyBodyApp';
import {useBody} from '../store';
import {PRESETS} from '../domain';
jest.mock('expo-splash-screen',()=>({preventAutoHideAsync:jest.fn().mockResolvedValue(true),hideAsync:jest.fn().mockResolvedValue(undefined),setOptions:jest.fn()}));
jest.mock('expo-system-ui',()=>({setBackgroundColorAsync:jest.fn().mockResolvedValue(undefined)}));
jest.mock('expo-navigation-bar',()=>({setStyle:jest.fn()}));
jest.mock('../media',()=>({}));
jest.mock('../motion',()=>({useReducedMotion:()=>true}));
beforeEach(()=>{jest.useFakeTimers();useBody.setState({ready:false,error:'',boot:jest.fn().mockResolvedValue(undefined),profile:{name:'',height:'',birthday:''},metrics:PRESETS,readings:[],photos:[]});});
afterEach(()=>jest.useRealTimers());
test('slow startup remains a real loading state and ready data opens without a fixed wait',async()=>{
 render(<MyBodyApp/>);expect(screen.getByLabelText('myBody 启动标志')).toBeTruthy();act(()=>jest.advanceTimersByTime(5000));expect(screen.getByLabelText('myBody 启动标志')).toBeTruthy();
 act(()=>useBody.setState({ready:true}));expect(screen.queryByLabelText('myBody 启动标志')).toBeNull();expect(screen.getAllByRole('tab').map(n=>n.props.accessibilityLabel)).toEqual(['总览','趋势','记录','照片','我的']);
});
test('first layout releases the native splash and initialization failure exposes retry',()=>{
 render(<MyBodyApp/>);const root=screen.UNSAFE_getAllByType(SafeAreaView).find(node=>typeof node.props.onLayout==='function')!;
 fireEvent(root,'layout',{nativeEvent:{layout:{width:400,height:800}}});act(()=>jest.runOnlyPendingTimers());expect(SplashScreen.hideAsync).toHaveBeenCalled();expect(SplashScreen.setOptions).toHaveBeenLastCalledWith({fade:false,duration:0});
 act(()=>useBody.setState({error:'初始化失败'}));expect(screen.getByText('初始化失败')).toBeTruthy();fireEvent.press(screen.getByLabelText('重新加载'));expect(useBody.getState().boot).toHaveBeenCalledTimes(2);
});
