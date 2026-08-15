# DeepSeek Harness Desktop Themes

一个可安装、可配置、可卸载的 DeepSeek Harness 桌面外观插件。为长时间编程与对话场景提供现代、克制、内容优先的界面：**字体切换、三套主题、半透明背景、自定义壁纸和毛玻璃效果**。

- 平台：Web（DSH 的浏览器外壳）；宿主进程侧负责配置持久化
- 技术：TypeScript + React（客户端）+ Cordis（DSH 插件运行时）
- 依赖零额外运行时库（仅 `@deepseek-ai/schemastery` 用于宿主侧 schema）

> 本插件只使用 DeepSeek Harness **真实存在的插件接口**（`theme` 服务、`settingsScope`、`slots`、`cordis.patch.yml` 组合层），不修改任何宿主核心文件，卸载即恢复。

---

## 目录

1. [功能](#功能)
2. [快速开始（构建）](#快速开始构建)
3. [开发模式](#开发模式)
4. [安装](#安装)
5. [卸载与恢复](#卸载与恢复)
6. [配置说明](#配置说明)
7. [字体安装与回退](#字体安装与回退)
8. [平台兼容性](#平台兼容性)
9. [测试与构建验证](#测试与构建验证)
10. [性能测试结果](#性能测试结果)
11. [已知限制](#已知限制)
12. [项目结构](#项目结构)

---

## 功能

| 分组 | 能力 |
|---|---|
| 主题 | Tokyo Night / Catppuccin Mocha / 黑金 三套内置主题，统一走 `--dsw-alias-*` token |
| 字体 | 界面字体、代码字体、中文字体、字号、行高、字重、连字、平滑；一键恢复默认 |
| 透明度 | 主窗口 / 侧边栏 / 内容面板 / 输入区 透明度（0.55–1.00），实时预览 + 恢复推荐值 |
| 壁纸 | PNG/JPG/JPEG/WebP，cover/contain/stretch/center/tile，位置/缩放/透明度/模糊/遮罩/饱和度/亮度 |
| 毛玻璃 | `backdrop-filter` + 降级，模糊/饱和度/面板透明度/边框高光/阴影，性能档位 |
| 动画与性能 | 动画开关、一键低性能模式（关闭模糊/阴影/动画） |
| 导入导出 | JSON 导出/导入，schema 校验 + 版本迁移，无效配置不崩溃 |
| 重置 | 分组默认值 / 全部默认值 / 清除壁纸 |

所有设置在“设置 → 桌面外观”页实时预览，并通过宿主设置存储可靠持久化。

---

## 快速开始（构建）

前置：Node.js ≥ 20（已在 Node 24 验证）、npm。

```bash
cd dsh-desktop-themes
npm install
npm run build        # 生成 lib/index.js 与 lib/client.js
npm run typecheck    # 严格类型检查（无 emit）
npm test             # 50 个单元测试
npm run bench        # 可复现的性能微基准
```

构建产物：

- `lib/index.js` — 宿主入口（注册 `ui-desktop-themes` 设置命名空间）
- `lib/client.js` — 客户端 bundle（`window.__ModuleLoader__.load` 包装）

---

## 开发模式

```bash
npm install
# 终端 A：一次性构建（改动后重跑，或见下）
npm run build
```

DSH 客户端插件的无刷新热更新依赖宿主的 `pnpm run dev:web` watcher（改客户端 bundle 后自动 reload）。本仓库没有内置 watch（避免引入额外复杂依赖）；迭代流程为：改源码 → `npm run build` → 刷新浏览器（`dsh web` 会按 `?rev=` 缓存 bust 重新拉取 `/plugins/<id>/client.js`）。

---

## 安装

插件由 **宿主侧（设置持久化）+ 客户端侧（主题/外观/设置页）** 组成，安装分两步：

### 1. 安装依赖包

```bash
# 本地路径安装（开发/分发）
dsh plugin --profile web add file:D:/path/to/dsh-desktop-themes

# 或从 npm 安装（若已发布）
dsh plugin --profile web add dsh-desktop-themes
```

`dsh plugin` 会把命令转发给 profile 目录下的 pnpm。本包不是 `dsh.bundle`（不带组合 patch），因此会被安装为普通依赖并提示一条无害的“declares no dsh.bundle”警告。

### 2. 在 profile 的 `cordis.patch.yml` 注册插件行

编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`（Windows 为 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`），追加：

```yaml
- insert:
    - id: desktop-themes
      name: dsh-desktop-themes
```

### 3. 重启

```bash
dsh web
```

重启后打开“设置 → 桌面外观”即可看到插件页面，主题选择器里会多出三套桌面主题。

> 完整、逐步的安装说明见 [`docs/install.md`](docs/install.md)。

---

## 卸载与恢复

卸载即恢复原始外观——插件没有修改任何宿主文件，所有副作用（主题注册、样式注入、透明度 token 层、设置命名空间）都随插件 fiber 的 dispose 释放。

```bash
# 1. 移除 profile 组合行（删除上面的 `- id: desktop-themes` 行）
# 2. 移除依赖
dsh plugin --profile web remove dsh-desktop-themes
# 3. 重启
dsh web
```

插件生成的缓存（壁纸使用浏览器 `blob:` URL，无磁盘副本）随页面会话释放；**不会删除用户原图**。

如需同时清空插件写入的设置，可删除 `$DSH_HOME/settings.yaml` 中的 `ui-desktop-themes:` 分节，或在插件设置页点击“恢复全部默认值”。

---

## 配置说明

配置持久化在宿主设置文档 `$DSH_HOME/settings.yaml` 的 `ui-desktop-themes` 命名空间下，由 schemastery schema 校验。导出 JSON 的结构：

```jsonc
{
  "schemaVersion": 1,
  "config": {
    "theme": "tokyo-night",          // tokyo-night | catppuccin-mocha | black-gold
    "font": {
      "uiFamily": "Inter",
      "codeFamily": "JetBrains Mono",
      "chineseFamily": "LXGW WenKai",
      "fontSize": 14,
      "codeFontSize": 13,
      "lineHeight": 1.6,
      "fontWeight": 400,
      "ligatures": true,
      "smoothing": true
    },
    "appearance": {
      "transparencyEnabled": true,
      "windowOpacity": 0.92,
      "sidebarOpacity": 0.78,
      "panelOpacity": 0.84,
      "inputOpacity": 0.86,
      "animationsEnabled": true
    },
    "wallpaper": {
      "enabled": false,
      "path": "",
      "fit": "cover",
      "positionX": 50,
      "positionY": 50,
      "scale": 1,
      "opacity": 0.35,
      "blur": 4,
      "overlay": 0.45,
      "saturation": 1,
      "brightness": 1
    },
    "glass": {
      "enabled": true,
      "strength": 16,
      "saturation": 1.1,
      "panelOpacity": 0.84,
      "borderHighlight": 0.5,
      "shadow": 0.3,
      "performanceMode": "balanced"
    }
  }
}
```

详细字段、取值范围与迁移规则见 [`docs/configuration.md`](docs/configuration.md)。

---

## 字体安装与回退

预设字体：**JetBrains Mono**、**Maple Mono**、**霞鹜文楷（LXGW WenKai）**。

插件**不打包、不重新分发字体文件**——它只生成字体栈。字体不存在时按回退栈自动降级，绝不空白/崩溃：

- 代码：`"JetBrains Mono", "Maple Mono", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "PingFang SC", "Microsoft YaHei", monospace`
- 界面：`"Inter", "LXGW WenKai", -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif`

字体安装：

- **JetBrains Mono** — <https://www.jetbrains.com/lp/mono/>
- **Maple Mono** — <https://github.com/subframe7536/Maple-font>
- **霞鹜文楷 LXGW WenKai** — <https://github.com/lxgw/LxgwWenKai>

设置页的“界面字体 / 中文字体 / 代码字体”文本框允许输入任意已安装字体名。详见 [`docs/fonts.md`](docs/fonts.md)。

---

## 平台兼容性

| 能力 | Windows | macOS | Linux |
|---|---|---|---|
| 主题 / 字体 / 设置 | ✅ | ✅ | ✅ |
| 半透明背景 | ✅ | ✅ | ✅ |
| 自定义壁纸（浏览器 blob URL） | ✅ | ✅ | ✅ |
| 毛玻璃 `backdrop-filter` | ✅（Chromium/Edge） | ✅（Safari 16.2+） | ✅（Firefox 113+ / Chromium） |

说明与降级行为见 [`docs/platform-support.md`](docs/platform-support.md)。

---

## 测试与构建验证

```bash
npm run typecheck && npm test && npm run build
```

结果（当前环境 Node 24 / Windows）：

- `tsc --noEmit`：0 错误
- 单元测试：**50 通过 / 0 失败**（覆盖默认值、读取/保存、无效回退、版本迁移、主题切换、字体回退、壁纸校验、重复启停、样式清理、毛玻璃降级、导入导出、schema 解析）
- 构建：`lib/index.js`（2.6 KB）+ `lib/client.js`（74.4 KB）成功产出

测试清单见 [`docs/configuration.md`](#) 末尾及 `tests/` 目录。

---

## 性能测试结果

`npm run bench`（Node 24，逻辑层微基准，热路径均为纯函数）：

| 操作 | 耗时 |
|---|---|
| 主题 token 构建（3 套主题） | 9.28 µs/op |
| 主题切换（注册 + setTheme 逻辑） | 0.13 µs/op |
| 字体 CSS 生成 | 2.01 µs/op |
| 壁纸 CSS 生成 | 0.69 µs/op |
| 毛玻璃 resolve + CSS | 0.57 µs/op |
| 透明度 token 层构建 | 0.98 µs/op |
| 配置校验（无效输入） | 2.84 µs/op |
| 配置导入 + 迁移 | 3.08 µs/op |

所有热路径远低于 1ms，主题切换远低于 100ms 目标（实际切换由宿主 theme 服务的一次发布 + 若干 CSS 变量写入主导，与本插件逻辑无关）。方法、环境与局限见 [`docs/performance.md`](docs/performance.md)。

---

## 已知限制

1. **壁纸持久化受浏览器沙箱限制**：壁纸通过浏览器 `<input type=file>` 选择并以 `blob:` URL 使用，立即生效；刷新后 blob URL 失效，自动回退到主题背景。配置里只存引用，**不存 Base64 图**。跨会话持久化需要宿主侧文件副本 + 服务路由（未实现，见[后续可改进项](#后续可改进项)）。
2. **毛玻璃作用面**：`backdrop-filter` 应用在插件自有的设置面板等 `.dth-glass` 表面；产品的侧边栏/标题栏/输入区等第三方 DOM 无法在不硬编码选择器的情况下安全覆盖（这是宿主约束，插件不越界）。
3. **透明度依赖 `theme.overrideTokens`**：只改变背景色 token 的 alpha，不涉及原生窗口材质；不支持透明窗口的平台自然降级为不透明。
4. **第三方主题为进程内扩展**：三套主题随插件注册，`theme` 偏好持久化由插件自己的命名空间负责（宿主内置主题偏好 `ui-theme` 仅支持 light/dark/system）。
5. **无真实浏览器 E2E / 截图测试**：当前交付环境无法启动宿主 profile 做端到端验证；已用单元测试 + 构建 + 微基准覆盖全部纯逻辑，并在 README 中如实标注。空闲 CPU / 内存增量 / FPS 需在真实 `dsh web` 运行时按 [`docs/performance.md`](docs/performance.md) 的方法实测。

## 后续可改进项

- 宿主侧壁纸持久化（受控副本 + `/plugins/...` 路由 + client→host RPC）
- 每主题独立强调色微调
- 设置页 locale 服务接入（当前为内置 zh/en 双语）
- 客户端 bundle sourcemap
- 真实浏览器性能剖析与截图测试（`dsh web` 运行时）

---

## 项目结构

```
dsh-desktop-themes/
├── manifest.json              # 人读插件元数据（权威 manifest 见 package.json#dsh）
├── package.json               # dsh.client manifest + 构建/测试脚本
├── tsconfig.json
├── scripts/
│   ├── build.mjs              # esbuild 构建宿主 + 客户端 bundle
│   └── bench.ts               # 性能微基准
├── src/
│   ├── index.ts               # 宿主入口（设置命名空间注册）
│   ├── client/
│   │   ├── index.tsx          # 客户端入口（主题/外观/设置页/清理）
│   │   └── styles.css         # 设置面板静态样式（用主题 token）
│   ├── config/
│   │   ├── types.ts           # 配置类型 + 命名空间
│   │   ├── defaults.ts        # 默认值 + 推荐值
│   │   ├── schema.ts          # schemastery 宿主 schema
│   │   ├── validation.ts      # 校验/强制/迁移（无依赖，双端共用）
│   │   └── transfer.ts        # 导入/导出 JSON
│   ├── themes/
│   │   ├── palette.ts         # palette → --dsw-alias-* token 构建器
│   │   ├── tokyo-night.ts
│   │   ├── catppuccin-mocha.ts
│   │   ├── black-gold.ts
│   │   └── index.ts           # 主题注册表
│   ├── appearance/
│   │   ├── fonts.ts           # 字体栈 + CSS
│   │   ├── transparency.ts    # 透明度 token 层
│   │   ├── wallpaper.ts       # 壁纸校验 + CSS
│   │   └── glass.ts           # 毛玻璃 + 降级
│   ├── settings/
│   │   ├── SettingsPanel.tsx  # 设置页（分组导航 + 各分区）
│   │   ├── controls.tsx       # 无障碍表单控件
│   │   └── i18n.ts            # 中英双语
│   └── utils/
│       ├── color.ts           # 颜色工具（rgba/mix/对比度）
│       ├── store.ts           # 微型可观察 store + deepEqual
│       └── style.ts           # 样式控制器 + rAF 合并
├── tests/                     # 50 个单元测试
└── docs/                      # install / configuration / fonts / platform / performance
```
