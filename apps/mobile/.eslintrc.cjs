/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['expo', '../../.eslintrc.cjs'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['babel.config.js', 'jest.config.js'],
};
