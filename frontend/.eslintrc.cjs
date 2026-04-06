module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@shared/lib/plugin-runtime'],
          message: 'Import plugin runtime through @kernel/plugin-system/*.',
        },
      ],
    }],
  },
  overrides: [
    {
      files: ['src/kernel/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
