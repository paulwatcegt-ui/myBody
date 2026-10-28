# myBody

安卓离线身体变化记录 APP。基于 PulseSense 的 MIT 源码，使用 React Native / Expo SDK 54、TypeScript、SQLite 和 Zustand。

## 使用

安装 `delivery/myBody-0.6.0-internal.apk`。支持 Android 8.0 及以上，包含 arm64-v8a 与 x86_64。内测包采用调试证书签名、Release 离线打包；不需要 Metro 服务或账号。正式发布时请配置自己的发布证书。

- **总览**：关注指标、最新值、与上次的变化、近 30 天曲线；关注顺序可调整。
- **记录**：一次填写多项；支持补录、编辑和删除。血压成对填写，血糖记录测量场景。
- **趋势**：7 / 30 / 90 天与全部历史；血压双线；按单位、血糖场景分别查看。
- **照片**：正面、侧面、背面分类；两张同角度照片并排比较。
- **我的**：个人资料、自定义指标、完整 ZIP 备份与恢复、CSV 导出、开源声明。

记录按身体档案、健康监测、健身与运动、生活状态、体检报告、自定义指标六类组织。新增身高、BMI、身体成分、训练重量／次数／组数／训练量、有氧能力、运动表现、睡眠、步数、饮水、饮食和疲劳程度等项目。BMI 根据体重及测量时间当时的身高自动计算，未有历史身高记录时使用档案身高；支持 kg／斤／lb 体重和 cm／m 身高的明确换算。修改、删除与补录来源后会重新计算，不把计算值重复写入原始记录。体检指标手动录入，每次记录可填写不同的参考范围。

日期通过原生日历和 24 小时时钟选择，支持现在／今天／昨天快捷补录。自定义指标支持数值或文本、每天／每周／每月等记录频率；数值绘图，文本按时间线查看。频率用于记录提示，不含系统定时通知。

0.6.0 可直接覆盖安装 0.1.0／0.2.0／0.3.0／0.4.0／0.5.0，保留原来的记录与照片。数据库迁移只新增字段与预置项目；备份格式升级为 v2，兼容导入 v1。

照片复制到应用私有目录。ZIP 包含指标、记录、档案、关注设置、照片及完整性校验；恢复整体替换本机数据，失败时保留原数据。当前备份上限 64 MB，导出文件不加密，卸载前请备份。CSV 仅含指标记录。

## 0.6.0 新增

- 统一 myGym 默认绿色：浅色 #34C759、深色 #30D158；实心按钮黑字，浅色小号操作文字使用 #217A35。
- 透明“人物＋变化曲线”启动标志和更新的应用图标；系统启动图与真实加载状态衔接，不人为等待。
- 导航顺序为总览／趋势／记录／照片／我的，记录置于中央绿色圆钮；普通选中项不再出现大块底色。短促按压反馈随系统减少动态效果设置关闭。
- 我的默认显示档案摘要，点击编辑弹窗填写；保存成功后关闭，未保存修改退出前需确认。
- 我的右上角齿轮进入设置，集中放置外观、备份恢复／CSV 导出、关于及开源声明。设置页不显示底部导航，子页先返回设置首页。
- 沿用原数据与 v2 备份格式，无新增数据库字段；指标与关注管理继续在我的和总览访问。

## 0.5.0 新增

- 参考 Apple Human Interface Guidelines 的信息层级与动态颜色原则，重做标题、分组卡片、表单、图表与底部导航，保留紧凑指标布局与排序。设计说明见 docs/DESIGN.md。
- 设置 → 外观：浅色模式、深色模式、跟随系统；默认跟随系统，切换立即生效并保存在本地档案，备份恢复也保留选择。
- 五个页面、管理和录入弹窗、输入框、图表与系统栏统一适配主题；不清空正在编辑的档案内容。
- 备注提示改为“例如：训练情况，报告说明，以及一切想记录下来的。。。。。”。

## 0.4.0 新增

