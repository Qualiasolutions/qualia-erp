import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'build/**',
      'dist/**',
      'coverage/**',
      '.planning/**',
      'templates/**',
      'scripts/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // React Compiler rules: re-enabled as warnings (were 'off').
      // ~67 violations across hooks/ and components/ need fixing in a follow-up.
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'error',
    },
  },
];

export default eslintConfig;
