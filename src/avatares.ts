import { supabase } from './supabase'

// Subir una foto de perfil.
//
// LA FOTO SE ENCOGE AQUÍ, EN EL NAVEGADOR, ANTES DE SUBIRLA. Una foto del
// móvil son cuatro megas, y de un avatar se ven ciento veinte píxeles: sin
// esto se gastaría el gigabyte gratuito en píxeles que nadie llega a ver,
// y cada partida empezaría descargando cuatro megas para dibujar una
// moneda.
//
// Se recorta en cuadrado por el centro, que es lo que hace todo el mundo
// con una foto de perfil, y así la moneda sale redonda sin deformar a
// nadie.

/** Lo que mide el lado del avatar ya subido. */
const LADO = 256

/** El almacén, con la carpeta de cada uno dentro. */
const ALMACEN = 'avatares'

/**
 * Recortar en cuadrado y encoger, sin salirse de la imagen.
 *
 * Se lee con `createImageBitmap`, que descomprime fuera del hilo de la
 * pantalla: con una foto grande, hacerlo con un `<img>` deja la web
 * congelada un segundo largo.
 */
async function prepararLaFoto(fichero: File): Promise<Blob> {
  const imagen = await createImageBitmap(fichero)
  const lado = Math.min(imagen.width, imagen.height)
  const x = (imagen.width - lado) / 2
  const y = (imagen.height - lado) / 2

  const lienzo = document.createElement('canvas')
  lienzo.width = LADO
  lienzo.height = LADO
  const pincel = lienzo.getContext('2d')
  if (!pincel) throw new Error('Este navegador no sabe recortar la foto.')
  pincel.drawImage(imagen, x, y, lado, lado, 0, 0, LADO, LADO)
  imagen.close()

  const trozo = await new Promise<Blob | null>((listo) =>
    lienzo.toBlob(listo, 'image/jpeg', 0.85),
  )
  if (!trozo) throw new Error('No se ha podido preparar la foto.')
  return trozo
}

/**
 * Subir la foto y dejarla apuntada en la ficha del jugador.
 *
 * Devuelve la dirección que hay que usar para enseñarla.
 *
 * La dirección lleva un número al final que cambia en cada subida. El
 * archivo se llama siempre igual —así no se acumulan fotos viejas— y sin
 * ese número el navegador seguiría enseñando la anterior durante horas.
 */
export async function subirAvatar(idUsuario: string, fichero: File): Promise<string> {
  const foto = await prepararLaFoto(fichero)
  const ruta = `${idUsuario}/perfil.jpg`

  const { error: fallo } = await supabase.storage
    .from(ALMACEN)
    .upload(ruta, foto, { contentType: 'image/jpeg', upsert: true })
  if (fallo) throw fallo

  const { data } = supabase.storage.from(ALMACEN).getPublicUrl(ruta)
  const direccion = `${data.publicUrl}?v=${Date.now()}`

  const { error: fallo2 } = await supabase
    .from('jugadores')
    .update({ avatar: direccion })
    .eq('id', idUsuario)
  if (fallo2) throw fallo2

  return direccion
}

/** Quitar la foto y volver a la inicial de siempre. */
export async function quitarAvatar(idUsuario: string): Promise<void> {
  await supabase.storage.from(ALMACEN).remove([`${idUsuario}/perfil.jpg`])
  const { error: fallo } = await supabase
    .from('jugadores')
    .update({ avatar: null })
    .eq('id', idUsuario)
  if (fallo) throw fallo
}

/**
 * ¿Es una dirección de nuestro almacén?
 *
 * La dirección del avatar del rival llega por la mesa, o sea de otro
 * navegador. Sin esta comprobación, el de enfrente podría poner cualquier
 * dirección y tu navegador iría a pedirla: le estarías diciendo a un
 * servidor ajeno que estás jugando, y desde dónde.
 */
export function esAvatarDeLosNuestros(direccion: string | null | undefined): boolean {
  if (!direccion) return false
  try {
    const url = new URL(direccion)
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.includes(`/public/${ALMACEN}/`)
    )
  } catch {
    return false
  }
}
