import nextConfig from 'eslint-config-next/core-web-vitals';
import nextTypescriptConfig from 'eslint-config-next/typescript';

export default [
  ...nextConfig,
  ...nextTypescriptConfig,
  {
    // Disable rules that produce false positives in this codebase:
    // - react-hooks/purity: fires on Date.now() in server components (safe, runs once/request)
    // - react-hooks/set-state-in-effect: fires on valid initialization patterns in effects
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
