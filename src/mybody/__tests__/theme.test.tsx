import React from 'react';
import {StyleSheet,Text} from 'react-native';
import {fireEvent,render,screen,act} from '@testing-library/react-native';
import {PALETTES,ThemeProvider,resolveTheme} from '../theme';
import {Actions,Card,Field} from '../ui';
import {AppearanceSettings} from '../AppearanceSettings';
import {useBody} from '../store';
import {saveThemePreference} from '../repository';
jest.mock('../repository',()=>({saveThemePreference:jest.fn().mockResolvedValue(undefined)}));
test('appearance respects explicit modes and follows system when selected',()=>{
 expect(resolveTheme('system','dark')).toBe('dark');expect(resolveTheme('system','light')).toBe('light');expect(resolveTheme('system',null)).toBe('light');
 expect(resolveTheme('light','dark')).toBe('light');expect(resolveTheme('dark','light')).toBe('dark');
});
test('changing provider updates existing inputs and cards without losing input value',()=>{
 const view=(scheme:'light'|'dark')=><ThemeProvider scheme={scheme}><Card><Text>测试</Text><Field label="测试输入" value="71.25" onChange={()=>{}}/></Card></ThemeProvider>;
 const {rerender}=render(view('light'));expect(StyleSheet.flatten(screen.getByLabelText('测试输入').props.style).backgroundColor).toBe(PALETTES.light.input);
 rerender(view('dark'));const input=screen.getByLabelText('测试输入');expect(input.props.value).toBe('71.25');expect(StyleSheet.flatten(input.props.style)).toMatchObject({backgroundColor:PALETTES.dark.input,color:PALETTES.dark.ink});
});
test('appearance setting saves selected preference and defaults to system',async()=>{
 useBody.setState({profile:{name:'',height:'',birthday:''}});
 const run=async(task:()=>Promise<unknown>)=>{await task();return true;};
 render(<Actions.Provider value={{run,busy:false}}><AppearanceSettings/></Actions.Provider>);
 expect(screen.getByLabelText('跟随系统').props.accessibilityState.selected).toBe(true);
 await act(async()=>fireEvent.press(screen.getByLabelText('深色模式')));expect(saveThemePreference).toHaveBeenCalledWith('dark');
});
function luminance(hex:string){const rgb=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
test.each(['light','dark'] as const)('%s text and button colors maintain readable contrast',mode=>{
 const c=PALETTES[mode];for(const [foreground,background] of [[c.ink,c.surface],[c.muted,c.surface],[c.muted,c.input],[c.onAccent,c.accent]]){
  const a=luminance(foreground),b=luminance(background);expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThanOrEqual(4.5);
 }
});
