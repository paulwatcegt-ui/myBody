const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'.verification',name)));
const proof=read('android-v060.json'),fresh=read('android-v060-fresh.json');
if(!proof.passed||!proof.original050DataPreserved||!fresh.passed)throw Error('Complete upgrade and fresh-install proofs required');
const tests=fs.readFileSync(path.join(root,'.verification/tests-v060.log'),'utf8').match(/Tests:\s+(\d+) passed, (\d+) total/);if(!tests)throw Error('Passing unit tests required');
for(const file of ['brand-mark.png','brand-mark-dark.png']){const png=PNG.sync.read(fs.readFileSync(path.join(root,'assets',file)));if(png.data[3]!==0||!png.data.some((value,index)=>index%4===3&&value===255))throw Error('Brand mark transparency invalid');}
const apk=fs.readFileSync(path.join(root,'delivery/myBody-0.6.0-internal.apk')),hash=crypto.createHash('sha256').update(apk).digest('hex');
const report=`# myBody 0.6.0 验证记录

验证时间：${new Date().toISOString()}

## 交付变更

- 与 myGym 默认绿色统一：浅色 #34C759、深色 #30D158；实心绿底黑字，浅色小字使用 #217A35。
- 透明人物＋变化曲线标志，更新应用图标和浅深色系统启动资源。首个 React 布局后交接加载状态，无固定等待；加载失败可重试。
- 贴底导航顺序：总览、趋势、记录、照片、我的。中央 52dp 圆形记录按钮；普通选中项无大块背景，短促按压与淡入随减少动态效果关闭。
- 我的默认档案摘要，独立编辑弹窗，保存成功关闭，未保存退出确认。
- 我的右上角齿轮进入独立设置：外观、数据与备份、关于和开源许可。子页返回设置首页，再返回我的；设置不显示底部导航。
- 数据库与备份格式保持原样，主题和档案复用既有字段。

## 单元测试与类型

- ${tests[1]} 项测试通过，0 失败；TypeScript 类型检查通过。
- 新增摘要与空档案、编辑成功／失败、未保存修改保护、主题刷新保留草稿、设置返回栈、主题子页状态保留和导出回调验证。
- 验证五个导航顺序与中央动作、系统减少动态效果事件、慢加载不提前进入主界面、准备完成无固定等待、原生启动图释放及失败重试。
- 继续验证原有指标、血压、血糖、单位隔离、自动 BMI、照片、备份恢复、排序与主题持久化。
- 透明标志包含透明背景与不透明图形，资源检查通过。主按钮黑字与绿底继续满足文字对比度测试。

## 安卓实际验证

专用 AOSP API35 x86_64 模拟器；全部数据为测试数据。

- 从 0.5.0 覆盖安装，原始快照逐项核对：${proof.readingsPreserved} 条记录、${proof.photosPreserved} 张照片记录、指标设置、关注顺序和档案均保持一致。
- 浅深色冷启动与标志裁切截图检查通过；五个入口和中央记录动作正常。
- 档案默认折叠，编辑可继续／放弃未保存内容；保存后关闭并更新摘要。
- 设置没有底部导航，外观切换保持当前子页；返回顺序及关于／开源许可页面查看通过。
- 通过新设置入口实际导出 ZIP 与 CSV，恢复操作保留原有确认；ZIP 格式 ${proof.backupVersion}，含 ${proof.exportedReadings} 条原始记录及 ${proof.exportedPhotos} 张实际照片文件，CSV 包含自动 BMI。
- 模拟器减少动态效果开关下重复导航正常。
- 在隔离 Android 用户中实际首次安装：创建 ${fresh.metrics} 个预置指标、${fresh.readings} 条记录、${fresh.photos} 张照片；空档案可选填，打开后无修改可直接关闭。
- 隔离用户测试结束后已清理；再次核对 Owner 用户与原始 0.5.0 数据一致，未清空原用户数据。

## 构建与交付

- Expo54 / React Native0.81.5 / JDK17 / Android SDK36，Release 构建成功。
- com.mybody.app；versionName 0.6.0、versionCode 6；arm64-v8a 与 x86_64；${(apk.length/1024/1024).toFixed(1)} MiB。
- 原内测签名保持，APK Signature Scheme v2 验证通过，可以覆盖安装。
- SHA256：${hash}
- 源码、构建说明和测试脚本一并交付。截图见 delivery/screenshots/v060-*.png。

## 验证范围

- 尚未在用户实体手机验证。Android15 模拟器三键导航在手动覆盖系统主题时仍可能出现系统图标配色差异，字体、手势导航和厂商系统栏需真机复核。
- 系统启动屏采用手机系统外观，应用加载后采用保存的主题偏好；快速启动不会为展示品牌画面而延长等待。
- 恢复确认和真实 SQLite 备份恢复测试通过；本次未重复 0.1.0 已验证的全部系统文件选择器恢复操作与相机拍摄流程。
- 参考 myGym 的视觉原则与参数，在 React Native 中独立实现，未复制其 AGPL 实现代码。
`;
fs.writeFileSync(path.join(root,'docs/VALIDATION.md'),report);fs.writeFileSync(path.join(root,'delivery/VALIDATION-0.6.0.md'),report);
for(const file of fs.readdirSync(path.join(root,'.verification')).filter(n=>/^v060-.*\.png$/.test(n)&&!n.includes('debug'))){fs.copyFileSync(path.join(root,'.verification',file),path.join(root,'delivery/screenshots',file));}
console.log(`0.6.0 verified; APK SHA256 ${hash}`);
