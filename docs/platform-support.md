# 平台兼容性

本插件是 DSH **Web 外壳**的客户端插件 + 宿主配置插件，运行在浏览器渲染层；与操作系统交互只经由标准 Web API。

| 能力 | Windows 10/11 | macOS | Linux |
|---|---|---|---|
| 主题 / 字体 / 设置 | ✅ | ✅ | ✅ |
| 半透明背景 | ✅ | ✅ | ✅ |
| 自定义壁纸（blob URL） | ✅ | ✅ | ✅ |
| 毛玻璃 `backdrop-filter` | ✅ Chromium/Edge 111+ | ✅ Safari 16.2+ | ✅ Firefox 113+ / Chromium |

## 降级行为

- **不支持 `backdrop-filter`**：自动回退为半透明纯色填充（`buildGlassCss(supported=false)`），文字对比度不受影响。
- **不支持透明窗口的平台**：透明度仅作用于 CSS 背景 token（非原生窗口材质），本就是纯 CSS，无“不支持”问题；`theme.overrideTokens` 只改颜色 alpha，不涉及点击穿透/拖动/输入。
- **壁纸加载失败**：`<img>` `onerror` 隐藏预览，CSS 层回退到主题背景。

## 浏览器要求

- 需支持 CSS 自定义属性（所有现代浏览器均支持）。
- 半透明用 `rgba()`（全兼容，非 `color-mix`）。
- 毛玻璃用 `backdrop-filter` + `-webkit-backdrop-filter` 双前缀。

## 无障碍

- 所有表单控件有 `<label>` + `id` 关联，键盘可及。
- `:focus-visible` 明确焦点环。
- 状态不只靠颜色（开关有 On/Off 文本、`aria-checked`/`aria-pressed`）。
- 尊重 `prefers-reduced-motion`（CSS 里强制关闭过渡/动画）。
- 正文与关键控件尽量满足 WCAG AA；透明度下限 0.55 保护对比度。
- 125%/150%/200% 缩放下设置页可回流（窄屏时导航折叠为横向）。
- 长标题/路径/错误信息正常换行（`overflow-wrap: anywhere`）。
