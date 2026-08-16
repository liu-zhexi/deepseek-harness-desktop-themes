declare const __DTH_VERSION__: string;
declare const __DTH_BUILD_ID__: string;

export const PLUGIN_VERSION = typeof __DTH_VERSION__ === 'string' ? __DTH_VERSION__ : 'dev';
export const PLUGIN_BUILD_ID = typeof __DTH_BUILD_ID__ === 'string' ? __DTH_BUILD_ID__ : 'source';
