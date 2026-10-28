import {Metric,CATEGORY_NAMES,FREQUENCIES} from './domain';
export function validateMetric(m: Metric): void {
  if(['bmi','bmr'].includes(m.id)&&m.value_type==='text')throw new Error('自动计算的数值指标不能切换为文本');
  if (!m.id || !m.name.trim() || (m.value_type!=='text'&&!m.unit.trim()) || m.name.length > 60 || m.unit.length > 24 || !(m.category in CATEGORY_NAMES)) throw new Error('请填写指标名称、分类和单位');
  if(m.value_type!==undefined&&!['number','text'].includes(m.value_type))throw new Error('指标类型无效');
  if(m.frequency!==undefined&&!(FREQUENCIES as readonly string[]).includes(m.frequency))throw new Error('记录频率无效');
  for (const n of [m.reference_min,m.reference_max]) if (n !== null && !Number.isFinite(n)) throw new Error('参考范围必须是有效数字');
  if (m.reference_min !== null && m.reference_max !== null && m.reference_min > m.reference_max) throw new Error('参考下限不能大于上限');
}
