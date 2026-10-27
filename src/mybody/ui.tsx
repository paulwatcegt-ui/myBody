import React, { createContext, useContext } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {useTheme} from './theme';
export {useTheme} from './theme';
export type Run=(task:()=>Promise<unknown>)=>Promise<boolean>;
export const Actions=createContext<{busy:boolean;run:Run}>({busy:false,run:async()=>false});
export function Button({title,onPress,secondary=false,danger=false,small=false}:{title:string;onPress:()=>void;secondary?:boolean;danger?:boolean;small?:boolean}) {
 const {s,C}=useTheme();const {busy}=useContext(Actions);
 return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={busy} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,small&&s.small,{opacity:busy?0.45:pressed?0.7:1},danger&&{backgroundColor:C.dangerBg}]}><Text style={[s.buttonText,secondary&&{color:C.green},danger&&{color:C.danger}]}>{title}</Text></Pressable>;
}
export function Field({label,value,onChange,placeholder='',numeric=false,multiline=false}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;numeric?:boolean;multiline?:boolean}) {
 const {s,C}=useTheme();const {busy}=useContext(Actions);
 return <View style={{flex:1,minWidth:70}}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!busy} placeholder={placeholder} placeholderTextColor={C.muted} keyboardType={numeric?'decimal-pad':'default'} autoCapitalize="none" multiline={multiline} maxLength={multiline?20000:2000} style={[s.input,{fontFamily:Platform.OS==='android'?'sans-serif':undefined,fontSize:16,lineHeight:24,minHeight:56,includeFontPadding:true,textAlignVertical:'center',paddingVertical:12},multiline&&{minHeight:96,textAlignVertical:'top'}]}/></View>;
}
export function Chips({items,value,onChange}:{items:{key:string;label:string}[];value:string;onChange:(key:string)=>void}) {
 const {s,C}=useTheme();const {busy}=useContext(Actions);
 return <View style={s.chips}>{items.map(item=><Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:item.key===value}} disabled={busy} key={item.key} onPress={()=>onChange(item.key)} style={[s.chip,item.key===value&&s.chipOn]}><Text style={[s.chipText,item.key===value&&{color:C.green,fontWeight:'700'}]}>{item.label}</Text></Pressable>)}</View>;
}
export const Card=({children}:{children:React.ReactNode})=>{const {s}=useTheme();return <View style={s.card}>{children}</View>;};
export const Empty=({text}:{text:string})=>{const {s,C}=useTheme();return <View style={s.empty}><Ionicons name="leaf-outline" size={34} color={C.green}/><Text style={s.description}>{text}</Text></View>;};
export function Sheet({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
 const {s,C}=useTheme();const {busy}=useContext(Actions);
 return <Modal animationType="slide" onRequestClose={()=>!busy&&onClose()}><SafeAreaView style={s.fill}><View style={s.sheetHeader}><Text style={s.h2}>{title}</Text><Button title="关闭" secondary small onPress={onClose}/></View><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>{children}</KeyboardAvoidingView>{busy&&<View style={s.loadingOverlay}><ActivityIndicator color={C.green}/><Text style={s.description}>正在保存…</Text></View>}</SafeAreaView></Modal>;
}
