import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/app/routeTree.gen.ts',
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Optimize dev server - exclude Monaco from eager loading
  optimizeDeps: {
    exclude: ['@monaco-editor/react'],
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'zustand',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('monaco')) return 'vendor-monaco';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) return 'vendor-syntax';
            if (id.includes('lucide')) return 'vendor-icons';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
