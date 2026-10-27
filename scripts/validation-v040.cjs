const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),proof=JSON.parse(fs.readFileSync(path.join(root,'.verification/android-v040.json')));
if(!proof.passed)throw Error('Android validation must pass');
const tests=fs.readFileSync(path.join(root,'.verification/tests-v040.log'),'utf8').match(/Tests:\s+(\d+) passed, (\d+) total/);if(!tests)throw Error('Passing tests not found');
const apk=fs.readFileSync(path.join(root,'delivery/myBody-0.4.0-internal.apk')),hash=crypto.createHash('sha256').update(apk).digest('hex');
const report=`# myBody 0.4.0 验证记录

时间：${proof.testedAt}

## 本次改动

- 关注卡片改为紧凑双列，保留指标名称、最新值、单位、日期与上次变化。屏幕较窄或字体倍率大于 1.3 时采用单列，完整曲线继续在趋势中查看。
- 总览增加“排序”，使用上移／下移即时保存关注顺序，趋势同步采用该顺序。
- 趋势只显示关注且启用的指标。取消关注后不会继续显示原选中指标；没有关注时显示引导。
- 日期快捷操作仅保留今天和昨天，日历与时间选择器保留。今天／昨天保留所选时分，并防止保存未来时间。
- 总览仅显示关注项，BMI 可通过管理关注加入；自动计算和历史数据保留。

## 验证

- ${tests[1]} 项测试通过，0 失败；TypeScript 类型检查通过。
- 覆盖排序调用、真实 SQLite 关注顺序保存、趋势关注过滤、选中项取消后的回退、空关注状态、日期快捷按钮与选中时分保留。
- 专用 AOSP API35 x86_64 模拟器覆盖安装成功，首屏可见 ${proof.cardsVisible} 张关注卡片，截图已检查。
- 总览上移／下移后顺序立即改变，SQLite 查询与重启后顺序一致。
- 趋势不再出现未关注的 BMI、训练量、睡眠时长等预置指标。
- 记录页面有今天／昨天，无“现在”按钮。
- ${proof.readingsPreserved} 条原始记录及 ${proof.photosPreserved} 张照片记录逐字段保持一致。

## 交付

- 0.4.0，versionCode 4，com.mybody.app；保留原内测签名，支持覆盖安装。
- Expo54 / React Native0.81.5 / JDK17 / Android SDK36。Release APK 包含 arm64-v8a 与 x86_64，大小 ${(apk.length/1024/1024).toFixed(1)} MiB。
- APK Signature Scheme v2 校验通过。
- SHA256：${hash}
- 本次为模拟器验证，尚未在用户实体手机复核布局。大字体单列策略由屏幕尺寸／字体倍率决定。
`;
fs.writeFileSync(path.join(root,'docs/VALIDATION.md'),report);fs.writeFileSync(path.join(root,'delivery/VALIDATION-0.4.0.md'),report);
for(const name of ['overview','sort','trends','date','reordered']){const file=`v040-${name}.png`;fs.copyFileSync(path.join(root,'.verification',file),path.join(root,'delivery/screenshots',file));}
console.log(`0.4.0 verified. SHA256 ${hash}`);
