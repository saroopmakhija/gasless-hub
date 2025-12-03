import { cloudflare } from '@cloudflare/vite-plugin'
import { sharedConfig } from '@workspace/config-vite'
import { defineConfig, mergeConfig } from 'vite'

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [cloudflare()],
    define: {
      'global': 'globalThis',
    },
    resolve: {
      alias: {
        'buffer': 'buffer/',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      include: ['buffer'],
    },
  }),
)
