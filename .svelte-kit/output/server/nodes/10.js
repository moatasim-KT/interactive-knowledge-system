import * as universal from '../entries/pages/knowledge/_id_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/knowledge/_id_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/knowledge/[id]/+page.ts";
export const imports = ["_app/immutable/nodes/10.NsnbSRt6.js","_app/immutable/chunks/D9dWO0Sc.js","_app/immutable/chunks/BdGMWZf_.js"];
export const stylesheets = ["_app/immutable/assets/components-knowledge.BBnxl3A5.css","_app/immutable/assets/10.DR3WJxUv.css"];
export const fonts = [];
