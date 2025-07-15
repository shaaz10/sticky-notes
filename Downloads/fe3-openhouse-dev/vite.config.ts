import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: 'localhost',
    port: 3117,
    strictPort: true,
    open: true,
    cors: true, // ✅ Enable CORS
  }
  
});



        
        
    