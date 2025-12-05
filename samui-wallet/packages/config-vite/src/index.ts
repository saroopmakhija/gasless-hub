import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'

export const sharedConfig = defineConfig({
  plugins: [
    analyzer({
      enabled: !!process.env['ANALYZE'],
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: [
      '@solana/web3.js',
      '@solana/spl-token',
      '@circle-fin/bridge-kit',
      '@circle-fin/adapter-viem-v2',
      '@circle-fin/adapter-solana',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})
