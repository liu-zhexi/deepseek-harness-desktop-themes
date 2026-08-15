# 配置说明

普通设置持久化在宿主设置文档（默认 `$DSH_HOME/settings.yaml`）的 `ui-desktop-themes` 命名空间，由 schemastery schema 在宿主侧校验；客户端通过 settings scope 读写。壁纸字节单独存放在 IndexedDB 数据库 `dsh-desktop-themes`（存 Blob，配置里只存受管理的 `sourceId`）。

配置带有 `schemaVersion`（当前 `2`），读取时执行版本迁移。

## 顶层结构

```jsonc
{
  "schemaVersion": 2,
  "theme": "quantum-blue",
  "font": { /* … */ },
  "appearance": { /* … */ },
  "wallpaper": { /* … */ },
  "glass": { /* … */ },
  "effects": { /* … */ },
  "performance": { "level": "balanced" },
  "customThemes": [],
  "recentWallpapers": []
}
```

### `theme`

- 类型：string（内置 id 或 `custom-*` 自定义 id）
- 内置：`quantum-blue` / `aurora-dream` / `mint-breeze` / `sakura-mist` / `sunset-flow` / `obsidian-gold`
- 默认：`quantum-blue`

### `font`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `uiPreset` | string | `system` | 界面字体预设 key |
| `codePreset` | string | `jetbrains-mono` | 代码字体预设 key |
| `uiCustomFamily` | string | `""` | 自定义界面字体（`uiPreset === 'custom'` 时生效） |
| `codeCustomFamily` | string | `""` | 自定义代码字体 |
| `fontSize` | number | 14 | 10–24 |
| `codeFontSize` | number | 13 | 9–24 |
| `lineHeight` | number | 1.6 | 1–2.5 |
| `fontWeight` | number | 400 | 100–900 |
| `ligatures` | boolean | true | 代码连字 |
| `smoothing` | boolean | true | 字体平滑 |

### `appearance`

| 字段 | 类型 | 默认 | 范围 |
|---|---|---|---|
| `transparencyEnabled` | boolean | true | |
| `windowOpacity` | number | 0.92 | 0.55–1 |
| `sidebarOpacity` | number | 0.78 | 0.55–1 |
| `panelOpacity` | number | 0.84 | 0.55–1 |
| `inputOpacity` | number | 0.86 | 0.55–1 |
| `borderRadius` | enum | `standard` | `compact/standard/soft` |
| `contentWidth` | enum | `standard` | `compact/standard/wide` |
| `animationsEnabled` | boolean | true | |

> 所有透明度下限 0.55（对比度保护）。

### `wallpaper`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | boolean | false | |
| `sourceId` | string | `""` | IndexedDB 受管理资源 id（持久） |
| `path` | string | `""` | 运行时 blob URL（**不持久化**，每次从 IndexedDB 重建） |
| `name` | string | `""` | 原文件名 |
| `fit` | enum | `cover` | `cover/contain/stretch/center/tile` |
| `positionX/Y` | number | 50 | 0–100 |
| `scale` | number | 1 | 0.5–3 |
| `opacity` | number | 0.7 | 0–1 |
| `blur` | number | 0 | 0–50 |
| `overlay` | number | 0.35 | 0–1 |
| `saturation` | number | 1 | 0–2 |
| `brightness` | number | 1 | 0.5–1.5 |
| `tintEnabled` | boolean | false | 与主题强调色混合 |
| `tintStrength` | number | 0.35 | 0–1 |

### `glass`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | boolean | true | |
| `blurLevel` | enum | `standard` | `off/light/standard/strong`（0/8/16/24px） |
| `strength` | number | 0 | 高级自定义模糊半径；0 = 跟随预设 |
| `saturation` | number | 1.1 | 0.5–2 |
| `panelOpacity` | number | 0.84 | 0–1 |
| `borderHighlight` | number | 0.5 | 0–1 |
| `shadow` | number | 0.3 | 0–1 |

### `effects`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | boolean | true | 总开关 |
| `preset` | enum | `starfield` | `none/tech-data/starfield/aurora-flow/fireflies/bubbles/sakura/gold-dust/breathing/custom` |
| `density` | enum | `medium` | `off/low/medium/high` |
| `particleCount` | number | 0 | 显式数量；0 = 自动（按面积+档位） |
| `particleSize` | number | 2 | 1–6 |
| `particleSpeed` | number | 1 | 0.2–3 |
| `particleOpacity` | number | 0.5 | 0–1 |
| `connectLines` | boolean | false | 连线 |
| `mouseInteraction` | boolean | false | 鼠标互动 |
| `parallax` | boolean | false | 背景视差 |
| `cursorGlow` | boolean | false | 光标跟随柔光 |
| `glowIntensity` | enum | `soft` | `off/soft/standard/bright` |
| `animationSpeed` | enum | `gentle` | `still/gentle/standard/active` |
| `autoThemeColors` | boolean | true | 自动适配主题颜色 |
| `particleColors` | string[] | `[]` | 关闭自动配色时的粒子颜色 |
| `glowColors` | string[] | `[]` | 关闭自动配色时的光影颜色 |

### `performance`

| 字段 | 类型 | 默认 |
|---|---|---|
| `level` | enum | `balanced`（`power-saver/balanced/quality`） |

### `customThemes`

数组，每项：

```jsonc
{
  "id": "custom-xxx",
  "name": "My Theme",
  "base": "quantum-blue",   // 基础主题（决定明暗与 success/warning/danger）
  "colors": {
    "primary": "#3D7EFF", "accent": "#22D3EE", "background": "#0B1120",
    "panel": "#131C31", "text": "#E6EDF7", "particle": "#22D3EE", "glow": "#3D7EFF"
  }
}
```

悬停色、边框、次级背景由主色/背景自动派生；文字对比度自动检测与可一键修正。

## 版本迁移

- `1 → 2`：主题 id 映射（`tokyo-night→quantum-blue`、`catppuccin-mocha→aurora-dream`、`black-gold→obsidian-gold`）；旧字体名 → 预设；旧 `glass.performanceMode` → `blurLevel`（预设档位时 `strength` 归 0）；新增 effects/performance/customThemes/recentWallpapers。
- 未来版本在 `src/config/validation.ts` 的 `MIGRATIONS` 表追加步骤。

## 导出 / 导入

- 导出：设置页“导出设置 JSON”，下载 `dsh-desktop-themes.json`。
- 导入：schema 校验 + 版本迁移；无效内容不写、不崩溃。
- 导出不含图片字节、token、密码。

## 重置

- 恢复当前主题默认值 / 恢复分组默认值 / 恢复全部默认值（清除壁纸与所有外观设置）。

## 存储与安全

- 普通设置经 schemastery 校验写入；无效值被拒绝或回退默认。
- 壁纸字节存 IndexedDB Blob，不在设置里存 Base64；替换/清除时删除插件生成的缓存，不删除用户原图。
- 数据损坏时 `coerceConfig` 自动回退默认值，插件不崩溃。
