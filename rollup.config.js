import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { addJsExtension } from './rollup-plugins.js';

export default {
  input: 'dist/index.js',
  output: {
    dir: 'lib',
    format: 'esm',
    preserveModules: true,
    preserveModulesRoot: 'dist',
    entryFileNames: '[name].js'
  },
  plugins: [
    resolve({ extensions: ['.js'] }),
    commonjs(),
    addJsExtension()
  ]
};
