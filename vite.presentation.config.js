import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

/*
 * Presentation build: the regular game plus presentation/wrapper.js (SPACE-only scripted demo).
 * index.html stays untouched — the wrapper's script tag is injected into <head>, so it runs
 * before src/main.js and its key listener sees SPACE first.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      {
        name: 'presentation-wrapper',
        transformIndexHtml: () => [
          {
            tag: 'script',
            attrs: { type: 'module', src: '/presentation/wrapper.js' },
            injectTo: 'head',
          },
        ],
      },
    ],
    build: { outDir: 'dist-presentation' },
  }),
);
