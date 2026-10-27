# myBody 0.5.0 界面设计

参考 [Apple Human Interface Guidelines — Color](https://developer.apple.com/design/human-interface-guidelines/color) 与 [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) 的颜色层级和深浅色适配原则，在 Android 上保留原生日期、系统字体和系统返回行为。

- 信息层级：小号品牌标识、明确页面标题、轻量分组标题、突出读数、弱化辅助说明。
- 中性底色与分组卡片：浅色使用系统分组灰，深色使用黑底与分层深灰；减少大面积强调色和描边。
- 操作：强调色用于可点击内容，底部导航集中呈现五个入口，保留指标快捷录入和排序。
- 密度：关注仍为紧凑双列；窄屏和较大系统字体转为单列；长文本与单位可换行。
- 主题：语义颜色集中定义于 `src/mybody/theme.tsx`，背景、卡片、输入、标签、分隔线、图表和按钮分别设色；不直接反转图片。
- 偏好：`profile.theme` 保存 system／light／dark，旧档案缺少此字段时按 system 处理。手动模式覆盖系统，跟随系统在应用打开时也响应变化。保存档案会保留主题，切换主题不会清空未保存的档案表单。
- 状态栏、Android 系统导航按键颜色和原生日期选择器同步外观。关闭强制导航栏对比色，以免手动深色时出现浅色按键区域；Android 15 模拟器的系统导航栏行为仍以实际测试为准。
- 不使用 Apple 专属字体或私有 UI 资源；本次借鉴设计原则，未移植苹果系统控件。

自动测试检查浅深色主要文字、辅助文字、输入提示和按钮文字的对比度，以及切换、持久化、备份和输入保留；交付截图来自实际 Android 模拟器运行。

Android15 模拟器中，三键导航区域背景已能切换，按键图标颜色仍未能可靠响应手动主题；[Expo NavigationBar 文档](https://docs.expo.dev/versions/v54.0.0/sdk/navigation-bar/)注明这类模拟器限制，最终效果需在实体设备复核。应用自己的底部导航和状态栏已完成主题验证。
