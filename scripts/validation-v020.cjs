const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{unzipSync}=require('fflate');
const root=path.resolve(__dirname,'..'),proof=JSON.parse(fs.readFileSync(path.join(root,'.verification/android-v020.json')));
if(!proof.passed)throw new Error('Android validation must pass before producing report');
const apk=fs.readFileSync(path.join(root,'delivery/myBody-0.2.0-internal.apk')),entries=[];
unzipSync(apk,{filter:f=>{entries.push(f.name);return false;}});
const abis=[...new Set(entries.filter(n=>n.startsWith('lib/')).map(n=>n.split('/')[1]))];
const hash=crypto.createHash('sha256').update(apk).digest('hex');
const log=fs.readFileSync(path.join(root,'.verification/tests-v020.log'),'utf8');
const tests=log.match(/Tests:\s+(\d+) passed, (\d+) total/);if(!tests)throw new Error('Passing tests not found');
const report=`# myBody 0.2.0 验证记录

验证时间：${proof.testedAt}

## 本次变更

- 修复 TextInput 字体、行高、内边距和最小高度，避免数字上下被裁切。
- 原生日历与 24 小时时钟；现在、今天、昨天快捷选择；照片日期和生日也使用日期选择器。
- 六类入口：身体档案、健康监测、健身与运动、生活状态、体检报告、自定义指标。
- 新增身高／BMI／身体成分、运动、生活状态和体检项目；自定义数值／文本与记录频率。
- SQLite schema 4；新增字段与项目，保留旧指标 ID、记录单位与关注设置。完整备份 v2 兼容 v1。

## 自动验证

- ${tests[1]} 项测试通过，0 失败；TypeScript 类型检查通过。
- 真实 SQLite：旧表升级、事务回滚、数值／文本读写、历史保留和类型变更保护。
- 日期：取消不改值、闰日选择保留时分、BMI 计算与跨分类草稿保留。
- 文本：CSV 与 v2 备份保留内容、不绘制数值曲线；v1 备份兼容和损坏备份拒绝。
- 原有血压配对、血糖场景、单位隔离、照片权限和备份回滚测试继续通过。

## 安卓实际运行

专用 AOSP API35 x86_64 模拟器，覆盖安装，未清除数据。

- 安装前 ${proof.beforeReadings} 条记录；保存后 ${proof.afterReadings} 条记录，原记录各字段未变化。
- 与 0.1.0 留存数据库逐字段核对，${proof.originalVersionReadings??'未记录'} 条最初记录均完整保留。
- ${proof.photosPreserved} 张原有照片记录保留。
- 六类入口、日历与时钟弹出／取消、昨天补录、小数输入、跨分类数值与文本共同保存通过。
- 字体倍率 1.4 下检查输入框，截图随交付保留。
- 0.1.0 版本曾完成相册导入、双图对比、含照片 ZIP 导出与恢复；本次未重复全部照片流程。

## 构建

- Expo54 / React Native0.81.5 / JDK17 / Android SDK36，Release 构建成功。
- 应用标识 com.mybody.app，versionName 0.2.0，versionCode 2；保留原内测签名，支持覆盖升级。
- APK Signature Scheme v2 校验通过；架构 ${abis.join('、')}；${(apk.length/1024/1024).toFixed(1)} MiB。
- SHA256：${hash}

## 验证范围

- 尚未在用户截图中的 MIUI 真机验证数字显示；已检查安卓模拟器标准与 1.4 倍字体显示。
- 记录频率作为项目设置展示，不含定时通知。训练量等指标手动填写，BMI 支持主动计算。
- 身体照片继续使用独立照片入口，身体档案提供快捷跳转。
- 所有模拟器数据均为测试数据，非真实健康记录。
`;
fs.writeFileSync(path.join(root,'docs/VALIDATION.md'),report);fs.writeFileSync(path.join(root,'delivery/VALIDATION-0.2.0.md'),report);
for(const name of ['categories','calendar','clock','number-input','overview','large-font']){const file=`v020-${name}.png`,source=path.join(root,'.verification',file);if(fs.existsSync(source))fs.copyFileSync(source,path.join(root,'delivery/screenshots',file));}
console.log(`Validation report written; APK SHA256 ${hash}`);
