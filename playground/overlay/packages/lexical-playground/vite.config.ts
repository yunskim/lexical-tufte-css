/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import babel from '@rollup/plugin-babel';
import react from '@vitejs/plugin-react';
import {resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {defineConfig, searchForWorkspaceRoot, type PluginOption, type UserConfig} from 'vite';

import transformErrorMessages from '../../scripts/error-codes/transform-error-messages.mjs';
import viteMonorepoResolutionPlugin from '../../scripts/vite/lexicalMonorepoPlugin.ts';
import viteCopyEsm from './viteCopyEsm.ts';
import viteCopyExcalidrawAssets from './viteCopyExcalidrawAssets.ts';

// react() returns Plugin[]; widening it to PluginOption[] here lets the plugins
// array below infer as PluginOption[] (every other entry is a Plugin, which is
// a PluginOption) without annotating the whole array. That matters because
// comparing the inferred plugin union against vite's recursively-defined
// PluginOption type overflows with "Excessive stack depth" on newer vite type
// definitions; widening the one array-valued entry keeps the check shallow.
const reactPlugins: PluginOption[] = react();
const sourceDir = process.env.TUFTE_PLAYGROUND_SOURCE_DIR;
const tufteRoot = sourceDir
  ? pathToFileURL(resolve(sourceDir) + sep)
  : new URL('../../../lexical-tufte-css/', import.meta.url);
const tufte = (path: string) => fileURLToPath(new URL(path, tufteRoot));

// https://vitejs.dev/config/
export default defineConfig(
  ({mode}): UserConfig => ({
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
        {find: /^@lexical-tufte\/editor-react\/styles\.css$/, replacement: tufte('packages/editor-react/src/styles.css')},
        {find: /^@lexical-tufte\/editor-react$/, replacement: tufte('packages/editor-react/src/index.ts')},
        {find: /^@lexical-tufte\/lexical$/, replacement: tufte('packages/lexical/src/index.ts')},
        {find: /^@lexical-tufte\/document$/, replacement: tufte('packages/document/src/index.ts')},
        {find: /^@lexical-tufte\/editor-ports$/, replacement: tufte('packages/editor-ports/src/index.ts')},
      ],
    },
    server: {
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(tufteRoot)],
      },
    },
    build: {
      outDir: 'build',
      rollupOptions: {
        input: {
          main: new URL('./index.html', import.meta.url).pathname,
          split: new URL('./split/index.html', import.meta.url).pathname,
        },
      },
      target: 'es2022',
      ...(mode === 'production'
        ? {
            minify: 'terser',
            terserOptions: {
              compress: {
                toplevel: true,
              },
              keep_classnames: true,
            },
          }
        : {minify: false}),
    },
    plugins: [
      viteMonorepoResolutionPlugin(),
      babel({
        babelHelpers: 'bundled',
        babelrc: false,
        configFile: false,
        exclude: '**/node_modules/**',
        extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
        plugins: [
          '@babel/plugin-transform-flow-strip-types',
          ...(mode !== 'production'
            ? [
                [
                  transformErrorMessages,
                  {
                    noMinify: true,
                  },
                ],
              ]
            : []),
        ],
        presets: [['@babel/preset-react', {runtime: 'automatic'}]],
      }),
      ...reactPlugins,
      ...viteCopyExcalidrawAssets(),
      viteCopyEsm(),
    ],
  }),
);
