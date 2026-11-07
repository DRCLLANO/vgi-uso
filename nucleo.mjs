// Núcleo del lector de vgi-uso: lee el panel público de GoatCounter (vgidigitalco)
// y arma un solo objeto con el uso por día, por hora, por ficha y la audiencia.
// No usa APIs de Node: recibe una función pedir(ruta) que devuelve el JSON del panel.

export const ORIGEN = 'https://vgidigitalco.goatcounter.com';
export const INICIO = '2026-09-28';
const RUTA_APP = '/vgi-herramienta-digital';

// id de la ficha: [escala, eje de la VGI, grupo, disponible desde]
export const META = {
  barthel: ['Índice de Barthel', 'Funcional', 'Actividades de la vida diaria', '2026-09-28'],
  mna: ['MNA-SF', 'Clínico', 'Nutrición y deglución', '2026-09-28'],
  lawton: ['Lawton y Brody', 'Funcional', 'Actividades de la vida diaria', '2026-09-28'],
  charlson: ['Charlson', 'Clínico', 'Comorbilidad', '2026-09-28'],
  frail: ['FRAIL', 'Funcional', 'Fragilidad', '2026-09-28'],
  sarcf: ['SARC-F', 'Funcional', 'Sarcopenia', '2026-09-28'],
  cfs: ['Clinical Frailty Scale', 'Funcional', 'Fragilidad', '2026-09-28'],
  downton: ['Downton modificada', 'Clínico', 'Caídas', '2026-09-28'],
  eat10: ['EAT-10', 'Clínico', 'Nutrición y deglución', '2026-09-28'],
  cam: ['CAM', 'Mental', 'Delirium', '2026-09-28'],
  sppb: ['SPPB', 'Funcional', 'Funciones corporales', '2026-09-28'],
  painad: ['PAINAD', 'Clínico', 'Dolor', '2026-09-28'],
  opioides: ['Conversor de opioides', 'Paliativos y pronóstico', 'Manejo del dolor', '2026-09-28'],
  mmse: ['MMSE', 'Mental', 'Deterioro cognitivo', '2026-09-28'],
  preopger: ['Prequirúrgica geriátrica', 'Clínico', 'Valoración prequirúrgica', '2026-10-01'],
  yesavage: ['Yesavage GDS-15', 'Mental', 'Conducta y afecto', '2026-09-28'],
  g8: ['G8', 'Clínico', 'Oncogeriatría', '2026-09-28'],
  minicog: ['Mini-Cog', 'Mental', 'Deterioro cognitivo', '2026-09-28'],
  pps: ['PPS', 'Paliativos y pronóstico', 'Necesidades paliativas', '2026-09-28'],
  ppi: ['PPI', 'Paliativos y pronóstico', 'Pronóstico en enfermedad avanzada', '2026-09-28'],
  ves13: ['VES-13', 'Clínico', 'Oncogeriatría', '2026-09-28'],
  memoria: ['Trastornos de memoria', 'Mental', 'Deterioro cognitivo', '2026-09-28'],
  fesi: ['Short FES-I', 'Clínico', 'Caídas', '2026-09-28'],
  norton: ['Norton', 'Clínico', 'Piel', '2026-09-28'],
  pfeffer: ['Pfeffer (FAQ)', 'Funcional', 'Actividades de la vida diaria', '2026-09-28'],
  necpal: ['NECPAL CCOMS-ICO', 'Paliativos y pronóstico', 'Necesidades paliativas', '2026-09-28'],
  mrc: ['MRC score', 'Funcional', 'Funciones corporales', '2026-09-28'],
  charlsonco: ['Charlson · Colombia', 'Clínico', 'Comorbilidad', '2026-09-28'],
  gad7: ['GAD-7', 'Mental', 'Conducta y afecto', '2026-09-28'],
  at4: ['4AT', 'Mental', 'Delirium', '2026-09-28'],
  fried: ['Fenotipo de Fried', 'Funcional', 'Fragilidad', '2026-09-28'],
  gdsreisberg: ['GDS de Reisberg', 'Mental', 'Estadificación', '2026-09-28'],
  eft: ['EFT', 'Clínico', 'Futilidad en TAVI', '2026-10-01'],
  fts: ['FTS', 'Clínico', 'Futilidad en TAVI', '2026-10-01'],
  vulnerabilidad: ['Vulnerabilidad social', 'Social', 'Riesgo social', '2026-09-28'],
  npi: ['NPI', 'Mental', 'Conducta y afecto', '2026-09-28'],
  autoperc: ['Autopercepción de salud', 'Social', 'Calidad de vida y redes', '2026-09-28'],
  zarit: ['Zarit', 'Social', 'Cuidador', '2026-09-28'],
  dsmdelirium: ['Criterios DSM 5-TR · delirium', 'Mental', 'Delirium', '2026-09-28'],
  cdr: ['CDR', 'Mental', 'Estadificación', '2026-09-28'],
  rcri: ['RCRI', 'Clínico', 'Valoración prequirúrgica', '2026-10-01'],
  ashworth: ['Ashworth modificada', 'Funcional', 'Funciones corporales', '2026-09-28'],
  pap: ['PaP Score', 'Paliativos y pronóstico', 'Pronóstico en enfermedad avanzada', '2026-09-28'],
  mos: ['MOS', 'Social', 'Calidad de vida y redes', '2026-09-28'],
  walter: ['Índice de Walter', 'Paliativos y pronóstico', 'Pronóstico de mortalidad', '2026-09-28'],
  lee: ['Índice de Lee', 'Paliativos y pronóstico', 'Pronóstico de mortalidad', '2026-09-28'],
  maltrato: ['Signos de alarma de maltrato', 'Social', 'Riesgo social', '2026-09-28'],
  eq5d: ['EuroQol-5D-5L', 'Funcional', 'Participación', '2026-09-28']
};

