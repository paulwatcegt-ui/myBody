import {useTheme} from './theme';
import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { Reading, localDate } from './domain';

// Adapted from PulseSense's selectable single/dual-series chart presentation.
// Coordinates use actual timestamps: gaps between measurements remain visible.
export function Chart({ rows, compact=false }: { rows: Reading[]; compact?: boolean }) {
  const {C}=useTheme();const s=StyleSheet.create({empty:{justifyContent:'center',alignItems:'center'},muted:{color:C.muted,fontSize:11},labels:{flexDirection:'row',justifyContent:'space-between'},caption:{color:C.muted,fontSize:12,marginTop:10,textAlign:'center'}});
  const [selected,setSelected] = useState<string | null>(null);
  const { width:screen } = useWindowDimensions();
  const width = Math.max(180,screen-(compact?88:80)); const height = compact?90:180;
  if (!rows.length) return <View style={[s.empty,{height}]}><Text style={s.muted}>还没有记录，添加后可查看变化</Text></View>;
  const values = rows.flatMap(r=>r.value2 === null ? [r.value] : [r.value,r.value2]);
  const rawMin=values.reduce((a,b)=>Math.min(a,b),Infinity),rawMax=values.reduce((a,b)=>Math.max(a,b),-Infinity);
  let min=rawMin,max=rawMax; const pad=(max-min)*0.12 || Math.max(Math.abs(max)*0.05,1); min-=pad; max+=pad;
  const start=Date.parse(rows[0].measured_at),end=Date.parse(rows[rows.length-1].measured_at);
  const x = (r:Reading) => rows.length===1?width/2:12+(Date.parse(r.measured_at)-start)/(end-start||1)*(width-24);
  const y = (v:number) => 10+(max-v)/(max-min)*(height-20);
  const selectedRow=rows.find(r=>r.id===selected) ?? rows[rows.length-1];
  const caption = `${localDate(selectedRow.measured_at)} · ${selectedRow.value}${selectedRow.value2===null?'':` / ${selectedRow.value2}`} ${selectedRow.unit}`;
  return <View accessibilityLabel={`趋势，共 ${rows.length} 条记录。${caption}`}>
    {!compact&&<View style={s.labels}><Text style={s.muted}>{rawMax.toFixed(1)}</Text><Text style={s.muted}>{rows[0].value2!==null?'收缩压 / 舒张压':''}</Text></View>}
    <Svg width={width} height={height} onPress={e=>{
      const at=e.nativeEvent.locationX; const nearest=rows.reduce((a,b)=>Math.abs(x(a)-at)<Math.abs(x(b)-at)?a:b);setSelected(nearest.id);
    }}>
      {[0.25,0.5,0.75].map(t=><Line key={t} x1={0} x2={width} y1={height*t} y2={height*t} stroke={C.border} strokeDasharray="4 5"/>)}
      <Polyline points={rows.map(r=>`${x(r)},${y(r.value)}`).join(' ')} fill="none" stroke={C.green} strokeWidth={2.5}/>
      {rows.some(r=>r.value2!==null)&&<Polyline points={rows.filter(r=>r.value2!==null).map(r=>`${x(r)},${y(r.value2!)}`).join(' ')} fill="none" stroke={C.orange} strokeWidth={2.5}/>}
      {(compact?rows.slice(-1):rows.length>120?[rows[0],rows[rows.length-1],selectedRow]:rows).map(r=><React.Fragment key={r.id}>
        <Circle cx={x(r)} cy={y(r.value)} r={selectedRow.id===r.id?5:3} fill={C.green} stroke={C.surface} strokeWidth={1.5}/>
        {r.value2!==null&&<Circle cx={x(r)} cy={y(r.value2)} r={3} fill={C.orange}/>}
      </React.Fragment>)}
    </Svg>
    {!compact&&<><View style={s.labels}><Text style={s.muted}>{localDate(rows[0].measured_at).slice(0,10)}</Text><Text style={s.muted}>{localDate(rows[rows.length-1].measured_at).slice(0,10)}</Text></View><Text style={s.caption}>{caption}</Text></>}
  </View>;
}
