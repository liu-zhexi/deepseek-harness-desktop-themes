# 配置说明

配置持久化在宿主设置文档（默认 `$DSH_HOME/settings.yaml`）的 `ui-desktop-themes` 命名空间，由 schemastery schema 在宿主侧校验；客户端通过 settings scope 读写。

## 字段

### `theme`

- 类型：`"tokyo-night" | "catppuccin-mocha" | "black-gold"`
- 默认：`"tokyo-night"`

### `font`

| 字段 | 类型 | 默认 | 范围 |
|---|---|---|---|
| `uiFamily` | string | `Inter` | ≤ 512 字符 |
| `codeFamily` | string | `JetBrains Mono` | ≤ 512 字符 |
| `chineseFamily` | string | `LXGW WenKai` | ≤ 512 字符 |
| `fontSize` | number | 14 | 10–24，步进 1 |
| `codeFontSize` | number | 13 | 9–24，步进 1 |
| `lineHeight` | number | 1.6 | 1–2.5，步进 0.05 |
| `fontWeight` | number | 400 | 100–900，步进 100 |
| `ligatures` | boolean | true | |
| `smoothing` | boolean | true | |

### `appearance`

| 字段 | 类型 | 默认 | 范围 |
|---|---|---|---|
| `transparencyEnabled` | boolean | true | |
| `windowOpacity` | number | 0.92 | 0.55–1，步进 0.01 |
| `sidebarOpacity` | number | 0.78 | 0.55–1，步进 0.01 |
| `panelOpacity` | number | 0.84 | 0.55–1，步进 0.01 |
| `inputOpacity` | number | 0.86 | 0.55–1，步进 0.01 |
| `animationsEnabled` | boolean | true | |

> 所有透明度下限 0.55：低于该值会被自动钳制到 0.55（对比度保护），并提示。

### `wallpaper`

| 字段 | 类型 | 默认 | 范围 |
|---|---|---|---|
| `enabled` | boolean | false | |
| `path` | string | `""` | blob/http(s) URL |
| `fit` | enum | `cover` | `cover/contain/stretch/center/tile` |
| `positionX` | number | 50 | 0–100 |
| `positionY` | number | 50 | 0–100 |
| `scale` | number | 1 | 0.5–3，步进 0.05 |
| `opacity` | number | 0.35 | 0–1，步进 0.01 |
| `blur` | number | 4 | 0–50，步进 1 |
| `overlay` | number | 0.45 | 0–1，步进 0.01 |
| `saturation` | number | 1 | 0–2，步进 0.05 |
| `brightness` | number | 1 | 0.5–1.5，步进 0.05 |

### `glass`

| 字段 | 类型 | 默认 | 范围 |
|---|---|---|---|
| `enabled` | boolean | true | |
| `strength` | number | 16 | 0–40，步进 1（px） |
| `saturation` | number | 1.1 | 0.5–2，步进 0.05 |
| `panelOpacity` | number | 0.84 | 0–1，步进 0.01 |
| `borderHighlight` | number | 0.5 | 0–1，步进 0.01 |
| `shadow` | number | 0.3 | 0–1，步进 0.01 |
| `performanceMode` | enum | `balanced` | `off/light/standard/strong/custom/balanced` |

`performanceMode` 与模糊半径的关系：

- `off`：关闭模糊与阴影
- `light`：8px
- `standard`：16px
- `strong`：24px
- `custom` / `balanced`：使用 `strength`

## 导出 / 导入

- 导出：设置页“导出配置 JSON”，下载 `dsh-desktop-themes.json`。
- 导入：选择该 JSON，插件做 **schema 校验 + 版本迁移**，无效内容不写、不崩溃。
- 导出不含密码/token/图片字节（壁纸只存 URL 引用）。

## 版本迁移

导出信封 `schemaVersion`：

- `0 → 1`：旧字段 `themeId` → `theme`；`appearance.inputOpacity` 缺失时补默认值。
- 未来版本在 `src/config/validation.ts` 的 `MIGRATIONS` 表追加步骤。

## 重置

- 字体分组：恢复字体默认值。
- 透明度：恢复推荐值（0.92 / 0.78 / 0.84 / 0.86）。
- 全部：恢复所有默认值 + 清除壁纸。

## 存储与安全

- 设置值经 schemastery 校验后写入；无效值在注册/写入时被拒绝。
- 导出/导入不携带敏感信息。
- 壁纸使用浏览器 `blob:` URL（内存态），不在设置里存 Base64。
