import path from 'path'

import { defineConfig, mergeConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

import { dependencies } from './package.json'
import baseConfig from './vite.base.config'

const externalPackages = [...Object.keys(dependencies || {})]

// Creating regexps of the packages to make sure subpaths of the
// packages are also treated as external
const regexpsOfPackages = externalPackages.map(
  (packageName) => new RegExp(`^${packageName}(/.*)?`),
)

// https://vitejs.dev/config/
export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [dts()],
    build: {
      minify: false,
      lib: {
        entry: [
          path.resolve(__dirname, 'src/index.ts'),
          path.resolve(__dirname, 'src/bin/index.ts'),
        ],
        formats: ['es'],
      },
      rollupOptions: {
        // inspired from: https://github.com/vitejs/vite/discussions/1736#discussioncomment-2621441
        // preserveModulesRoot: https://rollupjs.org/guide/en/#outputpreservemodulesroot
        output: {
          dir: 'dist',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].mjs',
        },
        external: [...regexpsOfPackages, /^node:.*$/],
      },
      target: 'esnext',
    },
  }),
)
