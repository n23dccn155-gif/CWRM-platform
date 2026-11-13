import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Dùng các bí danh đường dẫn khai báo trong tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/src/generated/**', '**/dist/**'],
  },
});
