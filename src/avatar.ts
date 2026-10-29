// Un avatar de mentira mientras no haya avatares de verdad.
//
// Se dibuja aquí mismo en vez de traerlo de ningún sitio: no hay que
// subir nada, no se ve un hueco gris, y el día que haya avatares de
// verdad esto se cambia por la imagen del jugador sin tocar nada más.
//
// El color sale del nombre, así que el de cada uno es siempre el mismo.

const COLORES = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085']

function colorDe(nombre: string): string {
  let suma = 0
  for (const letra of nombre) suma = (suma + letra.charCodeAt(0)) % 997
  return COLORES[suma % COLORES.length]
}

/** Una imagen cuadrada con la inicial, lista para poner en un `src`. */
export function avatarDe(nombre: string): string {
  const inicial = (nombre.trim().charAt(0) || '?').toUpperCase()
  const color = colorDe(nombre)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><radialGradient id="g" cx="35%" cy="30%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>
<rect width="120" height="120" fill="${color}"/>
<rect width="120" height="120" fill="url(#g)"/>
<text x="60" y="60" fill="#fff" font-family="Georgia, serif" font-size="62" font-weight="700" text-anchor="middle" dominant-baseline="central">${inicial}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
