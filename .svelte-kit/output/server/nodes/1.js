

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.B_l2zKaE.js","_app/immutable/chunks/D9dWO0Sc.js"];
export const stylesheets = [];
export const fonts = [];
