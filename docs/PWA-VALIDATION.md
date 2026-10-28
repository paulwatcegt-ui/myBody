# PWA 验证记录 — 2026-10-28

- Expo SDK 54 Web 生产构建成功，独立输出 dist-pwa。
- TypeScript 检查通过。
- 原有 Jest：15 个测试套件，95 项测试全部通过。
- Chrome 390×844 视口：14 组场景通过，无 pageerror：启动、IndexedDB 持久化、记录编辑删除与文本指标、批量事务回滚、档案持久化、照片持久化、ZIP v2/v1 格式兼容、损坏 ZIP 拒绝、写入失败保留旧数据、ZIP 下载后文件恢复、离线刷新读取照片、相册上传转 JPEG、取消删除、手动 Service Worker 更新保留数据。
- 测试脚本 scripts/test-pwa.cjs 在独立浏览器上下文运行。事务验证使用实际 IndexedDB；格式验证复用两平台的校验及 ZIP 模块。
- 验证图像：.verification/pwa-photos.png。截图已查看，窄屏照片页布局正常。

## 尚未完成的设备验收

未连接真实 iPhone，也未运行桌面 WebKit。本记录不代表 Safari 真机通过。待确认：主屏幕安装、飞行模式冷启动、iPhone 实拍及方向、系统文件分享与 PDF 保存、Android 设备与 iPhone 的双向 ZIP 恢复。此次没有重建 Android APK；现有原生测试通过。

写入失败测试为事务内主动中止，未填满物理设备空间。大数据量与接近 64 MB 的备份仍需设备压力测试。

## 交付

运行 npm run build:pwa 后运行 npm run package:pwa。delivery/pwa 的 inventory.json 和 SHA256SUMS.txt 对应最终静态文件与 ZIP；ZIP 根目录含 index.html。上传已有 Cloudflare Pages Direct Upload 项目或创建独立项目，无需 API、账号或服务端绑定。
