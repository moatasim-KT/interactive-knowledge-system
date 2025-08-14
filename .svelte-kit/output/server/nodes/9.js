import * as universal from '../entries/pages/knowledge/_id_/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/knowledge/_id_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/knowledge/[id]/+page.ts";
export const imports = ["_app/immutable/nodes/9.Ct9QVWsV.js","_app/immutable/chunks/d1NyGob4.js","_app/immutable/chunks/DG3UZo5P.js"];
export const stylesheets = ["_app/immutable/assets/components-knowledge.lLDfAUfq.css","_app/immutable/assets/9.DR3WJxUv.css"];
export const fonts = [];
