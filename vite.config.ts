import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// La web se publica en https://hrcasbas.github.io/mesa_magic/, o sea en una
// subcarpeta y no en la raiz del dominio. Sin este `base`, el navegador
// buscaria los archivos en la raiz y la pagina saldria en blanco.
// Si algun dia se muda a Cloudflare Pages, esto pasa a ser '/'.
export default defineConfig({
  base: '/mesa_magic/',
  plugins: [react()],
})
