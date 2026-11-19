import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/', 'dist-presentation/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'presentation/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
  prettier,
];
