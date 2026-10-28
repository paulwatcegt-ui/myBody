# myBody iPhone 网页应用

纯本地 PWA，支持 iOS 17+ Safari，以及桌面浏览器。无需账号、API 或云数据库；记录及照片保存在当前站点的 IndexedDB 中。

## 构建与交付

使用 Node.js 22 或以上（现有测试使用 node:sqlite），在项目根目录运行：

```text
npm ci
npm run typecheck
npm test
npm run build:pwa
npm run preview:pwa
npm run package:pwa
```

Windows 便携 npm 可使用 `node .tooling/npm/package/bin/npm-cli.js` 替代 `npm`。

预览地址为 http://127.0.0.1:4173 。部署目录为 `dist-pwa`，发布文件在 `delivery/pwa`：部署 ZIP、inventory.json、SHA256SUMS.txt 和本说明。

## 上传 Cloudflare Pages

1. 打开 Cloudflare 控制台的 Workers & Pages，创建 Pages 应用，选择上传静态文件（Direct Upload）。
2. 建议创建独立项目 `mybody-ios`；名称被占用时可使用自己的名称。
3. 上传 `myBody-PWA-Cloudflare.zip`，或拖入 `dist-pwa` 文件夹。ZIP 根目录直接有 index.html。
4. 发布后打开 Cloudflare 提供的 HTTPS 地址。无需设置构建命令、Functions、数据库绑定或环境变量。
5. 用 iPhone Safari 打开，选择分享 → 添加到主屏幕。建议安装后再开始正式记录。
6. 后续在同一个 Pages 项目创建新部署。不要为了升级创建新的正式站点；不同域名的数据独立。

包内 `_headers` 用于保持首页和 Service Worker 正常检查更新。打包脚本检查最多 1,000 个文件、单文件不超过 25 MiB。

## 保存、备份与离线

- 页面显示“可离线使用”后，核心资源缓存就绪。首次打开需要网络。浏览器清理缓存后需要重新联网准备。
- 记录、资料和照片在 IndexedDB 事务提交后才算保存完成。图片字节保存在同一数据库中，不依赖临时 blob 地址。
- 完整 ZIP 导出 v2，可导入安卓 v1/v2 备份；保留原有校验和 64 MB 上限。导出原始记录，导入后重新计算 BMI 和基础代谢。
- 恢复会整体替换本机数据。ZIP 和照片全部验证后才提交；校验或写入失败保留旧数据。
- 导出后点击“保存／分享”或“下载文件”，自行确认文件已放入“文件”、iCloud Drive 或其他外部位置。关闭分享不代表完成备份。
- PDF 先打开独立报告，再点击“打印／保存 PDF”，通过系统打印界面保存。
- 新版本提示需要主动确认才重新加载。请先保存表单；仅更新静态资源，不删除 IndexedDB。
- 清除网站数据、浏览器存储回收等情况可能删除全部本机数据。请定期导出 ZIP；本地副本不等于外部备份。
- Safari 标签页与主屏幕应用不能假定共享数据。更换域名前先导出，在新地址恢复并重新添加主屏幕。

## iPhone 真机待验收

自动化结果见仓库验证记录。以下项目必须在实际 iPhone 完成，桌面模拟不算真机通过：

- Safari 添加主屏幕，重新打开后记录、主题、照片保留。
- 出现离线就绪提示后开启飞行模式，关闭再启动，录入记录并查看照片和趋势。
- 拍照与相册选择，检查竖拍方向、照片对比与删除。
- 导出到“文件”，关闭应用后重新选择 ZIP 导入；安卓与网页备份双向导入。
- 导出中文 CSV、TXT，打印报告并保存 PDF。
- 新部署出现更新提示后确认，检查记录和照片仍完整。

本项目复用 myBody 原有 MIT 代码与品牌素材。现有产品官网、Android 包名及构建入口独立保留。

## 浏览器自动化复核

构建后运行 `node scripts/test-pwa.cjs`。需要可用的 Playwright（可用 `PLAYWRIGHT_MODULE` 指定已安装模块路径）和 Chrome；`CHROME_PATH` 可指定浏览器。脚本在本机 4187 端口启动临时预览，使用隔离的测试浏览器数据，测试结束后恢复临时修改的 Service Worker。它不代表 iPhone Safari 真机验证。
