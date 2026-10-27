import { create } from 'zustand';
import { Snapshot } from './domain';
import { initialize, readSnapshot } from './repository';
import {withAutomaticBMI} from './calculations';
interface State extends Snapshot { ready: boolean; error: string; refresh: () => Promise<void>; boot: () => Promise<void> }
export const useBody = create<State>((set,get) => ({
  metrics: [], readings: [], photos: [], profile: { name:'',height:'',birthday:'' }, ready: false, error: '',
  refresh: async () => { const snapshot=await readSnapshot();set({...snapshot,readings:withAutomaticBMI(snapshot.readings,snapshot.profile)}); },
  boot: async () => {
    try { await initialize(); await get().refresh(); set({ ready: true, error: '' }); }
    catch (e) { set({ error: e instanceof Error ? e.message : '本地数据库初始化失败' }); }
  },
}));
