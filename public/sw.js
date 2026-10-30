// El trabajador de servicio de Mesa Magic.
//
// NO GUARDA NADA EN CACHE, Y ES A PROPOSITO. Esta aqui solo porque el
// navegador no deja instalar una web sin uno. Guardar copias traeria el
// problema de siempre —servir una version vieja y volverse loco buscando
// por que no se ve el cambio—, y aqui ya paso una vez con la cache de
// Cloudflare. Sin partida no hay nada que hacer sin conexion, asi que
// guardar la aplicacion para jugar sin internet no sirve de nada.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
