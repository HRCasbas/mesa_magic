// El avatar: la foto si la hay, y si no la inicial dibujada aquí mismo.
//
// EL DIBUJO NO SOBRA AHORA QUE SE PUEDEN SUBIR FOTOS: es lo que se ve
// mientras nadie ha subido ninguna, y es lo que evita el hueco gris en la
// moneda la primera vez que se juega. Se dibuja aquí en vez de traerlo de
// ningún sitio, así que no falla ni tarda.
//
// El color sale del nombre, así que el de cada uno es siempre el mismo.

const COLORES = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085']

function colorDe(nombre: string): string {
  let suma = 0
  for (const letra of nombre) suma = (suma + letra.charCodeAt(0)) % 997
  return COLORES[suma % COLORES.length]
}

/**
 * La imagen cuadrada del jugador, lista para poner en un `src`.
 *
 * Con `foto` devuelve la foto; sin ella, la inicial sobre su color.
 */
export function avatarDe(nombre: string, foto?: string | null): string {
  if (foto) return foto
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
