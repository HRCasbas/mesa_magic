# Mesa Magic

Web para jugar a Magic: The Gathering a distancia, mesa contra mesa por
webcam. **Partidas de dos, no Commander.** Corre en navegador, en PC y en
móvil.

---

## Antes de tocar nada

**Lee `DIRECTRICES/ruta-de-tareas.md` entero.** Es la memoria del proyecto:
las fases, el porqué de cada decisión, lo que no se negocia y lo que ya se
investigó y no hay que volver a investigar. Dice también qué toca ahora.

**Cuando tomes una decisión, la descubras o la cambies, actualiza ese
documento en el mismo commit.** Lo que se sabe pero no se escribe, se pierde.

---

## Con quién trabajas

**Héctor no es programador y no sabe PowerShell.** En cada entrega hay que
darle los comandos completos, para copiar y pegar, sin dar nada por hecho.

**Plan antes de código.** Quiere entender el alcance y decidir él: explícale
las opciones con sus pegas y recomiéndale una, en vez de empezar a escribir
archivos.

**Es muy bueno detectando problemas de uso reales.** Cuando dice que algo no
se entiende, tiene razón.

Escribe en **castellano**, sin anglicismos innecesarios, y en el código
también: nombres de variables, de funciones y comentarios en castellano. Los
textos que ve el usuario, con sus acentos puestos.

---

## Lo que no se negocia

- **No crear un proyecto nuevo de Supabase.** El plan gratis da dos proyectos
  activos por cuenta y los dos están cogidos. Magic vive en un esquema
  `magic` dentro de `cartas-pokemon` (ref `jwumnclmdsvcdkbsvikq`).
- **No tocar `public.marcas` ni `public.puntos`**: son de su web de Pokémon y
  están en uso.
- **No tocar nada de `gestor_gastos`.** Es otra aplicación suya, la de los
  gastos de la familia. Ni la carpeta ni su proyecto de Supabase.
- **Toda migración se prueba antes en una transacción con `rollback`.**
- **Sus datos se miran con su usuario puesto**, nunca con permisos de
  servidor.
- **Todo gratis.** Si una decisión obliga a pagar, se busca otra.

---

## Reglas de producto

1. **La partida en vivo no depende de la base de datos.** Vídeo, contadores y
   pegatinas van de navegador a navegador. Si Supabase está dormida, se juega
   igual.
2. **La cámara no se enciende sin sesión y sin mesa**, y siempre con un botón
   de cortar a la vista.
3. **El registro va cerrado.** Las cuentas se crean a mano.
4. **Las pegatinas en coordenadas normalizadas**, nunca en píxeles.
5. **Un número que necesita una explicación para no confundir, sobra.**

---

## Arquitectura

```
src/
  main.tsx            arranque de React
  App.tsx             la página
  comprobaciones.ts   si este aparato sirve para jugar
  index.css           hoja de estilo única; los colores en :root
public/               lo que se copia tal cual
DIRECTRICES/          la memoria del proyecto
.github/workflows/    publicar.yml: compila y publica al empujar a main
```

- **React 19 + TypeScript + Vite.** TypeScript no es un capricho: el estado
  de la partida viaja entre los dos navegadores y los dos lados tienen que
  entenderlo igual.
- **`vite.config.ts` lleva `base: '/mesa_magic/'`** porque la web se publica
  en una subcarpeta de github.io. Si se quita, la página sale en blanco.
- **Un solo tema, oscuro, y no se puede elegir.** Esta web se mira al lado
  del vídeo de una mesa; una pantalla blanca deslumbra y hace perder el
  detalle de las cartas.

---

## Comandos

```powershell
# Ir al proyecto (siempre primero)
cd $env:USERPROFILE\develop\mesa_magic

# Arrancar en local
npm run dev

# Comprobar antes de entregar
npm run build
npm run lint
```

Node.js está en `C:\Users\hecso\develop\.tools\node` (portátil, v24.22.1 LTS)
y en el PATH de usuario. No hay instalación en Archivos de programa.

**Publicar es empujar a `main`.** La acción de GitHub compila y publica sola
en un par de minutos.

---

## Comprobar antes de entregar

Nada se da por bueno sin ejecutarlo:

```powershell
npm run build
npm run lint
```

Los dos tienen que salir limpios. `npm run build` incluye el repaso de
TypeScript, así que si compila, los tipos cuadran.
