import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactCompiler from 'eslint-plugin-react-compiler'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'build']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'react-compiler': reactCompiler,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    // [AI_HARNESS_RULES]: AI가 스스로 추가하는 규칙 영역
    // 모바일 최적화 및 권한 검증 관련 규칙이 여기에 추가됩니다.
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error', // React Compiler를 위해 정석대로 'error' 복구
      'react-hooks/set-state-in-effect': 'warn', // 가독성을 위해 Warn 유지
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-compiler/react-compiler': 'error', // 컴파일러 최적화 방해 요소 체크
    },
  },
])
