import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `base: './'` quiere decir que la pagina busca sus archivos al lado de si
// misma, en vez de en una ruta fija. Asi la misma compilacion vale en los dos
// sitios a la vez: en Cloudflare Pages, que cuelga de la raiz
// (https://mesa-magic.pages.dev), y en GitHub Pages, que cuelga de una
// subcarpeta (https://hrcasbas.github.io/mesa_magic/). Sin esto habria que
// elegir uno y el otro saldria en blanco.
//
// Ojo para mas adelante: el dia que la web tenga varias direcciones por
// dentro (/mesa/1234 y demas), lo relativo deja de valer y hay que poner
// aqui la ruta buena del sitio definitivo.
export default defineConfig({
  base: './',
  plugins: [react()],
})
