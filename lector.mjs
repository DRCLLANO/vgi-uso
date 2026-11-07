// Lee el panel público de GoatCounter y guarda datos/uso.json.
// Uso: node lector.mjs   (Node 20 o más reciente; sin dependencias)
// Si la lectura no cuadra, termina con error y deja intacto el archivo anterior.
import {readFile, writeFile, mkdir, appendFile} from 'node:fs/promises';
import {leer, ORIGEN} from './nucleo.mjs';

const UA = 'vgi-uso/1.0 (+https://drcllano.github.io/vgi-uso/)';
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function pedir(ruta){
  let ultimo;
  for (let intento = 0; intento < 4; intento++) {
    await esperar(300); // respeta el límite de peticiones del panel
    try {
      const r = await fetch(ORIGEN + ruta, {headers: {'User-Agent': UA, Accept: 'application/json'}, signal: AbortSignal.timeout(30000)});
      if (!r.ok) throw new Error(`GoatCounter respondió ${r.status} en ${ruta}`);
      return await r.json();
    } catch (e) { ultimo = e; await esperar(2000 * (intento + 1)); }
  }
  throw ultimo;
}

const datos = await leer(pedir);
const archivo = 'datos/uso.json';
let previo = null;
try { previo = JSON.parse(await readFile(archivo, 'utf8')); } catch {}
const sinHora = d => JSON.stringify({...d, leido: null});
const cambio = !previo || sinHora(previo) !== sinHora(datos);

await mkdir('datos', {recursive: true});
await writeFile(archivo, JSON.stringify(datos));
const ses = datos.dias.reduce((t, d) => t + d.sesiones, 0), ap = datos.dias.reduce((t, d) => t + d.aperturas, 0);
console.log(`Lectura ${datos.leido}: ${ses} sesiones, ${ap} aperturas, ${datos.audiencia.todo.pais.length} países; cambió: ${cambio}`);
if (datos.fichas_sin_clasificar.length) console.log('Fichas sin clasificar por eje: ' + datos.fichas_sin_clasificar.join(', '));
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `cambio=${cambio}\n`);
