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
