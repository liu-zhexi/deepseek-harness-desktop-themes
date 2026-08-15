# 字体安装与回退

## 预设字体

| 字体 | 用途 | 下载 |
|---|---|---|
| JetBrains Mono | 代码 | <https://www.jetbrains.com/lp/mono/> |
| Maple Mono | 代码 | <https://github.com/subframe7536/Maple-font> |
| 霞鹜文楷 LXGW WenKai | 中文界面 | <https://github.com/lxgw/LxgwWenKai> |

## 回退栈

插件**不打包、不重新分发字体文件**，只生成字体栈。字体不存在时自动回退，绝不空白/崩溃。

代码字体栈：

```
"JetBrains Mono", "Maple Mono", "Cascadia Code", "SFMono-Regular",
Consolas, "Liberation Mono", Menlo, "PingFang SC", "Microsoft YaHei", monospace
```

界面字体栈：

```
"Inter", "LXGW WenKai", -apple-system, BlinkMacSystemFont, "Segoe UI",
"Microsoft YaHei UI", "PingFang SC", sans-serif
```

> 说明：代码栈在 `monospace` 之前保留 `PingFang SC` / `Microsoft YaHei`，使中文代码注释、Markdown 内嵌中文不落入无 CJK 字形的等宽字体；界面栈把泛型 `sans-serif` 放在最后，保证有兜底。

## 自定义字体

设置页“界面字体 / 中文字体 / 代码字体”为**安全文本输入**：只接受字符串（≤512 字符），直接拼入 CSS `font-family`（用引号包裹并转义，不能注入 CSS 规则）。未安装的字体名会被浏览器跳过并回退。

## 中英混排

- UI 字体栈先拉丁后 CJK，中英文分别命中各自字体。
- 代码块/行内代码用代码栈（含 CJK 兜底）。
- 表格、输入框、长标题使用 `overflow-wrap: anywhere` / 正常换行，不溢出。

## 已知点

- 字体名区分大小写；Windows 下可打开“设置 → 个性化 → 字体”查看实际安装名。
- 连字/平滑开关只影响代码字体与 body 渲染，宿主组件若硬编码了字体族则不受影响（本插件遵循 token，不硬编码）。
