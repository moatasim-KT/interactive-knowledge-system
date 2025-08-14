import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://github.com/sveltejs/svelte-preprocess
    // for more information about preprocessors
    preprocess: preprocess({
        typescript: {
            tsconfigFile: './tsconfig.json'
        }
    }),
    compilerOptions: {
        runes: true
    },
    kit: {
        adapter: adapter(),
        alias: {
            '$lib': path.resolve('./src/lib'),
            '$lib/*': path.resolve('./src/lib/*'),
            '@': path.resolve('./src'),
            '@/*': path.resolve('./src/*'),
            '@modelcontextprotocol/sdk/*': path.resolve('./node_modules/@modelcontextprotocol/sdk/dist/esm/*')
        }
    }
};

export default config;
