import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Pressable,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg,{Circle,Path,Rect} from 'react-native-svg';
import {useTheme} from './theme';
import {useReducedMotion} from './motion';
import type {Tab} from './MainScreens';
export const TAB_ORDER:Tab[]=['总览','趋势','记录','照片','我的'];
function Glyph({tab,color,active}:{tab:Tab;color:string;active:boolean}){
 const props={stroke:color,strokeWidth:active?2:1.7,fill:'none',strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <Svg width={25} height={25} viewBox="0 0 24 24">
  {tab==='总览'?<><Rect x={3} y={3} width={7} height={7} rx={1.5} {...props}/><Rect x={14} y={3} width={7} height={7} rx={1.5} {...props}/><Rect x={3} y={14} width={7} height={7} rx={1.5} {...props}/><Rect x={14} y={14} width={7} height={7} rx={1.5} {...props}/></>:tab==='趋势'?<><Path d="M3 17 9 11 14 14 21 5" {...props}/><Path d="M16 5h5v5" {...props}/></>:tab==='照片'?<><Rect x={3} y={4} width={18} height={16} rx={3} {...props}/><Circle cx={8} cy={9} r={1.5} {...props}/><Path d="m4 18 5-5 4 3 3-4 5 5" {...props}/></>:tab==='我的'?<><Circle cx={12} cy={7} r={4} {...props}/><Path d="M4 21v-2a8 8 0 0 1 16 0v2" {...props}/></>:<Path d="M12 5v14M5 12h14" {...props}/>}
 </Svg>;
}
function NavItem({tab,selected,onPress,busy,reduced}:{tab:Tab;selected:boolean;onPress:()=>void;busy:boolean;reduced:boolean}){
 const {C}=useTheme(),scale=useRef(new Animated.Value(1)).current,opacity=useRef(new Animated.Value(1)).current;
 useEffect(()=>{opacity.stopAnimation();if(selected&&!reduced){opacity.setValue(.7);Animated.timing(opacity,{toValue:1,duration:140,useNativeDriver:true}).start();}else opacity.setValue(1);},[selected,reduced,opacity]);
 useEffect(()=>{if(reduced){scale.stopAnimation();scale.setValue(1);}},[reduced,scale]);
 function press(toValue:number){if(reduced)return;scale.stopAnimation();Animated.timing(scale,{toValue,duration:toValue===1?160:140,easing:Easing.bezier(.32,.72,0,1),useNativeDriver:true}).start();}
 const central=tab==='记录';
 return <Pressable accessibilityRole="tab" accessibilityLabel={tab} accessibilityState={{selected}} disabled={busy} onPress={onPress} onPressIn={()=>press(.94)} onPressOut={()=>press(1)} style={{flex:1,minHeight:60,alignItems:'center',justifyContent:'flex-end',paddingTop:3,gap:3}}>
  <Animated.View style={{transform:[{scale}],opacity,alignItems:'center',justifyContent:'center',...(central?{width:52,height:52,borderRadius:26,backgroundColor:C.accent,marginTop:-20}:{width:42,height:30})}}><Glyph tab={tab} active={selected||central} color={central?C.onAccent:selected?C.green:C.muted}/></Animated.View>
  <Text style={{fontSize:10,lineHeight:16,fontWeight:selected||central?'600':'400',color:selected||central?C.green:C.muted}}>{tab}</Text>
 </Pressable>;
}
export function BottomNavigation({tab,onChange,busy}:{tab:Tab;onChange:(tab:Tab)=>void;busy:boolean}){
 const {s,C}=useTheme(),reduced=useReducedMotion();
 return <SafeAreaView edges={['bottom']} style={[s.nav,{backgroundColor:C.surface}]}><View style={s.navRow}>{TAB_ORDER.map(name=><NavItem key={name} tab={name} selected={name===tab} onPress={()=>onChange(name)} busy={busy} reduced={reduced}/>)}</View></SafeAreaView>;
}
