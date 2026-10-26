# Mesa Magic

Magic: The Gathering a distancia, mesa contra mesa. Dos jugadores, cada uno
con su webcam apuntando a su mesa, un panel de contadores compartido y
pegatinas que se arrastran encima del vídeo.

**No es Commander.** Son partidas de dos, formatos normales tipo Modern,
Standard o Limited.

**Dirección:** https://magic-mesa.duelo.workers.dev

---

## Antes de tocar nada

Lee **`DIRECTRICES/ruta-de-tareas.md`**. Dice en qué fase estamos, por qué
cada cosa está donde está, y lo que no se negocia. Este proyecto comparte
base de datos con otra web: hay cosas que no se pueden tocar.

## Estado

**Fases 0 y 1 terminadas.** La web existe, se publica con HTTPS y tiene
puerta: sin entrar con correo y clave no se ve nada. El registro está
cerrado y las cuentas se crean a mano. Todavía no hay cámara ni partida.

## Cómo se trabaja

```powershell
# Ir al proyecto (siempre primero)
cd $env:USERPROFILE\develop\mesa_magic

# Arrancar en local, para ver los cambios al momento
npm run dev

# Comprobar que compila, con TypeScript y todo
npm run build

# Repasar el código
npm run lint
```

Con `npm run dev` corriendo, la web se recarga sola al guardar un archivo.
Para pararla, `Ctrl+C`.

**Publicar es empujar a `main`.** No hay que ejecutar nada más: Cloudflare
Pages compila y publica solo en un par de minutos.

## Qué lleva dentro

- **React 19 + TypeScript**, construido con **Vite**. TypeScript no es un
  capricho: el estado de la partida viaja de un navegador al otro y los dos
  lados tienen que entenderlo igual.
- **Sin base de datos para la partida.** Vídeo, vidas, contadores y pegatinas
  van de navegador a navegador. Solo los mazos y el historial se guardan.
- **Nada de dinero.** Todo el proyecto va en planes gratuitos.
