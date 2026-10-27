import React,{useEffect,useRef} from 'react';
import {ActivityIndicator,Animated,Image,Text,View} from 'react-native';
import {useTheme,Button} from './ui';
import {useReducedMotion} from './motion';
export function BootScreen({error,onRetry}:{error:string;onRetry:()=>void}){
 const {s,C,scheme}=useTheme(),reduced=useReducedMotion(),opacity=useRef(new Animated.Value(1)).current;
 useEffect(()=>{if(reduced){opacity.stopAnimation();opacity.setValue(1);return;}opacity.setValue(.7);Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true}).start();},[reduced,opacity]);
 return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.bg}}>
  <Animated.View style={{alignItems:'center',width:'100%',paddingHorizontal:32,opacity,gap:16}}>
   <Image accessibilityLabel="myBody 启动标志" source={scheme==='dark'?require('../../assets/brand-mark-dark.png'):require('../../assets/brand-mark.png')} style={{width:112,height:112}} resizeMode="contain"/>
   <Text style={{fontSize:26,fontWeight:'600',letterSpacing:-.5,color:C.ink}}>myBody</Text>
   {error?<><Text accessibilityRole="alert" style={s.h2}>数据加载未完成</Text><Text style={[s.description,{textAlign:'center'}]}>{error}</Text><Button title="重新加载" onPress={onRetry}/></>:<><ActivityIndicator color={C.green}/><Text style={s.caption}>正在打开你的身体记录…</Text></>}
  </Animated.View>
 </View>;
}
