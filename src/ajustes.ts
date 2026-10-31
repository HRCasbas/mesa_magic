// Lo que elige el usuario una vez y no se le vuelve a preguntar.
//
// EL IDIOMA SE ELIGE UNA VEZ (Héctor, 28/10/2026): «en la sección de
// cartas nunca preguntes el idioma, siempre español y punto. Como mucho,
// en ajustes de cuenta, preferencia de idioma, pero el idioma se elige una
// vez, no decenas de veces».
//
// Tiene razón, y es la misma regla que la 9: una pregunta que hay que
// contestar cada vez es una pregunta mal puesta.

export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'Inglés' },
  { codigo: 'fr', nombre: 'Francés' },
  { codigo: 'de', nombre: 'Alemán' },
  { codigo: 'it', nombre: 'Italiano' },
  { codigo: 'pt', nombre: 'Portugués' },
  { codigo: 'ja', nombre: 'Japonés' },
]

const CAJON = 'magic:idioma'
const POR_DEFECTO = 'es'

export function idiomaElegido(): string {
  try {
    return localStorage.getItem(CAJON) || POR_DEFECTO
  } catch {
    return POR_DEFECTO
  }
}

export function guardarIdioma(codigo: string) {
  try {
    localStorage.setItem(CAJON, codigo)
  } catch {
    // Modo privado. Se queda en español hasta que cierre la pestaña.
  }
}

// ---- La carta ampliada, del revés ----
//
// La cámara del rival apunta a SU mesa, así que sus cartas te llegan
// cabeza abajo: es como se ven de verdad desde el otro lado (Héctor,
// 01/11/2026). Por eso viene marcado. Se guarda porque es de las cosas
// que se eligen una vez y valen para siempre.

const CAJON_DEL_GIRO = 'magic:ampliar-girada'

export function ampliarGirada(): boolean {
  try {
    return localStorage.getItem(CAJON_DEL_GIRO) !== 'no'
  } catch {
    return true
  }
}

export function guardarGiro(girar: boolean) {
  try {
    localStorage.setItem(CAJON_DEL_GIRO, girar ? 'si' : 'no')
  } catch {
    // En modo privado no se puede guardar. Se gira igual, solo que habrá
    // que volver a marcarlo la próxima vez.
  }
}