- 总览关注指标使用紧凑双列卡片；窄屏或大字体自动切换单列，保留最新值、日期和变化值，完整曲线在趋势查看。
- 总览的“排序”入口提供上移／下移，立即保存并同步到趋势页；不改变关注选择或历史记录。
- 趋势仅显示已关注且启用的指标；没有关注时显示引导，取消选中项后自动切换到可见指标。
- 记录和照片日期快捷按钮只保留“今天／昨天”，原生日历和时钟继续可用。

## 0.3.0 新增

- 指标管理按六类分组，支持分类、名称／单位搜索及仅看关注。
- 档案增加性别、由生日计算的周岁、目标体重；展示最新体重与 BMI。
- 点击总览指标卡片直接录入对应项目，血压保留双值，体重／身高／BMI 快捷入口只展示身高与体重。
- BMI 自动计算并生成趋势，无需手填；旧手动 BMI 保留，自动项可跳转修改来源体重。
- ZIP 仅保存原始数据与档案，恢复后重算 BMI；CSV 同时导出带来源说明的计算结果。年龄与 BMI 不需要新增手填项目。

## 本地开发与构建（Windows）

需要 Node.js 20.19.4 或以上。便携工具、SDK 和缓存放在 `.tooling/` 下，不纳入源码归档。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bootstrap-tools.ps1
node .tooling/npm/package/bin/npm-cli.js ci --no-audit --no-fund
node .tooling/npm/package/bin/npm-cli.js run typecheck
node .tooling/npm/package/bin/npm-cli.js test
$env:CI = '1'
$env:EXPO_NO_TELEMETRY = '1'
node node_modules/expo/bin/cli prebuild --platform android --no-install
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

构建脚本使用临时 M: 路径、UTF-8 Java 输出和自动链接路径规范化，处理中文目录中的 Windows 原生工具兼容问题。已占用的其他项目盘符不会被覆盖或解除。首次构建需要联网下载依赖。

`scripts/patch-toolchain.cjs` 处理 Expo SDK54 自动链接未检查盘符根目录的问题；`plugins/withMyBodyBuild.cjs` 保证原生依赖和项目使用同一盘符。

上述脚本产出可直接离线运行的 Release 内测包。Metro 热重载需要另行构建 Debug 版本；已交付的内测 APK 不依赖或连接 Metro。

## 数据与源码

- `src/mybody/`：中文页面、领域模型、统一指标数据接口、照片、备份及测试。
- `src/db/`：复用的 SQLite 连接与迁移；增加 `mb_*` 表及独立的 myBody 版本标记。
- `scripts/`、`plugins/`：工具安装、图标生成、Windows 原生构建、测试设备和交付打包。
- 上游其余源文件保留作来源追溯，不进入应用入口和类型检查。用药、急救、定位、健康平台同步未接入 myBody，相关原生依赖已移除。
- 原始说明：`docs/PulseSense-README.md`。验证记录：`docs/VALIDATION.md`。

首版不含服务端、账号、云同步、报告识别、蓝牙接入或自动健康诊断。

## 来源与许可

上游：[SolarisXD/PulseSense](https://github.com/SolarisXD/PulseSense)，基线 `d05e59f082d68d85b2c363dff877a55c6fbf0c2e`。

保留根目录 `LICENSE` 中的 `Copyright (c) 2026 PulseSense` 及 MIT 许可全文。改造了数据库、查询、图表交互及备份设计；WeightTrack、Health Tracker Reports 仅用于功能参考。第三方声明见 `THIRD_PARTY_NOTICES.json`。

## iPhone 网页应用（PWA）

新增独立纯本地 Web 构建，支持 iOS 17+ Safari 和 Cloudflare Pages 静态上传。运行 `npm run build:pwa`、`npm run package:pwa`，上传 `delivery/pwa/myBody-PWA-Cloudflare.zip`。安装、数据边界和真机验收见 [PWA 说明](docs/PWA.md)。
