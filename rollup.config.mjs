import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import builtinModules from 'builtin-modules/static.js';
import pkg from './package.json' with { type: 'json' };

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const config = {
  strictDeprecations: true,
  input: 'src/mongodb-queue.ts',

  // Specify here external modules which you don't want to include in your
  // bundle (for instance: 'lodash', 'moment' etc.)
  // https://rollupjs.org/guide/en#external-e-external
  external: [
    ...builtinModules,
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ],

  plugins: [
    // Allows node_modules resolution
    nodeResolve({ extensions, preferBuiltins: true }),

    // Allow bundling cjs modules. Rollup doesn't understand cjs
    commonjs(),

    // Compile TypeScript/JavaScript files
    babel({
      extensions,
      babelHelpers: 'bundled',
      include: ['src/**/*'],
      exclude: ['**/specs/**'],
    }),
  ],

  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'default',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
};

export default config;
