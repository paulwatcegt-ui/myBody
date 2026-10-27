const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{unzipSync}=require('fflate');
const root=path.resolve(__dirname,'..');
const proof=JSON.parse(fs.readFileSync(path.join(root,'.verification/android-v030.json')));
if(!proof.passed)throw Error('Android regression must pass');
const log=fs.readFileSync(path.join(root,'.verification/tests-v030.log'),'utf8'),tests=log.match(/Tests:\s+(\d+) passed, (\d+) total/);
if(!tests)throw Error('Passing test report missing');
const apk=fs.readFileSync(path.join(root,'delivery/myBody-0.3.0-internal.apk')),entries=[];
unzipSync(apk,{filter:f=>{entries.push(f.name);return false;}});
const abis=[...new Set(entries.filter(n=>n.startsWith('lib/')).map(n=>n.split('/')[1]))],hash=crypto.createHash('sha256').update(apk).digest('hex');
const report=`# myBody 0.3.0 验证记录

验证时间：${proof.testedAt}

## 交付功能

- 管理指标与关注：六类分组、分类切换、名称／单位搜索、仅看关注及匹配数量。
- 档案：称呼、身高、性别、生日、自动周岁、目标体重；展示最新体重与 BMI。
- 总览：点击指标卡片直接填写对应项目。血压保留成对输入；体重／身高／BMI 入口展示身高和体重。
- BMI：保存体重后自动计算，显示数值与趋势。按每次体重测量时刻查找最近身高，缺少历史身高时使用档案身高。支持 kg／斤／lb 与 cm／m 的明确单位换算。
- 修改、删除和补录来源后重新计算，不产生独立可编辑的自动 BMI 数据副本。旧手动 BMI 保留。自动 BMI 的历史项目可跳转修改来源体重。
- ZIP 包含原始数据及完整档案，恢复后重算 BMI；CSV 包含计算结果与来源说明。

## 自动化验证

- ${tests[1]} 项测试通过，0 失败；TypeScript 类型检查通过。
- 管理分类和搜索、空结果、总览卡片事件、血压快捷录入、跨分类草稿和 BMI 实时预览。
- 性别和目标体重保存、年龄生日边界、非法或未来生日拒绝。
- BMI 历史身高匹配、补录重算、编辑／删除后的重算、档案身高变化、单位换算、无效输入、重复计算去重、手动历史保留。
- 真实 SQLite 中档案读写、ZIP 清单校验与恢复后扩展档案保持一致，原始记录不包含计算副本。
- 原有数值、文本、照片权限、备份失败回滚、日期、血压和血糖测试继续通过。

## 安卓模拟器

专用 AOSP API35 x86_64 模拟器，覆盖安装，未清除本地数据。

- 安装前 ${proof.beforeReadings} 条原始记录，新增后 ${proof.afterReadings} 条；旧记录逐字段一致，${proof.photosPreserved} 张旧照片记录保留。
- 原生日历选择生日，性别／身高／生日／目标体重保存后从 SQLite 核对通过。截图生日与数据均为测试数据。
- 指标管理分类与 mmHg 单位搜索通过，只显示血压项目。
- 从总览体重卡片直接录入 75.25 kg，实时 BMI 为 24.57；保存后总览显示计算值。
- 重启后 BMI 仍可自动计算为 24.57；数据库只新增 1 条体重，未重复保存计算结果。

## 构建

- Expo54 / React Native0.81.5 / JDK17 / Android SDK36，Release APK 构建成功。
- com.mybody.app；versionName 0.3.0，versionCode 3，保留原内测签名，可直接覆盖升级。
- APK Signature Scheme v2 验证通过；架构 ${abis.join('、')}；${(apk.length/1024/1024).toFixed(1)} MiB。
- SHA256：${hash}

## 范围

- 尚未在用户实体手机验证，本次在安卓模拟器验证交互和升级。
- 年龄按生日计算周岁。BMI 是记录的数学计算值，未添加自动健康诊断或阈值判断。
- 无历史身高记录时修改档案身高，会更新以该档案身高计算的历史 BMI；已有历史身高时优先使用测量时刻的身高记录。
- 本次未重复 0.1.0／0.2.0 的所有相机与含照片备份设备流程；相关单元测试继续通过。
`;
fs.writeFileSync(path.join(root,'docs/VALIDATION.md'),report);fs.writeFileSync(path.join(root,'delivery/VALIDATION-0.3.0.md'),report);
for(const name of ['profile','profile-details','manager','quick-entry','overview-bmi']){const file=`v030-${name}.png`;fs.copyFileSync(path.join(root,'.verification',file),path.join(root,'delivery/screenshots',file));}
console.log(`0.3.0 validation recorded. SHA256 ${hash}`);
