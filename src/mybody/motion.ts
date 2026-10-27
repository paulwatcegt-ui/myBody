import {useEffect,useState} from 'react';
import {AccessibilityInfo} from 'react-native';
export function useReducedMotion(){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduced(value);}).catch(()=>{});const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{mounted=false;listener.remove();};},[]);
 return reduced;
}
