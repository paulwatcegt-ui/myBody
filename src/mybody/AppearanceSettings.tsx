import React,{useContext} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useBody} from './store';
import {saveThemePreference} from './repository';
import {THEME_NAMES,ThemeMode} from './theme';
import {Actions,Card,useTheme} from './ui';
export function AppearanceSettings(){
 const {s,C}=useTheme(),{profile}=useBody(),{run,busy}=useContext(Actions);
 const icons={system:'phone-portrait-outline',light:'sunny-outline',dark:'moon-outline'} as const;
 return <Card><Text style={s.h2}>外观</Text><View style={{flexDirection:'row',backgroundColor:C.fill,borderRadius:14,padding:4,gap:4}}>{(['light','dark','system'] as ThemeMode[]).map(mode=>{
  const selected=(profile.theme??'system')===mode;
  return <Pressable key={mode} disabled={busy} accessibilityRole="radio" accessibilityLabel={THEME_NAMES[mode]} accessibilityState={{selected}} onPress={()=>void run(()=>saveThemePreference(mode))} style={{flex:1,alignItems:'center',justifyContent:'center',gap:8,paddingVertical:14,borderRadius:11,backgroundColor:selected?C.surface:'transparent'}}><Ionicons name={icons[mode]} size={22} color={selected?C.green:C.muted}/><Text style={{fontSize:12,fontWeight:selected?'600':'400',color:selected?C.ink:C.muted}}>{THEME_NAMES[mode]}</Text></Pressable>;
 })}</View><Text style={s.caption}>跟随系统时，外观会随手机的深浅色设置自动切换。</Text></Card>;
}
