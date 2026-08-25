import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Server actions read process.env at call time, and several tests set
    // PLATFORM_ADMIN_EMAIL or RESEND_API_KEY. Isolating files keeps one test's
    // environment from leaking into another's.
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Prisma 7 generates into node_modules/.prisma/client. Next resolves that
      // bare specifier through its own bundler config; Vite needs it spelled out.
      // Modules under test import it for the WorkspaceRole enum.
      '.prisma/client': path.resolve(__dirname, './node_modules/.prisma/client'),
    },
  },
})
