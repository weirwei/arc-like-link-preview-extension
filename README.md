# Arc-like Link Preview Extension

一个模仿 Arc 浏览器链接预览体验的 Chromium 扩展。  
An Arc-like link preview extension for Chromium-based browsers.

它会拦截页面中的链接点击，在当前页面内以浮层方式打开预览，而不是立刻跳转或新开标签页。  
It intercepts link clicks and opens them in an in-page overlay preview instead of navigating immediately or opening a new tab.

## 功能特性 | Features

- 在页面内以浮层 `iframe` 预览链接内容  
  Preview links inside an overlay `iframe`
- 支持两种拦截模式  
  Supports two interception modes
- `newTabOnly`：只拦截原本会在新标签页打开的链接  
  `newTabOnly`: only intercept links that would normally open in a new tab
- `all`：拦截普通左键点击链接  
  `all`: intercept normal left-click link navigation
- 支持点击遮罩、关闭按钮或 `Esc` 关闭预览  
  Close preview by backdrop click, close button, or `Esc`
- 支持用快捷键将当前预览直接在新标签页打开  
  Open the current preview in a new tab with a keyboard shortcut
- 检测目标站点是否禁止嵌入  
  Detect whether a target site blocks embedding
- 对禁止嵌入的站点，可自动回退到新标签页，或展示手动打开提示  
  For blocked sites, either auto-fallback to a new tab or show a manual open prompt
- 支持多语言文案  
  Includes localized UI text

## 适用场景 | Use Cases

- 想快速扫一眼外链内容，但不想打断当前浏览流程  
  Quickly inspect external links without breaking browsing flow
- 希望把“新标签打开”替换成更轻量的页内预览  
  Replace “open in new tab” with a lighter in-page preview workflow
- 想在 Chromium 浏览器里获得接近 Arc 的链接预览交互  
  Get an Arc-like preview interaction in Chromium browsers

## 安装方式 | Installation

这个仓库是一个原生前端扩展项目，不需要构建步骤。  
This repository is a plain browser extension project and does not require a build step.

1. 打开 Chromium 内核浏览器的扩展管理页，例如 `chrome://extensions`  
   Open the extensions page in a Chromium-based browser, for example `chrome://extensions`
2. 打开右上角的“开发者模式”  
   Enable Developer Mode
3. 选择“加载已解压的扩展程序”  
   Click “Load unpacked”
4. 选择当前仓库目录  
   Select this repository folder

加载完成后，工具栏会出现扩展图标。  
After loading, the extension icon should appear in the browser toolbar.

## 使用说明 | Usage

### 基本交互 | Basic Interaction

- 点击被拦截的链接后，会在当前页面中央显示预览浮层  
  Clicking an intercepted link opens a centered overlay preview
- 点击右上角关闭按钮或浮层外部区域可关闭预览  
  Click the top-right close button or the backdrop to close it
- 按 `Esc` 可关闭预览  
  Press `Esc` to close the preview
- 点击预览顶部的打开按钮，可直接在新标签页打开目标链接  
  Use the top action button to open the target link in a new tab

### 拦截模式 | Interception Modes

扩展弹窗中提供两种模式。  
The popup exposes two interception modes.

- `New tab links only`
  - 只拦截这些场景：`target="_blank"`、带 `Cmd` / `Ctrl` 修饰键的点击、`Shift` 点击、中键点击  
    Only intercepts links opened via `target="_blank"`, `Cmd` / `Ctrl` clicks, `Shift` clicks, and middle clicks
- `All links`
  - 拦截普通左键点击的 HTTP/HTTPS 链接，但会放过带修饰键的点击，让用户可以主动绕过预览  
    Intercepts normal left-click HTTP/HTTPS links, but lets modified clicks pass through so users can intentionally bypass preview

### 快捷键 | Shortcut

弹窗中可以录制一个“在新标签页打开当前预览”的快捷键。  
You can record a shortcut in the popup to open the current preview in a new tab.

默认值 | Default:

- macOS：`⌘O`
- Windows / Linux：`Win+O`

说明：当前实现默认绑定的是 `Meta + O`。在非 macOS 环境里界面会显示为 `Win+O`，但底层仍依赖浏览器实际派发的修饰键事件。  
Note: the current implementation defaults to `Meta + O`. On non-macOS systems the UI renders it as `Win+O`, but behavior still depends on the actual modifier events emitted by the browser.

