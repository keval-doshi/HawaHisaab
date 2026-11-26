import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['engine', 'server', 'web'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['engine/src/**/*.ts', 'server/src/**/*.ts'],
    },
  },
});
