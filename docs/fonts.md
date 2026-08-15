# 字体安装与回退

## 预设字体

界面字体（`uiPreset`）：

| key | 字体 | 说明 |
|---|---|---|
| `system` | 系统默认 | 平台默认栈 |
| `lxgw-wenkai` | 霞鹜文楷 LXGW WenKai | <https://github.com/lxgw/LxgwWenKai> |
| `maple-ui` | Maple UI | <https://github.com/subframe7536/Maple-font> |
| `misans` | MiSans | <https://hyperos.mi.com/font> |
| `harmonyos-sans` | HarmonyOS Sans SC | 鸿蒙字体 |
| `noto-sans-sc` | Noto Sans SC | <https://fonts.google.com/noto> |
| `ms-yahei-ui` | Microsoft YaHei UI | Windows 自带 |
| `pingfang-sc` | PingFang SC | macOS/iOS 自带 |

代码字体（`codePreset`）：

| key | 字体 |
|---|---|
| `jetbrains-mono` | JetBrains Mono |
| `maple-mono` | Maple Mono |
| `cascadia-code` | Cascadia Code |
| `fira-code` | Fira Code |
| `source-code-pro` | Source Code Pro |
| `ibm-plex-mono` | IBM Plex Mono |
| `consolas` | Consolas |
| `system-mono` | 系统等宽字体 |

插件**不打包、不重新分发字体文件**——只生成字体栈。

## 安装检测与预览

- 设置页每个字体卡片用对应字体渲染预览文字（中英文 + 代码混排）：
  `DeepSeek Harness · 你好，世界` 与 `const answer = await model.generate();`
- 用 `document.fonts.check()` 做尽力检测，显示“已安装”或“不可用，将使用回退字体”。检测是启发式的（字体懒加载时可能先报不可用），实际渲染始终有回退栈兜底。
- 用户选择后立即预览并自动保存；刷新/重启后恢复。

## 回退栈

界面字体栈：

```
-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei UI",
"PingFang SC", "Noto Sans SC", sans-serif
```

代码字体栈：

```
"JetBrains Mono", "Maple Mono", "Cascadia Code", "SFMono-Regular",
Consolas, Menlo, "PingFang SC", "Microsoft YaHei", monospace
```

> 代码栈在 `monospace` 之前保留 `PingFang SC` / `Microsoft YaHei`，使中文代码注释、Markdown 内嵌中文不落入无 CJK 字形的等宽字体。

## 自定义字体

“自定义字体”选项允许输入任意已安装字体名（≤256 字符，安全拼入 `font-family` 并加引号转义，不能注入 CSS 规则）。未安装的字体名会被浏览器跳过并回退。

## 字号 / 行高 / 字重 / 连字 / 平滑

- 界面字号 10–24px、代码字号 9–24px、行高 1–2.5、字重 100–900。
- 连字与平滑只作用于代码字体与 body 渲染；宿主组件若硬编码字体族则不受影响（本插件遵循 token）。
