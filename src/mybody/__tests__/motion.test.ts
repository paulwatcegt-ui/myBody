import {AccessibilityInfo} from 'react-native';
import {act,renderHook,waitFor} from '@testing-library/react-native';
import {useReducedMotion} from '../motion';
test('motion defaults safely and follows the system accessibility preference',async()=>{
 jest.spyOn(AccessibilityInfo,'isReduceMotionEnabled').mockResolvedValue(false);let changed:(value:boolean)=>void=()=>{};const remove=jest.fn();jest.spyOn(AccessibilityInfo,'addEventListener').mockImplementation((event,handler:any)=>{changed=handler;return {remove};});
 const {result,unmount}=renderHook(()=>useReducedMotion());await waitFor(()=>expect(result.current).toBe(false));act(()=>changed(true));expect(result.current).toBe(true);unmount();expect(remove).toHaveBeenCalled();jest.restoreAllMocks();
});
