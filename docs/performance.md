# 性能测试

## 方法

**微基准（已执行，可复现）**

```bash
npm run bench
```

用 `node:perf_hooks` 对热路径纯函数做 1000 次预热 + N 次计时的 µs/op 统计。这些函数是每次主题/配置变更时唯一执行的插件逻辑（外加一次 style 标签写入，由浏览器原生完成）。

**环境**：Node.js v24.14.0，Windows 11（x64），无 GPU/浏览器参与。

## 结果

| 操作 | 耗时 |
|---|---|
| 主题 token 构建（3 套主题 × ~80 token） | 9.28 µs/op |
| 主题切换（注册 + setTheme 逻辑） | 0.13 µs/op |
| 字体 CSS 生成 | 2.01 µs/op |
| 壁纸 CSS 生成 | 0.69 µs/op |
| 毛玻璃 resolve + CSS | 0.57 µs/op |
| 透明度 token 层构建 | 0.98 µs/op |
| 配置校验（无效输入） | 2.84 µs/op |
| 配置导入 + 迁移 | 3.08 µs/op |

产物大小：

- `lib/client.js`：74.4 KB（含内联静态 CSS 文本；React 为 external，未打包）
- `lib/index.js`：2.6 KB

## 结论与对应目标

- **普通主题切换 < 100ms**：逻辑层 < 10µs，余量全部留给宿主 theme 服务发布 + 若干 CSS 变量写入，远低于目标。
- **设置操作不阻塞主线程**：所有变更只做字符串拼接 + 一次 `<style>.textContent` 写入；连续输入经 `requestAnimationFrame` 合并（`scheduleRaf`），不每帧重排。
- **空闲不跑定时器**：插件不注册任何 `setInterval`；只在配置变更时一次性排 rAF。
- **不反复注入重复样式**：静态/动态各一个 `<style>` 标签，幂等重写；卸载删除（有单测覆盖）。
- **毛玻璃开销可测量**：`off` 档产出无 `backdrop-filter` 的纯色规则；低性能模式一键关闭模糊+阴影+动画。
- **壁纸不冻结界面**：文件类型/大小（≤25MB）前置校验；解码交给浏览器 `<img>`/CSS 异步路径，插件逻辑仅字符串拼接。

## 局限（如实声明）

以下指标**未在本次交付环境实测**，因为它们需要真实运行 `dsh web` 的浏览器运行时：

- 插件启用前后启动时间变化
- 空闲 CPU 占用
- 内存增量
- 快速滚动流畅度 / 60 FPS
- 大尺寸壁纸下的渲染表现

**复现方法**（在有完整 profile 的环境）：

1. `dsh web` 启动，打开 DevTools → Performance / Memory。
2. 记录启用插件前后的 `performance.now()` 启动时间、进程内存（Chrome 任务管理器）。
3. 在设置页切换主题，用 Performance 录制 `theme/change` 到 paint 的耗时。
4. 快速滚动对话，观察长任务与 FPS 仪表。
5. 开启/关闭毛玻璃，对比 Composite/Raster 耗时与内存。

## 优化要点回顾

- token 由 14 个核心色一次性派生（`buildThemeTokens`），主题不重复硬编码。
- 动态 CSS 每次全量重建字符串，由 rAF 合并后一次性写入，避免多次 DOM 写。
- 透明度走 `theme.overrideTokens`（官方可逆 token 层），不额外注入样式。
- 壁纸为单个 `body::before` 层 + `body::after` 遮罩，避免多层嵌套模糊。
- 无 eval、无高频定时器、无 MutationObserver、无持续 DOM 监听。
