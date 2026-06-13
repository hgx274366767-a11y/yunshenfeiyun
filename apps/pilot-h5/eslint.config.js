import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  vue: true,

  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },

  ignores: ['dist/**', 'node_modules/**'],
})
