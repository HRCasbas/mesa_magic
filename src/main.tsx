import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import './index.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('No existe el elemento #raiz en index.html')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// El trabajador de servicio, que es lo único que le falta al navegador
// para dejar instalar la web como una aplicación. No guarda nada: ver
// `public/sw.js`.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {
      // En local sin HTTPS, o si el navegador no quiere. No es grave: la
      // web funciona igual, solo que no se puede instalar.
    })
  })
}