const NOMBRES = {
  '(unknown)': 'Desconocido', Phones: 'Celulares', 'Tablets and large phones': 'Tabletas y celulares grandes',
  'Computer monitors': 'Computadores', 'Computer monitors larger than HD': 'Monitores mayores que HD',
  Mexico: 'México', Peru: 'Perú', Spain: 'España', 'Dominican Republic': 'República Dominicana',
  'United Kingdom': 'Reino Unido', 'United States': 'Estados Unidos', Panama: 'Panamá', Brazil: 'Brasil',
  Netherlands: 'Países Bajos', Norway: 'Noruega', 'New Zealand': 'Nueva Zelanda', Germany: 'Alemania',
  France: 'Francia', Italy: 'Italia', Canada: 'Canadá', Switzerland: 'Suiza', Belgium: 'Bélgica', Japan: 'Japón',
  Ireland: 'Irlanda', Sweden: 'Suecia', 'South Korea': 'Corea del Sur', Unknown: 'Desconocido'
};

// Paneles laterales del tablero de GoatCounter (número de widget)
const PANELES = {referente: 2, navegador: 4, sistema: 5, pais: 6, pantalla: 8};

export function hoyBogota(){
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}
export function sumarDias(iso, n){
  const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10);
}
const desescapar = s => s.replace(/&#34;|&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const numero = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;
const rellenar = a => { const b = (a || []).slice(0, 24).map(v => Number(v) || 0); while (b.length < 24) b.push(0); return b; };

async function leerRutas(pedir, ini, fin){
  const q = `period-start=${ini}&period-end=${fin}&group=day&max=1`;
  const primera = await pedir(`/?reload=t&${q}`);
  let html = primera.widgets || '';
  const ids = new Set([...html.matchAll(/<tr id="[^"]+" data-id="(\d+)"/g)].map(m => m[1]));
  for (let p = 0; p < 30; p++) {
    const sig = await pedir(`/load-widget?widget=0&${q}&exclude=${[...ids].join(',')}`);
    const trozo = sig.html || '';
    const nuevos = [...trozo.matchAll(/data-id="(\d+)"/g)].map(m => m[1]).filter(i => !ids.has(i));
    if (!nuevos.length) break;
    html += trozo; nuevos.forEach(i => ids.add(i));
    if (!sig.more) break;
  }
  const filas = [], vistas = new Set();
  const re = /<tr id="([^"]+)" data-id="(\d+)" data-count="(\d+)"([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(html))) {
    if (vistas.has(m[2])) continue; vistas.add(m[2]);
    const s = m[4].match(/data-stats="([^"]+)"/);
    filas.push({ruta: desescapar(m[1]), total: Number(m[3]), stats: s ? JSON.parse(desescapar(s[1])) : []});
  }
  return filas;
}

