/**
 * Host entry for `dsh-desktop-themes`.
 *
 * The Host half owns one durable thing: the `ui-desktop-themes` settings
 * namespace (schema + storage). The Client half reads/writes it through the
 * settings scope. The registration is an *optional* `settings` injection, so a
 * composition without a settings provider still loads the plugin — it just
 * runs with in-memory defaults, exactly like the product's theme plugin.
 */

import { DesktopThemesSchema } from './config/schema.ts';
import { SETTINGS_NAMESPACE } from './config/types.ts';

interface SettingsFace {
  settings: {
    register(namespace: string, schema: unknown): unknown;
  };
}

interface HostContext {
  inject(services: string[], callback: (ctx: SettingsFace) => void): void;
}

export function apply(ctx: HostContext): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(SETTINGS_NAMESPACE, DesktopThemesSchema);
  });
}
