import {PwaRuntime} from './PwaRuntime';
import {Alert} from './dialogs';
import * as SplashScreen from 'expo-splash-screen';
import {BootScreen} from './BootScreen';
import {BottomNavigation} from './BottomNavigation';
import {SettingsScreen} from './SettingsScreen';
import {useReducedMotion} from './motion';
import {ThemeProvider,resolveTheme} from './theme';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Appearance,useColorScheme,BackHandler,KeyboardAvoidingView,Platform,Pressable,Text,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Ionicons} from '@expo/vector-icons';
import {localDate} from './domain';
import {useBody} from './store';
import {Actions,Button,Run,Sheet,useTheme} from './ui';
import {Overview,Photos,Tab,Trends} from './MainScreens';
import {RecordForm} from './RecordForm';
import {MetricManager,ProfileScreen} from './ProfileScreen';
void SplashScreen.preventAutoHideAsync().catch(()=>{});
SplashScreen.setOptions({fade:false,duration:0});
export default function MyBodyApp(){
 const {profile}=useBody();const system=useColorScheme(),mode=profile.theme??'system',scheme=resolveTheme(mode,system);
 useEffect(()=>{if(Platform.OS!=='web')Appearance.setColorScheme(mode==='system'?null:mode);},[mode]);
 return <ThemeProvider scheme={scheme}><BodyApp/></ThemeProvider>;
}
function BodyApp(){
 const {s,C,scheme}=useTheme();
 const [exportOpen,setExportOpen]=useState(false);
 const reduced=useReducedMotion();
 useEffect(()=>{SplashScreen.setOptions({fade:!reduced,duration:reduced?0:180});},[reduced]);
 useEffect(()=>{void SystemUI.setBackgroundColorAsync(C.bg).catch(()=>{});},[C.bg]);
 useEffect(()=>{if(Platform.OS==='android')NavigationBar.setStyle(scheme);},[scheme]);
 const {ready,error,boot,refresh,metrics}=useBody();const [quick,setQuick]=useState<string|null>(null);const [tab,setTab]=useState<Tab>('总览'),[busy,setBusy]=useState(false),[manage,setManage]=useState(false),[settings,setSettings]=useState(false);const lock=useRef(false);
 useEffect(()=>{void boot();},[boot]);
 useEffect(()=>{if(Platform.OS==='web')return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(busy)return true;if(tab!=='总览'){setTab('总览');return true;}return false;});return()=>subscription.remove();},[tab,busy]);
 const run:Run=async task=>{if(lock.current)return false;lock.current=true;setBusy(true);try{await task();await refresh();return true;}catch(e){Alert.alert('操作未完成',e instanceof Error?e.message:'请重试',[{text:'知道了'}]);return false;}finally{lock.current=false;setBusy(false);}};
 return <SafeAreaProvider><Actions.Provider value={{busy,run}}><SafeAreaView onLayout={()=>{requestAnimationFrame(()=>void SplashScreen.hideAsync().catch(()=>{}));}} style={s.fill} edges={['top','left','right']}><StatusBar style={scheme==='dark'?'light':'dark'}/>
 <PwaRuntime/>{!ready?<BootScreen error={error} onRetry={()=>void boot()}/>:<>
  <View style={s.header}><View style={{gap:3}}><Text style={s.brand}>myBody</Text><Text style={s.hero}>{tab==='总览'?'健康摘要':tab}</Text></View>{tab==='趋势'?<Button title='导出' secondary small onPress={()=>setExportOpen(true)}/>:tab==='我的'?<Pressable accessibilityRole="button" accessibilityLabel="设置" disabled={busy} onPress={()=>setSettings(true)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="settings-outline" size={25} color={C.green}/></Pressable>:<Text style={s.headerDate}>{tab==='总览'?localDate(new Date().toISOString()).slice(0,10):tab}</Text>}</View>
  <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
   {tab==='总览'?<Overview onRecord={setQuick} navigate={setTab} manage={()=>setManage(true)}/>:tab==='记录'?<RecordForm onPhotos={()=>setTab('照片')} onManage={()=>setManage(true)}/>:tab==='趋势'?<Trends exportOpen={exportOpen} onExportClose={()=>setExportOpen(false)}/>:tab==='照片'?<Photos/>:<ProfileScreen manage={()=>setManage(true)}/>}
  </KeyboardAvoidingView>
  <BottomNavigation tab={tab} onChange={setTab} busy={busy}/>
  {quick&&<Sheet title={`记录${metrics.find(m=>m.id===quick)?.name??''}`} onClose={()=>setQuick(null)}><RecordForm metricId={quick} onSaved={()=>setQuick(null)}/></Sheet>}
  {settings&&<SettingsScreen onClose={()=>setSettings(false)}/>}
  {manage&&<MetricManager onClose={()=>setManage(false)}/>}
 </>}{busy&&<View style={s.loadingOverlay}><ActivityIndicator size="large" color={C.green}/><Text style={s.description}>正在处理，请稍候…</Text></View>}
 </SafeAreaView></Actions.Provider></SafeAreaProvider>;
}
