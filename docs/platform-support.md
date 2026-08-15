# 平台兼容性

本插件是 DSH **Web 外壳**的客户端插件 + 宿主配置插件，运行在浏览器渲染层；与操作系统交互只经由标准 Web API。

| 能力 | Windows 10/11 | macOS | Linux |
|---|---|---|---|
| 主题 / 字体 / 设置 | ✅ | ✅ | ✅ |
| 半透明背景 | ✅ | ✅ | ✅ |
| 自定义壁纸（IndexedDB 持久化） | ✅ | ✅ | ✅ |
| 粒子/光影 Canvas-2D | ✅ | ✅ | ✅ |
| 毛玻璃 `backdrop-filter` | ✅ Chromium/Edge 111+ | ✅ Safari 16.2+ | ✅ Firefox 113+ / Chromium |

## 降级行为

- **不支持 `backdrop-filter`**：自动回退为半透明纯色填充（`buildGlassCss(supported=false)`），文字对比度不受影响。
- **不支持透明窗口的平台**：透明度仅作用于 CSS 背景 token（非原生窗口材质），本就是纯 CSS，无“不支持”问题。
- **壁纸加载失败**：IndexedDB 不可用或被清理时回退到主题背景；`<img>` `onerror` 隐藏预览。
- **IndexedDB 不可用**：壁纸退化为会话级 blob URL（刷新后丢失），其余设置仍正常持久化。
- **无 Canvas 2D**（极罕见）：粒子引擎 `getContext` 返回 null 时安全跳过绘制，不影响其他功能。

## 浏览器要求

- 支持 CSS 自定义属性（所有现代浏览器均支持）。
- 半透明用 `rgba()`（全兼容）。
- 毛玻璃用 `backdrop-filter` + `-webkit-backdrop-filter` 双前缀。
- 壁纸持久化需要 IndexedDB；字体检测需要 Font Loading API（缺失时回退为“可用”且仍安全回退）。

## 无障碍

- 所有表单控件有 `<label>` + `id` 关联，键盘可及。
- `:focus-visible` 明确焦点环。
- 状态不只靠颜色（开关有 On/Off 文本、`aria-checked`/`aria-pressed`/`role="radiogroup"`）。
- 尊重 `prefers-reduced-motion`（CSS 强制关闭过渡/动画；粒子渲染静态帧）。
- 正文与关键控件尽量满足 WCAG AA；透明度下限 0.55 保护对比度；自定义配色提供对比度检测与一键修正。
- 125%/150%/200% 缩放下设置页可回流（窄屏时导航折叠为横向）。
- 长标题/路径/错误信息正常换行（`overflow-wrap: anywhere`）。