async function leerPanel(pedir, widget, ini, fin){
  const out = []; let offset = 0;
  for (let p = 0; p < 40; p++) {
    const j = await pedir(`/load-widget?widget=${widget}&total=1000000&offset=${offset}&period-start=${ini}&period-end=${fin}&filter=`);
    const partes = (j.html || '').split('data-key="').slice(1);
    for (const parte of partes) {
      const nombre = (parte.match(/class="cutoff">([^<]*)</) || [])[1];
      const n = numero((parte.match(/<span class="col-count">([^<]+)/) || [])[1]);
      if (nombre != null && n > 0) { const k = nombre.trim(); out.push([NOMBRES[k] || k, n]); }
    }
    if (!j.more || !partes.length) break;
    offset += partes.length;
  }
  // agrupa nombres repetidos (p. ej. dos variantes de Facebook quedan separadas, pero no duplicados exactos)
  const m = new Map(); out.forEach(([k, n]) => m.set(k, (m.get(k) || 0) + n));
  return [...m].sort((a, b) => b[1] - a[1]);
}

export async function leer(pedir, fin = hoyBogota()){
  const filas = await leerRutas(pedir, INICIO, fin);
  const app = filas.find(f => f.ruta === RUTA_APP);
  if (!app) throw new Error('El panel no trajo la ruta ' + RUTA_APP);
  const fechas = [];
  for (let d = INICIO; d <= fin; d = sumarDias(d, 1)) fechas.push(d);
  const porDia = stats => Object.fromEntries((stats || []).map(s => [s.day, s]));
  const A = porDia(app.stats);
  const F = filas.filter(f => f.ruta.startsWith('ficha/')).map(f => ({id: f.ruta.slice(6), total: f.total, d: porDia(f.stats)}));

  const dias = fechas.map(fecha => {
    const h = rellenar(A[fecha] && A[fecha].hourly);
    const ah = Array(24).fill(0);
    F.forEach(f => rellenar(f.d[fecha] && f.d[fecha].hourly).forEach((v, i) => { ah[i] += v; }));
    const s = A[fecha] && A[fecha].daily != null ? A[fecha].daily : h.reduce((a, b) => a + b, 0);
    const ap = F.reduce((t, f) => t + ((f.d[fecha] && f.d[fecha].daily) || 0), 0);
    return {fecha, sesiones: s, aperturas: ap, h, ah};
  });

  const ids = [...new Set(Object.keys(META).concat(F.map(f => f.id)))];
  const fichas = ids.map(id => {
    const f = F.find(x => x.id === id), m = META[id] || [id, 'Sin clasificar', 'Sin clasificar', INICIO];
    return {id, escala: m[0], eje: m[1], grupo: m[2], desde: m[3], total: f ? f.total : 0,
      dia: fechas.map(fecha => (f && f.d[fecha] && f.d[fecha].daily) || 0)};
  }).sort((a, b) => b.total - a.total);

  const periodos = {'7': [sumarDias(fin, -6), fin], '30': [sumarDias(fin, -29), fin], todo: [INICIO, fin]};
  const audiencia = {};
  for (const [k, [ini, f2]] of Object.entries(periodos)) {
    audiencia[k] = {desde: ini < INICIO ? INICIO : ini, hasta: f2};
    for (const [dim, w] of Object.entries(PANELES)) audiencia[k][dim] = await leerPanel(pedir, w, ini < INICIO ? INICIO : ini, f2);
  }

  // comprobaciones: si algo no cuadra, se lanza un error y no se publica nada nuevo
  const sumaSes = dias.reduce((t, d) => t + d.sesiones, 0);
  const sumaHoras = dias.reduce((t, d) => t + d.h.reduce((a, b) => a + b, 0), 0);
  const sumaFichas = fichas.reduce((t, f) => t + f.total, 0), sumaApDia = dias.reduce((t, d) => t + d.aperturas, 0);
  const problemas = [];
  if (sumaSes !== app.total) problemas.push(`las sesiones por día suman ${sumaSes} y el panel dice ${app.total}`);
  if (sumaHoras !== sumaSes) problemas.push(`las sesiones por hora suman ${sumaHoras} y por día ${sumaSes}`);
  if (sumaFichas !== sumaApDia) problemas.push(`las aperturas por ficha suman ${sumaFichas} y por día ${sumaApDia}`);
  if (F.length < 40) problemas.push(`solo llegaron ${F.length} fichas`);
  if (!audiencia.todo.pais.length) problemas.push('no llegaron los países');
  if (problemas.length) throw new Error('Lectura inconsistente: ' + problemas.join('; '));

  return {
    version: 1, fuente: ORIGEN, ruta: RUTA_APP, zona: 'America/Bogota', inicio: INICIO, fin,
    leido: new Date().toISOString(), fechas, dias, fichas, audiencia,
    fichas_sin_clasificar: F.filter(f => !META[f.id]).map(f => f.id)
  };
}
