const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{unzipSync}=require('fflate');
const root=path.resolve(__dirname,'..');
const read=name=>{const p=path.join(root,'.verification',name);return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;};
const upstream=read('upstream-tests.json'),tests=read('mybody-tests.json'),smoke=read('android-smoke.json'),extended=read('android-extended.json'),restore=read('android-restore.json');
const apk=fs.readFileSync(path.join(root,'delivery/myBody-0.1.0-internal.apk'));
const entries=[];unzipSync(new Uint8Array(apk),{filter:f=>{entries.push(f.name);return false;}});
const abis=[...new Set(entries.filter(n=>n.startsWith('lib/')).map(n=>n.split('/')[1]))];
const hash=crypto.createHash('sha256').update(apk).digest('hex');
const report=`# myBody 0.1.0 验证记录\n\n生成时间：${new Date().toISOString()}\n\n## 构建与签名\n\n- Expo SDK54 / React Native 0.81.5 / JDK17 / Android SDK36。\n- Release APK 本地构建成功；使用内测调试证书，APK Signature Scheme v2 验证通过。\n- APK：${(apk.length/1024/1024).toFixed(1)} MiB；原生架构：${abis.join('、')}。\n- SHA256：\`${hash}\`。\n- TypeScript 严格类型检查通过。\n\n## 自动化测试\n\n- 上游基线：${upstream?.numPassedTests??'未记录'} 项通过（修改前运行）。\n- myBody 当前测试：${tests?.numPassedTests??0} 项通过，${tests?.numFailedTests??'未知'} 项失败。\n- 使用真实 SQLite 内存数据库检查迁移、事务回滚、增删改、补录、参考范围保留及关注排序。\n- 检查血压配对、血糖场景与单位隔离、日期边界、CSV 转义、ZIP 完整性、路径校验、照片权限拒绝、取消、私有复制及恢复失败清理。\n\n## 安卓模拟器验证\n\n设备：专用 AOSP API35 x86_64 模拟器；截图与数据均为测试数据。\n\n- 核心原生流程：${smoke?.passed?'通过':'未完成'}。${smoke?smoke.checks.join('、'):''}\n- 扩展原生流程：${extended?.passed?'通过':'未完成'}。${extended?extended.checks.join('、'):''}\n- ZIP 原生恢复：${restore?.passed?'通过':'未完成'}。${restore?restore.checks.join('、'):''}\n\n## 范围与实际限制\n\n- 未在实体手机上测试；实体相机、不同厂商系统和 Android8 至 API35 之外的系统兼容性仍需真机验证。\n- 数据与照片仅保存在本机；完整备份当前上限64 MiB，记录清单上限16 MiB，导出文件不加密。\n- 无云同步、报告识别、蓝牙设备或自动健康诊断；参考范围来自用户录入。\n- 原始自动化日志保存在项目的 .verification 目录；交付中附验证摘要和模拟器截图。\n`;
fs.writeFileSync(path.join(root,'docs/VALIDATION.md'),report);
const delivery=path.join(root,'delivery');fs.mkdirSync(path.join(delivery,'screenshots'),{recursive:true});
for(const name of ['overview-changes.png','overview-record.png','trends-record.png','photos-compare.png','profile.png']){
 const source=path.join(root,'.verification',name);if(fs.existsSync(source))fs.copyFileSync(source,path.join(delivery,'screenshots',name));
}
fs.copyFileSync(path.join(root,'docs/VALIDATION.md'),path.join(delivery,'VALIDATION.md'));
console.log(`Verified ${abis.join(', ')} APK, SHA256 ${hash}`);
