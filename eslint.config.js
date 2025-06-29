import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react'; // Changed import for clarity
import pluginReactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    ignores: [
      '.wxt/',
      '.output/',
      'dist/',
      'node_modules/',
      'public/',
      '**/*.d.ts', // Ensure .d.ts files are ignored globally
      '.prettierrc.mjs',
      'eslint.config.js'
    ]
  },
  // Main configuration for TypeScript files (type-aware)
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 12,
        sourceType: 'module',
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: pluginReact, // Use the imported plugin object
      'react-hooks': pluginReactHooks,
      prettier: prettierPlugin
    },
    settings: {
      // Settings moved here
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules, // Access rules from plugin
      ...pluginReactHooks.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'none',
          bracketSameLine: true
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn'
    }
  },
  // Lighter configuration for JS/MJS/CJS config files & specific TS config files
  {
    files: ['*.{js,mjs,cjs}', 'vitest.config.ts', 'wxt.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      },
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
      }
    },
    plugins: {
      prettier: prettierPlugin
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'none',
          bracketSameLine: true
        }
      ]
    }
  }
];
