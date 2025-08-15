import * as universal from '../entries/pages/knowledge/_layout.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/knowledge/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/knowledge/+layout.ts";
export const imports = ["_app/immutable/nodes/2.gq-T5gKf.js","_app/immutable/chunks/D9dWO0Sc.js","_app/immutable/chunks/BdGMWZf_.js","_app/immutable/chunks/D_auFp29.js","_app/immutable/chunks/DvEoYHKW.js","_app/immutable/chunks/COEqP30R.js","_app/immutable/chunks/Dob3nYDb.js","_app/immutable/chunks/B_es5EVb.js","_app/immutable/chunks/BAURvd7r.js"];
export const stylesheets = ["_app/immutable/assets/components-knowledge.BBnxl3A5.css","_app/immutable/assets/components-ui.CpBAsA_o.css","_app/immutable/assets/components-interactive.B3DBDfDq.css","_app/immutable/assets/TransformationPreview.CREmcbox.css","_app/immutable/assets/2.Do03eUP1.css"];
export const fonts = [];