### 被目标站点阻止嵌入时 | When Embedding Is Blocked

部分网站会通过 `X-Frame-Options` 或 `Content-Security-Policy: frame-ancestors` 禁止被嵌入到 `iframe`。  
Some sites block `iframe` embedding through `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`.

扩展检测到这种情况后，会执行以下之一：  
When that happens, the extension will do one of the following:

- 自动在新标签页打开目标页面  
  Automatically open the target page in a new tab
- 在浮层中显示“该站点不允许嵌入”，并提供手动打开按钮  
  Show a fallback message with a manual “open in new tab” action

这个行为可以在弹窗里通过 `Auto open blocked sites in new tab` 开关控制。  
This behavior can be controlled with the `Auto open blocked sites in new tab` toggle in the popup.

## 配置项 | Configuration

扩展当前使用 `chrome.storage.local` 保存以下配置：  
The extension stores the following settings in `chrome.storage.local`:

- `enabled`：是否启用预览  
  Whether preview is enabled
- `mode`：拦截模式，`newTabOnly` 或 `all`  
  Interception mode, either `newTabOnly` or `all`
- `autoOpenBlocked`：目标站点禁止嵌入时是否自动在新标签页打开  
  Whether blocked sites should automatically open in a new tab
- `openTabShortcut`：预览态下“在新标签页打开”的快捷键配置  
  Shortcut configuration for opening the current preview in a new tab

## 权限说明 | Permissions

`manifest.json` 中当前使用了这些权限：  
The following permissions are currently used in `manifest.json`:

- `activeTab`：访问当前标签页上下文  
  Access the active tab context
- `storage`：保存用户配置  
  Persist user settings
- `webRequest`：读取子 frame 响应头，判断是否被站点禁止嵌入  
  Inspect sub-frame response headers to detect blocked embedding
- `host_permissions: <all_urls>`：在任意站点注入内容脚本并处理链接预览  
  Inject content scripts on any URL and handle link preview behavior

## 项目结构 | Project Structure

```text
.
├── manifest.json      # 扩展声明 / Extension manifest
├── content.js         # 链接拦截、浮层渲染、预览交互 / Interception, overlay rendering, preview logic
├── content.css        # 预览浮层样式 / Overlay styles
├── background.js      # 响应头检测与后台消息处理 / Header detection and background messaging
├── popup.html         # 扩展弹窗 UI / Popup UI
├── popup.js           # 弹窗配置读写与快捷键录制 / Popup settings and shortcut recording
├── icons/             # 扩展图标 / Extension icons
└── _locales/          # 国际化文案 / Localized messages
```

## 实现原理 | How It Works

1. `content.js` 在页面捕获阶段监听 `click` 和 `auxclick`  
   `content.js` listens to `click` and `auxclick` during the capture phase
2. 判断链接是否符合拦截条件  
   It checks whether the clicked link matches the interception rules
3. 满足条件时阻止默认跳转，创建预览浮层并加载目标 URL  
   If matched, it prevents default navigation and opens an overlay preview for the target URL
4. `background.js` 监听 `sub_frame` 的响应头  
   `background.js` watches `sub_frame` response headers
5. 如果发现 `X-Frame-Options` 或 `frame-ancestors` 阻止嵌入，就通知内容脚本执行回退逻辑  
   If `X-Frame-Options` or `frame-ancestors` blocks embedding, it notifies the content script to run fallback behavior

## 已知限制 | Known Limitations

- 只处理 `http` / `https` 链接  
  Only handles `http` / `https` links
- 下载链接、同页锚点跳转不会被拦截  
  Download links and same-page anchor jumps are not intercepted
- 某些站点即使未明确返回阻止头，也可能因为跨站策略或页面行为导致预览体验不完整  
  Some sites may still preview poorly due to cross-site restrictions or page behavior even without explicit blocking headers
- 目前没有自动化测试和打包流程，适合直接以开发者模式加载使用  
  There is currently no automated test or packaging pipeline; the project is intended for direct unpacked loading during development

## 后续可完善方向 | Possible Improvements

- 增加每个站点的白名单 / 黑名单  
  Add per-site whitelist / blacklist support
- 增加浮层尺寸、位置和动画配置  
  Add overlay size, position, and animation settings
- 增加浏览器命令快捷键集成  
  Integrate browser command shortcuts
- 增加发布脚本与自动化测试  
  Add release scripts and automated tests

