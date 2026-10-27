// myBody's measurement layer builds on PulseSense's typed, local-first records.
export type Category = 'body' | 'health' | 'fitness' | 'lifestyle' | 'lab' | 'custom';
export type ValueType = 'number' | 'text';
export const FREQUENCIES = ['随时', '每天', '每周', '每月'] as const;
export type Pose = 'front' | 'side' | 'back';
export type Context = '' | 'fasting' | 'postmeal' | 'random';
export interface Metric {
  id: string; name: string; category: Category; unit: string;
  favorite: number; sort_order: number; active: number;
  reference_min: number | null; reference_max: number | null;
  value_type?: ValueType; frequency?: string;
}
export interface Reading {
  id: string; metric_id: string; measured_at: string; value: number;
  value2: number | null; unit: string; context: Context; note: string;
  reference_min: number | null; reference_max: number | null;
  // Old databases require numeric value NOT NULL. Text entries use 0 internally;
  // text_value is the actual value and is never interpreted as a numeric sample.
  text_value?: string | null;
  derived_from?: string;
}
export interface Photo { id: string; uri: string; pose: Pose; taken_at: string; note: string }
export const SEX_NAMES = {unspecified:'未填写',female:'女',male:'男',other:'其他'} as const;
export interface Profile { name: string; height: string; birthday: string; sex?: keyof typeof SEX_NAMES; target_weight?:string; theme?:'system'|'light'|'dark' }
export interface Snapshot { metrics: Metric[]; readings: Reading[]; photos: Photo[]; profile: Profile }
export const CATEGORY_NAMES: Record<Category, string> = { body: '身体档案', health: '健康监测', fitness: '健身与运动', lifestyle: '生活状态', lab: '体检报告', custom: '自定义指标' };
export const CATEGORY_DESCRIPTIONS: Record<Category,string> = {
 body:'身高、体重、BMI、身体围度、身体成分、进度照片',health:'血压、心率、体温、血氧、血糖及其他健康指标',
 fitness:'训练重量、次数、训练量、有氧能力、运动表现',lifestyle:'睡眠、步数、饮水、饮食、疲劳程度',
 lab:'检查日期、检测结果、单位、参考范围、历史对比',custom:'自定义名称、单位、数值或文本类型、记录频率和图表',
};
export const POSE_NAMES: Record<Pose, string> = { front: '正面', side: '侧面', back: '背面' };
export const CONTEXT_NAMES: Record<Context, string> = { '': '未标注', fasting: '空腹', postmeal: '餐后', random: '随机' };
const presets: [string, string, Category, string][] = [
  ['weight', '体重', 'body', 'kg'], ['body_fat', '体脂率', 'body', '%'], ['muscle', '肌肉量', 'body', 'kg'],
  ['height','身高','body','cm'],['bmi','BMI','body','kg/m²'],['body_water','身体水分','body','%'],['bone_mass','骨量','body','kg'],['visceral_fat','内脏脂肪等级','body','级'],
  ['waist', '腰围', 'body', 'cm'], ['chest', '胸围', 'body', 'cm'], ['hips', '臀围', 'body', 'cm'],
  ['neck', '颈围', 'body', 'cm'], ['shoulders', '肩围', 'body', 'cm'],
  ...(['arm', 'forearm', 'thigh', 'calf'] as const).flatMap((part) =>
    (['left', 'right'] as const).map((side): [string, string, Category, string] => [
      `${side}_${part}`, `${side === 'left' ? '左' : '右'}${({ arm: '上臂围', forearm: '前臂围', thigh: '大腿围', calf: '小腿围' })[part]}`, 'body', 'cm'])),
  ['bp', '血压', 'health', 'mmHg'], ['pulse', '心率', 'health', '次/分'], ['glucose', '血糖', 'health', 'mmol/L'],
  ['spo2', '血氧', 'health', '%'], ['temperature', '体温', 'health', '℃'],
  ['tc', '总胆固醇', 'lab', 'mmol/L'], ['tg', '甘油三酯', 'lab', 'mmol/L'],
  ['hdl', 'HDL 胆固醇', 'lab', 'mmol/L'], ['ldl', 'LDL 胆固醇', 'lab', 'mmol/L'],
  ['training_weight','训练重量','fitness','kg'],['reps','训练次数','fitness','次'],['sets','训练组数','fitness','组'],['training_volume','训练量','fitness','kg'],
  ['exercise_minutes','运动时长','fitness','分钟'],['distance','运动距离','fitness','km'],['vo2max','有氧能力 VO₂max','fitness','ml/kg/min'],['pace','配速','fitness','分钟/km'],
  ['sleep_hours','睡眠时长','lifestyle','小时'],['steps','步数','lifestyle','步'],['water_intake','饮水量','lifestyle','ml'],['calories','饮食热量','lifestyle','kcal'],['fatigue','疲劳程度','lifestyle','分（0–10）'],
  ['uric_acid','尿酸','lab','μmol/L'],['alt','丙氨酸氨基转移酶 ALT','lab','U/L'],['ast','天门冬氨酸氨基转移酶 AST','lab','U/L'],['creatinine','肌酐','lab','μmol/L'],['hba1c','糖化血红蛋白 HbA1c','lab','%'],
];
export const PRESETS: Metric[] = presets.map<Metric>(([id, name, category, unit], i) => ({
  id, name, category, unit, favorite: ['weight', 'body_fat', 'waist', 'bp', 'glucose', 'pulse'].includes(id) ? 1 : 0,
  sort_order: i, active: 1, reference_min: null, reference_max: null,value_type:'number',frequency:'随时',
})).concat([
 {id:'exercise_notes',name:'训练项目与运动表现',category:'fitness',unit:'',favorite:0,sort_order:100,active:1,reference_min:null,reference_max:null,value_type:'text',frequency:'随时'},
 {id:'diet_notes',name:'饮食记录',category:'lifestyle',unit:'',favorite:0,sort_order:101,active:1,reference_min:null,reference_max:null,value_type:'text',frequency:'每天'},
 {id:'sleep_notes',name:'睡眠状态',category:'lifestyle',unit:'',favorite:0,sort_order:102,active:1,reference_min:null,reference_max:null,value_type:'text',frequency:'每天'},
] as Metric[]);
export function isTextReading(r:Reading):boolean{return r.text_value!==null&&r.text_value!==undefined;}
export function formatNumber(value:number):string {return Number.isFinite(value)?String(Number(value.toPrecision(12))):'—';}
export function readingValue(r:Reading):string {return isTextReading(r)?r.text_value!:formatNumber(r.value)+(r.value2===null?'':` / ${formatNumber(r.value2)}`);}
export function uid(): string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
export function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}
export function localDate(value: string): string {
  const d = new Date(value); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function parseLocalDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) throw new Error('日期格式请使用 YYYY-MM-DD HH:mm');
  const d = new Date(value.replace(' ', 'T') + ':00');
  if (!Number.isFinite(d.getTime()) || localDate(d.toISOString()) !== value) throw new Error('请输入有效的日期与时间');
  return d.toISOString();
}
export function numberInput(text: string, label = '数值'): number {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim())) throw new Error(`${label}必须是有效数字`);
  const value = Number(text); if (!Number.isFinite(value)) throw new Error(`${label}必须是有限数字`); return value;
}
export function validateReading(r: Reading): void {
  if(isTextReading(r)){
    if(!r.id||!r.metric_id||!isDate(r.measured_at)||typeof r.text_value!=='string'||!r.text_value.trim()||r.text_value.length>20000||r.value!==0||r.value2!==null||r.reference_min!==null||r.reference_max!==null||r.context!=='')throw new Error('文本记录内容或格式无效');return;
  }
  if (!r.id || !r.metric_id || !isDate(r.measured_at) || !r.unit.trim() || !Number.isFinite(r.value)) throw new Error('记录的时间、数值或单位无效');
  if (!['', 'fasting', 'postmeal', 'random'].includes(r.context)) throw new Error('血糖测量场景无效');
  if (r.value2 !== null && !Number.isFinite(r.value2)) throw new Error('第二项数值无效');
  if (r.metric_id === 'bp' && (r.value2 === null || r.value <= 0 || r.value2 <= 0)) throw new Error('血压需要同时填写收缩压和舒张压，且均大于 0');
  for (const v of [r.reference_min, r.reference_max]) if (v !== null && !Number.isFinite(v)) throw new Error('参考范围必须是有效数字');
  if (r.reference_min !== null && r.reference_max !== null && r.reference_min > r.reference_max) throw new Error('参考下限不能大于上限');
}
export function series(readings: Reading[], metric: string, days = 0, unit?: string, context?: Context, now = Date.now()): Reading[] {
  const cutoff = days ? now - days * 86400000 : -Infinity;
  return readings.filter(r => !isTextReading(r) && r.metric_id === metric && Date.parse(r.measured_at) >= cutoff && Date.parse(r.measured_at) <= now &&
    (unit === undefined || r.unit === unit) && (context === undefined || r.context === context))
    .sort((a, b) => Date.parse(a.measured_at) - Date.parse(b.measured_at) || a.id.localeCompare(b.id));
}
export function history(readings:Reading[],metric:string,days=0,now=Date.now()):Reading[]{return readings.filter(r=>r.metric_id===metric&&Date.parse(r.measured_at)<=now&&(!days||Date.parse(r.measured_at)>=now-days*86400000)).sort((a,b)=>Date.parse(a.measured_at)-Date.parse(b.measured_at)||a.id.localeCompare(b.id));}
export function latestPair(readings: Reading[], metric: string): Reading[] {
  const all = history(readings, metric); const last = all[all.length-1];
  return last ? all.filter(r => r.unit === last.unit && r.context === last.context).slice(-2) : [];
}
export function delta(first: number, last: number): string {
  const n = Math.round((last - first) * 1000) / 1000; return `${n > 0 ? '+' : ''}${n}`;
}
export function csv(snapshot: Snapshot): string {
  const cell = (v: unknown) => { let s = String(v ?? ''); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  return '\uFEFF' + [['指标标识', '指标', '测量时间', '数值', '第二读数', '单位', '场景', '参考下限', '参考上限', '备注'],
    ...[...snapshot.readings].sort((a,b) => a.measured_at.localeCompare(b.measured_at)).map(r => [r.metric_id, snapshot.metrics.find(m => m.id === r.metric_id)?.name, localDate(r.measured_at), isTextReading(r)?r.text_value:r.value, r.value2, r.unit, CONTEXT_NAMES[r.context], r.reference_min, r.reference_max, r.note])]
    .map(row => row.map(cell).join(',')).join('\r\n');
}
