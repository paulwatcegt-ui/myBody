import React,{useContext,useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {latestPair,localDate,readingValue,delta} from './domain';
import {moveFavorite} from './repository';
import {useBody} from './store';
import {Actions,Button,Card,Empty,Sheet,useTheme} from './ui';
import type {Tab} from './MainScreens';

export function Overview({navigate,manage,onRecord}:{onRecord:(id:string)=>void;navigate:(tab:Tab)=>void;manage:()=>void}){
 const {s,C,scheme}=useTheme();
 const {metrics,readings,profile}=useBody(),{run}=useContext(Actions),[sorting,setSorting]=useState(false);
 const {width,fontScale}=useWindowDimensions();const columns=width>=360&&fontScale<=1.3?2:1;
 const favorites=metrics.filter(m=>m.favorite&&m.active).sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
 return <><ScrollView contentContainerStyle={[s.page,{gap:12}]}>
  <Text style={s.description}>{profile.name?`${profile.name}，这是你的身体记录`:'每一次记录，都让变化更清晰。'}</Text>
  <View style={[s.summary,{padding:14,gap:16}]}><Text style={{color:C.ink,fontSize:14}}>已记录 {new Set(readings.map(r=>localDate(r.measured_at).slice(0,10))).size} 天 · {new Set(readings.map(r=>r.metric_id)).size} 项指标</Text><Pressable accessibilityRole="button" accessibilityLabel="记录今天" onPress={()=>navigate('记录')} style={{marginLeft:'auto',padding:6}}><Text style={{color:C.green,fontWeight:'600'}}>＋记录</Text></Pressable></View>
  <View style={s.between}><Text style={s.h2}>我的关注</Text><View style={{flexDirection:'row',gap:8}}>{favorites.length>1&&<Button title="排序" secondary small onPress={()=>setSorting(true)}/>}<Button title="管理关注" secondary small onPress={manage}/></View></View>
  {!favorites.length&&<Empty text="选择关注指标，让变化出现在这里"/>}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
   {favorites.map(m=>{const pair=latestPair(readings,m.id),last=pair[pair.length-1],previous=pair.length>1?pair[0]:null,isText=m.value_type==='text';
    return <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`记录${m.name}`} accessibilityHint="点击录入此指标" onPress={()=>onRecord(m.id)} style={({pressed})=>({width:columns===2?(width-52)/2:'100%',backgroundColor:C.surface,borderWidth:0,borderColor:C.border,borderRadius:18,padding:14,gap:5,opacity:pressed?.7:1})}>
     <Text style={{fontSize:14,lineHeight:20,fontWeight:'700',color:C.ink}}>{m.name}{last?.derived_from?' · 自动':''}</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',gap:4}}><Text numberOfLines={isText?2:undefined} style={{fontSize:isText?14:m.id==='bp'?22:26,lineHeight:isText?21:32,fontWeight:'600',color:C.ink,flexShrink:1}}>{last?readingValue(last):'—'}</Text>{!isText&&<Text style={{fontSize:11,color:C.muted}}>{last?.unit??m.unit}</Text>}</View>
     <Text style={{fontSize:11,lineHeight:17,color:C.muted}}>{last?localDate(last.measured_at):'暂无记录 · 点击添加'}</Text>
     {last&&!isText&&<Text style={{fontSize:11,lineHeight:17,color:C.muted}}>{previous?`较上次 ${delta(previous.value,last.value)}${last.value2!==null&&previous.value2!==null?` / ${delta(previous.value2,last.value2)}`:''}`:'首次记录'}{last.derived_from?' · 自动计算':''}</Text>}
    </Pressable>;
   })}
  </View><Text style={s.footer}>点击卡片录入 · 详细曲线在趋势中查看</Text>
 </ScrollView>{sorting&&<Sheet title="关注排序" onClose={()=>setSorting(false)}><ScrollView contentContainerStyle={s.page}><Text style={s.description}>按上移／下移调整顺序，自动保存到总览和趋势。</Text>{favorites.map((m,index)=><Card key={m.id}><Text style={s.h2}>{index+1}. {m.name}</Text><View style={s.row}>{index>0&&<Button title={`${m.name}上移`} secondary small onPress={()=>void run(()=>moveFavorite(m.id,-1))}/>} {index<favorites.length-1&&<Button title={`${m.name}下移`} secondary small onPress={()=>void run(()=>moveFavorite(m.id,1))}/>}</View></Card>)}</ScrollView></Sheet>}</>;
}
