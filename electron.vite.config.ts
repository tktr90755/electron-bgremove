import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['onnxruntime-node', 'sharp'],
      },
      commonjsOptions: {
        ignoreDynamicRequires: true,
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['onnxruntime-node', 'sharp'],
      },
      commonjsOptions: {
        ignoreDynamicRequires: true,
      },
    },
  },
  renderer: {
    // renderer側ではonnxruntime-nodeは使用しない
    // ブラウザ側で推論する場合はonnxruntime-webを使用
  }
})

