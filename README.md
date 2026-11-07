# Uso de VGI Digital

Tablero público con el uso real de [VGI Digital](https://drcllano.github.io/vgi-herramienta-digital/), la herramienta de escalas de la Valoración Geriátrica Integral.

**Ver el tablero:** https://drcllano.github.io/vgi-uso/

## Qué hace

- Cada 15 minutos, una acción de GitHub (`.github/workflows/actualizar.yml`) ejecuta `lector.mjs`, que lee el panel público de GoatCounter de la app ([vgidigitalco.goatcounter.com](https://vgidigitalco.goatcounter.com)) y guarda el resultado en `datos/uso.json`.
- Antes de guardar, el lector comprueba que las sesiones por día, por hora y por ficha cuadren entre sí y con el total del panel. Si algo no cuadra, no publica nada nuevo.
- Cuando las cifras cambian, la lectura queda en el historial del repositorio con su fecha y hora (hora de Colombia). Ese historial es el registro público y verificable del uso.
- La página (`index.html`, `app.js`, `estilos.css`) muestra los datos por periodo (7 días, 30 días o todo) y por secciones: panorama, día a día, reloj, mapa de calor, fichas, audiencia, y datos y método, con descargas en CSV.

Este repositorio solo lee estadísticas públicas y agregadas. No toca el código ni el sitio de VGI Digital, y no usa claves ni datos personales.

## Qué se cuenta

- GoatCounter cuenta sesiones, no personas, y no usa cookies.
- Una apertura de ficha se registra una vez por sesión: mide consultas a cada escala, no cálculos completados ni uso clínico.
- Países, dispositivos, sistemas y referentes se cuentan sobre visitas más eventos; sus porcentajes son aproximados.
- La analítica empezó el 28 de septiembre de 2026 a las 22:00 (hora de Colombia).

## Ejecutar el lector a mano

```
node lector.mjs
```

Requiere Node 20 o más reciente; no tiene dependencias. La gráfica usa [d3](https://d3js.org) (licencia ISC, en `LICENCIA-d3.txt`).

## Cómo citar

Llano Ceballos CC. Uso de VGI Digital [tablero en línea]. Datos de GoatCounter (vgidigitalco), actualizados cada 15 minutos. Disponible en: https://drcllano.github.io/vgi-uso/
