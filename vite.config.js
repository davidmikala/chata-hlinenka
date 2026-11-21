import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // když je port obsazený, Vite si sám vezme další volný; prohlížeč se otevře automaticky
  server: { port: 5174, open: true },
});
