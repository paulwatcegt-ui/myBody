import {ThemeProvider,resolveTheme} from './theme';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Appearance,useColorScheme,BackHandler,KeyboardAvoidingView,Platform,Pressable,Text,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Ionicons} from '@expo/vector-icons';
import {localDate} from './domain';
import {useBody} from './store';
import {Actions,Button,Run,Sheet,useTheme} from './ui';
import {Overview,Photos,Tab,Trends} from './MainScreens';
import {RecordForm} from './RecordForm';
import {MetricManager,ProfileScreen} from './ProfileScreen';
export default function MyBodyApp(){
 const {profile}=useBody();const system=useColorScheme(),mode=profile.theme??'system',scheme=resolveTheme(mode,system);
 useEffect(()=>{Appearance.setColorScheme(mode==='system'?null:mode);},[mode]);
 return <ThemeProvider scheme={scheme}><BodyApp/></ThemeProvider>;
}
function BodyApp(){
 const {s,C,scheme}=useTheme();
 useEffect(()=>{void SystemUI.setBackgroundColorAsync(C.bg).catch(()=>{});},[C.bg]);
 useEffect(()=>{if(Platform.OS==='android')NavigationBar.setStyle(scheme);},[scheme]);
 const {ready,error,boot,refresh,metrics}=useBody();const [quick,setQuick]=useState<string|null>(null);const [tab,setTab]=useState<Tab>('总览'),[busy,setBusy]=useState(false),[manage,setManage]=useState(false);const lock=useRef(false);
 useEffect(()=>{void boot();},[boot]);
 useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(busy)return true;if(tab!=='总览'){setTab('总览');return true;}return false;});return()=>subscription.remove();},[tab,busy]);
 const run:Run=async task=>{if(lock.current)return false;lock.current=true;setBusy(true);try{await task();await refresh();return true;}catch(e){Alert.alert('操作未完成',e instanceof Error?e.message:'请重试',[{text:'知道了'}]);return false;}finally{lock.current=false;setBusy(false);}};
 const tabs:{name:Tab;icon:keyof typeof Ionicons.glyphMap}[]=[{name:'总览',icon:'grid-outline'},{name:'记录',icon:'add-circle-outline'},{name:'趋势',icon:'analytics-outline'},{name:'照片',icon:'images-outline'},{name:'我的',icon:'person-outline'}];
 return <SafeAreaProvider><Actions.Provider value={{busy,run}}><SafeAreaView style={s.fill} edges={['top','left','right']}><StatusBar style={scheme==='dark'?'light':'dark'}/>
 {!ready?<View style={s.boot}>{error?<><Text style={s.h2}>数据加载未完成</Text><Text style={s.description}>{error}</Text><Button title="重新加载" onPress={()=>void boot()}/></>:<><ActivityIndicator color={C.green}/><Text style={s.description}>正在打开你的身体记录…</Text></>}</View>:<>
  <View style={s.header}><View style={{gap:3}}><Text style={s.brand}>myBody</Text><Text style={s.hero}>{tab==='总览'?'健康摘要':tab}</Text></View><Text style={s.headerDate}>{tab==='总览'?localDate(new Date().toISOString()).slice(0,10):tab}</Text></View>
  <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
   {tab==='总览'?<Overview onRecord={setQuick} navigate={setTab} manage={()=>setManage(true)}/>:tab==='记录'?<RecordForm onPhotos={()=>setTab('照片')} onManage={()=>setManage(true)}/>:tab==='趋势'?<Trends/>:tab==='照片'?<Photos/>:<ProfileScreen manage={()=>setManage(true)}/>}
  </KeyboardAvoidingView>
  <SafeAreaView edges={['bottom']} style={s.nav}><View style={s.navRow}>{tabs.map(t=><Pressable accessibilityRole="tab" accessibilityLabel={t.name} accessibilityState={{selected:t.name===tab}} disabled={busy} key={t.name} onPress={()=>setTab(t.name)} style={s.navItem}><View style={[s.navIcon,t.name===tab&&{backgroundColor:C.pale}]}><Ionicons name={t.icon} color={t.name===tab?C.green:C.muted} size={23}/></View><Text style={[s.navLabel,t.name===tab&&{color:C.green,fontWeight:'700'}]}>{t.name}</Text></Pressable>)}</View></SafeAreaView>
  {quick&&<Sheet title={`记录${metrics.find(m=>m.id===quick)?.name??''}`} onClose={()=>setQuick(null)}><RecordForm metricId={quick} onSaved={()=>setQuick(null)}/></Sheet>}
  {manage&&<MetricManager onClose={()=>setManage(false)}/>}
 </>}{busy&&<View style={s.loadingOverlay}><ActivityIndicator size="large" color={C.green}/><Text style={s.description}>正在处理，请稍候…</Text></View>}
 </SafeAreaView></Actions.Provider></SafeAreaProvider>;
}
