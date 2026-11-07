/* Uso de VGI Digital: página pública que lee datos/uso.json (generado cada 15 minutos por lector.mjs). */
(function(){
'use strict';

const URL_DATOS = 'datos/uso.json';
const REPO = 'https://github.com/DRCLLANO/vgi-uso';
const RECARGA_MS = 5 * 60 * 1000;
const FEST = new Set(['2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26', '2027-05-01', '2027-05-10', '2027-05-31', '2027-06-07',
  '2027-07-05', '2027-07-20', '2027-08-07', '2027-08-16', '2027-10-18', '2027-11-01', '2027-11-15', '2027-12-08', '2027-12-25']);
const EJES = ['Funcional', 'Clínico', 'Mental', 'Paliativos y pronóstico', 'Social'];
const VISTAS = ['panorama', 'dia', 'reloj', 'calor', 'fichas', 'audiencia', 'datos'];
const NOMBRE_P = {'7': 'Últimos 7 días', '30': 'Últimos 30 días', todo: 'Desde el inicio'};

const L = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['$', '']});
const fInt = L.format(',d'), f1 = L.format(',.1f'), f2 = L.format(',.2f');
const fPct = v => L.format('.0f')(v * 100) + ' %';
const fPctFino = v => v >= 0.01 ? fPct(v) : (v > 0 ? '<1 %' : '0 %');
const fCambio = v => { const r = Math.round(v * 100); return r === 0 ? 'sin cambio' : (r > 0 ? '+' : '−') + Math.abs(r) + ' %'; };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DSL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ORD = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const fCorta = s => { const p = s.split('-'); return (+p[2]) + ' ' + MES[+p[1] - 1]; };
const fLarga = s => { const p = s.split('-'); return (+p[2]) + ' de ' + MESL[+p[1] - 1]; };
const dSem = s => new Date(s + 'T12:00:00Z').getUTCDay();
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = () => ({c1: css('--c1'), c2: css('--c2'), c3: css('--c3'), c4: css('--c4'), c5: css('--c5'), c6: css('--c6'), gris: css('--gris'), rejilla: css('--rejilla'), tinta: css('--tinta'), tenue: css('--tenue'), tarjeta: css('--tarjeta'), terracota: css('--terracota')});
const colorEje = e => { const c = C(); return [c.c1, c.c2, c.c3, c.c4, c.c5][EJES.indexOf(e)] || c.gris; };

const estado = {datos: null, p: 'todo', v: 'panorama', metrica: 'sesiones', orden: ['aperturas', -1], buscar: ''};

/* ---------- utilidades de DOM ---------- */
function h(tag, attrs, ...hijos){
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v);
  }
  hijos.flat().forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return el;
}
const b = t => h('b', null, t);
function titulo(n, ceja, texto, id){ return h('div', {class: 'titulo-vista'}, h('div', {class: 'ceja', text: n + ' · ' + ceja}), h('h2', {id, text: texto})); }
function tarjeta(tit, nota, ...hijos){ return h('div', {class: 'tarjeta'}, tit ? h('h3', {text: tit}) : null, nota ? (nota.nodeType ? nota : h('p', {class: 'nota', text: nota})) : null, ...hijos); }
function cifra(et, num, sub, grande){ return h('div', {class: 'cifra' + (grande ? ' grande' : '')}, h('div', {class: 'et', text: et}), h('div', {class: 'num', text: num}), sub ? h('div', {class: 'sub'}, sub) : null); }
function cambioSpan(v, txt){ if (v == null || !isFinite(v)) return h('span', null, txt || ''); return h('span', {class: v > 0.005 ? 'sube' : v < -0.005 ? 'baja' : ''}, fCambio(v) + (txt || '')); }
function leyenda(items){ return h('div', {class: 'leyenda'}, items.map(([c, t, aro]) => h('span', null, h('i', aro ? {class: 'aro', style: 'border-color:' + c} : {style: 'background:' + c}), t))); }
function svgDe(cont, W, H){ const s = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%'); cont.replaceChildren(s.node()); return s; }
function anchoTexto(svg, t){ const n = svg.append('text').text(t); const w = n.node().getComputedTextLength(); n.remove(); return w || String(t).length * 6.5; }
function crearTip(cont){
  const el = h('div', {class: 'tip'}); cont.append(el);
  return {
    mostrar(e, tit, lineas){
      el.replaceChildren(h('div', {class: 't1', text: tit}), ...lineas.map(([c, t]) => h('div', null, c ? h('span', {class: 'sw', style: 'background:' + c}) : null, t)));
      el.style.display = 'block';
      const caja = cont.getBoundingClientRect();
      let x = e.clientX - caja.left + 14, y = e.clientY - caja.top + 14;
      if (x + el.offsetWidth > caja.width - 6) x = e.clientX - caja.left - el.offsetWidth - 14;
      if (x < 4) x = 4;
      el.style.left = x + 'px'; el.style.top = y + 'px';
    },
    ocultar(){ el.style.display = 'none'; }
  };
}
function descargar(nombre, texto, tipo){
  const url = URL.createObjectURL(new Blob([texto], {type: tipo || 'text/csv;charset=utf-8'}));
  const a = h('a', {href: url, download: nombre}); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const csvCelda = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

/* ---------- datos derivados ---------- */
const D = () => estado.datos;
const completo = d => d.fecha !== D().inicio && d.fecha < D().fin;
const laborable = f => { const w = dSem(f); return w >= 1 && w <= 5 && !FEST.has(f); };
const suma = (xs, k) => xs.reduce((t, x) => t + (typeof k === 'function' ? k(x) : x[k]), 0);
function ventana(p){
  const dias = D().dias, n = dias.length, k = p === '7' ? 7 : p === '30' ? 30 : n;
  const i0 = Math.max(0, n - k);
  const prev = p !== 'todo' && n - 2 * k >= 0 ? dias.slice(n - 2 * k, n - k) : null;
  return {i0, dias: dias.slice(i0), prev, k};
}
function fichasDe(i0){
  const fin = D().fin;
  return D().fichas.map(f => {
    const ap = f.dia.slice(i0).reduce((a, b2) => a + b2, 0);
    const desde = f.desde > D().fechas[i0] ? f.desde : D().fechas[i0];
    const ndias = Math.round((Date.parse(fin) - Date.parse(desde)) / 864e5) + 1;
    return {...f, ap, por_dia: ap / Math.max(1, ndias)};
  });
}
function semanas(){
  const T0 = Date.parse(D().inicio + 'T12:00:00Z');
  const nsem = f => Math.floor((Date.parse(f + 'T12:00:00Z') - T0) / 864e5 / 7) + 1;
  const dia = (n, k) => new Date(T0 + ((n - 1) * 7 + k) * 864e5).toISOString().slice(0, 10);
  const grupos = d3.group(D().dias, d => nsem(d.fecha));
  const out = [...grupos].sort((a, b2) => a[0] - b2[0]).map(([n, rs]) => {
    const comp = rs.filter(completo), lab = comp.filter(d => laborable(d.fecha)), nol = comp.filter(d => !laborable(d.fecha));
    const ses = suma(rs, 'sesiones'), ap = suma(rs, 'aperturas'), sc = suma(comp, 'sesiones');
    return {n, semana: 'Semana ' + n, rango: fCorta(dia(n, 0)) + ' a ' + fCorta(dia(n, 6)), completa: rs.length === 7 && comp.length === 7,
      dias_lab: lab.length, dias_nol: nol.length, ses, ap, fps: ses ? ap / ses : null, fps_c: sc ? suma(comp, 'aperturas') / sc : null,
      lab: lab.length ? suma(lab, 'sesiones') / lab.length : null, nol: nol.length ? suma(nol, 'sesiones') / nol.length : null, dias: rs};
  });
  const conLab = out.filter(s => s.dias_lab > 0), act = conLab.length ? conLab[conLab.length - 1].n : null;
  out.forEach((s, i) => {
    const p = out[i - 1];
    s.cambio = p && p.lab && s.lab != null ? s.lab / p.lab - 1 : null;
    s.rol = s.n === 1 ? 'Semana 1' : s.n === act ? 'Actual' : act && s.n === act - 1 ? 'Previa' : '';
  });
  return out;
}
const colorRol = r => { const c = C(); return r === 'Actual' ? c.c1 : r === 'Previa' ? c.c2 : r === 'Semana 1' ? c.c3 : c.gris; };

/* ---------- encabezado: en vivo ---------- */
function pintarVivo(){
  const chip = document.getElementById('vivo'), txt = document.getElementById('vivo-txt'), lec = document.getElementById('lectura');
  if (!D()) return;
  const t = new Date(D().leido), min = (Date.now() - t.getTime()) / 60000;
  const hora = new Intl.DateTimeFormat('es-CO', {timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit'}).format(t);
  const fecha = new Intl.DateTimeFormat('es-CO', {timeZone: 'America/Bogota', day: 'numeric', month: 'short'}).format(t);
  let est, texto;
  if (min < 40) { est = 'vivo'; texto = 'En vivo · ' + (min < 1.5 ? 'hace un momento' : 'hace ' + Math.round(min) + ' min'); }
  else if (min < 360) { est = 'retraso'; texto = 'Última lectura hace ' + (min < 90 ? Math.round(min) + ' min' : f1(min / 60) + ' h'); }
  else { est = 'caido'; texto = 'Sin lectura desde el ' + fecha; }
  chip.dataset.estado = est; txt.textContent = texto;
  lec.textContent = 'Lectura de las ' + hora + ' del ' + fecha + ', hora de Colombia · el panel público de GoatCounter se lee cada 15 minutos';
}

/* ---------- 1. Panorama ---------- */
function vistaPanorama(sec){
  const {i0, dias, prev, k} = ventana(estado.p), aud = D().audiencia[estado.p];
  const S = suma(dias, 'sesiones'), A = suma(dias, 'aperturas'), fps = S ? A / S : 0;
  const pais = aud.pais, totP = suma(pais, x => x[1]), col = (pais.find(x => x[0] === 'Colombia') || [0, 0])[1];
  const pant = aud.pantalla, totPa = suma(pant, x => x[1]), cel = suma(pant.filter(x => /Celulares|Tabletas/.test(x[0])), x => x[1]);
  const lema = h('p', {class: 'lema'}, 'Del ', fLarga(dias[0].fecha), ' al ', fLarga(dias[dias.length - 1].fecha), ', VGI Digital sumó ', b(fInt(S)), ' sesiones desde ', b(fInt(pais.length)), ' países, y cada sesión abrió en promedio ', b(f1(fps)), ' fichas.');
  if (prev) {
    const Sp = suma(prev, 'sesiones'), c = Sp ? S / Sp - 1 : null;
    if (c != null) lema.append(' Frente a los ' + k + ' días anteriores, las sesiones ', b(Math.abs(c) < 0.005 ? 'se mantuvieron' : (c > 0 ? 'subieron un ' : 'bajaron un ') + Math.abs(Math.round(c * 100)) + ' %'), '.');
  } else {
    const pico = dias.reduce((a, d) => d.sesiones > a.sesiones ? d : a, dias[0]);
    lema.append(' El día con más uso fue el ', b(fLarga(pico.fecha)), ' (' + fInt(pico.sesiones) + ' sesiones).');
  }
  const hoy = D().dias[D().dias.length - 1];
  const spark = h('div', {class: 'chart', style: 'margin-top:8px'});
  const Ap = prev ? suma(prev, 'aperturas') : null, Spv = prev ? suma(prev, 'sesiones') : null;
  const fx = fichasDe(i0).sort((a, b2) => b2.ap - a.ap), totF = suma(fx, 'ap');
  const conUso = fx.filter(f => f.ap > 0).length;
  const cifras = h('div', {class: 'cifras'},
    (() => { const c = cifra('Sesiones', fInt(S), prev ? cambioSpan(Spv ? S / Spv - 1 : null, ' frente a los ' + k + ' días anteriores') : 'Sesiones en la app, día a día', true); c.append(spark); return c; })(),
    cifra('Fichas abiertas', fInt(A), prev ? cambioSpan(Ap ? A / Ap - 1 : null, ' frente al periodo anterior') : conUso + ' de ' + fx.length + ' escalas con uso'),
    cifra('Fichas por sesión', f2(fps), prev && Spv ? cambioSpan(fps / (Ap / Spv) - 1, ' frente al periodo anterior') : 'Escalas distintas por visita'),
    cifra('Hoy, hasta ahora', fInt(hoy.sesiones), fInt(hoy.aperturas) + ' fichas abiertas; el día cierra a medianoche'),
    cifra('Países', fInt(pais.length), fPct(1 - col / (totP || 1)) + ' del tráfico fuera de Colombia'),
    cifra('Desde celular o tableta', fPct(cel / (totPa || 1)), 'Proporción aproximada', true)
  );
  const losas = h('div', {class: 'losas'}, fx.slice(0, 6).map((f, i) => h('div', {class: 'losa l' + i}, h('small', {text: f.eje}), h('div', null, h('strong', {text: f.escala}), h('br'), h('span', {text: fInt(f.ap) + ' · ' + fPct(f.ap / (totF || 1))})))));
  const comp = dias.filter(completo), lab = comp.filter(d => laborable(d.fecha)), nol = comp.filter(d => !laborable(d.fecha));
  const porH = d3.range(24).map(i => suma(dias, d => d.h[i])), pico = d3.maxIndex(porH);
  const cuando = h('div', {class: 'cifras'},
    cifra('Día laborable', lab.length ? fInt(suma(lab, 'sesiones') / lab.length) : '·', 'sesiones por día en promedio (' + lab.length + ' días completos)'),
    cifra('Fin de semana o festivo', nol.length ? fInt(suma(nol, 'sesiones') / nol.length) : '·', 'sesiones por día en promedio (' + nol.length + ' días completos)'),
    cifra('Hora pico', pico + ':00', fPct(porH[pico] / (S || 1)) + ' de las sesiones; hora de Colombia'));
  sec.replaceChildren(titulo(1, 'Cifras del periodo', 'Panorama', 't-panorama'), lema, cifras,
    tarjeta('Las escalas que más se abren', 'El tamaño sigue el número de aperturas en el periodo. Una apertura cuenta una vez por sesión.', losas),
    tarjeta('Cuándo se usa', 'Promedios sobre días completos: no cuentan el 28 de septiembre (la analítica empezó a las 22:00) ni el día en curso.', cuando));
  const W = Math.max(240, spark.clientWidth || 400), H = 54, svg = svgDe(spark, W, H);
  const x = d3.scaleLinear([0, dias.length - 1], [2, W - 2]), y = d3.scaleLinear([0, d3.max(dias, d => d.sesiones) || 1], [H - 3, 4]);
  svg.append('path').datum(dias).attr('fill', 'none').attr('stroke', C().c1).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', d3.line().x((d, i) => x(i)).y(d => y(d.sesiones)));
  svg.append('circle').attr('cx', x(dias.length - 1)).attr('cy', y(dias[dias.length - 1].sesiones)).attr('r', 3).attr('fill', C().c1);
}

/* ---------- 2. Día a día ---------- */
function vistaDia(sec){
  const {dias} = ventana(estado.p), c = C();
  const graf = h('div', {class: 'chart'});
  const sems = semanas(), act = sems.find(s => s.rol === 'Actual'), pre = sems.find(s => s.rol === 'Previa'), s1 = sems[0];
  const resumen = act ? h('div', {class: 'cifras'},
    cifra('Semana actual', act.lab != null ? fInt(act.lab) : '·', 'sesiones por día laborable (' + act.semana.toLowerCase() + ', ' + act.dias_lab + ' días completos)'),
    cifra('Frente a la previa', pre && pre.lab ? fCambio(act.lab / pre.lab - 1) : '·', pre ? fInt(pre.lab) + ' por día laborable en la ' + pre.semana.toLowerCase() : ''),
    cifra('Frente a la semana 1', s1.lab ? fCambio(act.lab / s1.lab - 1) : '·', fInt(s1.lab || 0) + ' por día laborable en la semana del lanzamiento'),
    cifra('Fichas por sesión', act.fps_c != null ? f2(act.fps_c) : '·', (pre && pre.fps_c != null ? f2(pre.fps_c) + ' en la previa y ' : '') + f2(s1.fps_c || 0) + ' en la semana 1')) : null;
  if (resumen) [1, 2].forEach(i => { const n = resumen.children[i].querySelector('.num'); const v = i === 1 ? (pre && pre.lab ? act.lab / pre.lab - 1 : 0) : (s1.lab ? act.lab / s1.lab - 1 : 0); n.classList.add(v > 0.005 ? 'sube' : v < -0.005 ? 'baja' : 'x'); });
  const gSem = h('div', {class: 'chart'}), gDias = h('div', {class: 'chart'});
  const seg = h('div', {class: 'seg', role: 'group', 'aria-label': 'Medida'}, ['sesiones', 'aperturas'].map(m => h('button', {type: 'button', 'aria-pressed': String(estado.metrica === m), onclick: () => { estado.metrica = m; pintar(); }, text: m === 'sesiones' ? 'Sesiones' : 'Aperturas'})));
  const tabla = tablaSemanas(sems);
  sec.replaceChildren(titulo(2, NOMBRE_P[estado.p], 'Día a día', 't-dia'),
    tarjeta('Sesiones y aperturas por día', 'Barras: sesiones en la app. Línea: fichas abiertas. Tono claro: día parcial (el 28 de septiembre y el día en curso). F: festivo en Colombia.',
      leyenda([[c.c1, 'Sesiones'], [c.c2, 'Fichas abiertas']]), graf),
    tarjeta('Semana actual frente a la previa y a la semana 1', 'Semanas de lunes a domingo desde el 28 de septiembre. Para que una semana a medias no parezca más baja se compara el promedio de sesiones por día laborable completo (sin festivos). Esta sección no depende del periodo elegido.',
      resumen,
      h('div', {class: 'rejilla', style: 'margin-top:14px'},
        h('div', null, leyenda([[c.c3, 'Semana 1'], [c.c2, 'Previa'], [c.c1, 'Actual'], [c.gris, 'Otras'], [c.tenue, 'Día no laborable', true]]), gSem),
        h('div', null, seg, gDias)),
      tabla));
  barrasDiarias(graf, dias);
  barrasSemanas(gSem, sems);
  lineasSemana(gDias, sems);
}
function barrasDiarias(cont, dias){
  const c = C(), W = Math.max(300, cont.clientWidth || 640), Hh = 270, mb = 24;
  const svg = svgDe(cont, W, Hh), tip = crearTip(cont);
  const ymax = d3.max(dias, d => Math.max(d.sesiones, d.aperturas)) || 1, y = d3.scaleLinear([0, ymax * 1.08], [Hh - mb, 12]).nice();
  const ml = d3.max(y.ticks(4), t => anchoTexto(svg, fInt(t))) + 10;
  const x = d3.scaleBand(dias.map(d => d.fecha), [ml, W - 6]).paddingInner(0.25).paddingOuter(0.1);
  const bw = Math.min(30, x.bandwidth());
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - 6).attr('y1', y).attr('y2', y).attr('stroke', c.rejilla);
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', t => y(t) + 4).attr('text-anchor', 'end').text(fInt);
  svg.append('g').selectAll('rect').data(dias).join('rect').attr('x', d => x(d.fecha) + (x.bandwidth() - bw) / 2).attr('width', bw)
    .attr('y', d => y(d.sesiones)).attr('height', d => y(0) - y(d.sesiones)).attr('rx', Math.min(4, bw / 3)).attr('fill', c.c1).attr('fill-opacity', d => completo(d) ? 0.9 : 0.35);
  const cx = d => x(d.fecha) + x.bandwidth() / 2;
  svg.append('path').datum(dias).attr('fill', 'none').attr('stroke', c.c2).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', d3.line().x(cx).y(d => y(d.aperturas)));
  if (x.bandwidth() > 5) svg.append('g').selectAll('circle').data(dias).join('circle').attr('cx', cx).attr('cy', d => y(d.aperturas)).attr('r', 2.5).attr('fill', c.c2);
  svg.append('g').selectAll('text').data(dias.filter(d => FEST.has(d.fecha))).join('text').attr('x', cx).attr('y', d => y(d.sesiones) - 5).attr('text-anchor', 'middle').attr('class', 'fuerte').text('F');
  const cada = Math.max(1, Math.ceil(42 / x.step()));
  svg.append('g').selectAll('text').data(dias.filter((d, i) => (dias.length - 1 - i) % cada === 0)).join('text').attr('x', cx).attr('y', Hh - 6).attr('text-anchor', 'middle').text(d => fCorta(d.fecha));
  svg.append('g').selectAll('rect').data(dias).join('rect').attr('x', d => x(d.fecha) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', 0).attr('height', Hh - mb).attr('fill', 'transparent')
    .on('mousemove', (e, d) => tip.mostrar(e, DSL[dSem(d.fecha)] + ' ' + fCorta(d.fecha) + (FEST.has(d.fecha) ? ' (festivo)' : '') + (completo(d) ? '' : ' (parcial)'), [[c.c1, 'Sesiones: ' + fInt(d.sesiones)], [c.c2, 'Fichas abiertas: ' + fInt(d.aperturas)], [null, 'Fichas por sesión: ' + (d.sesiones ? f2(d.aperturas / d.sesiones) : '·')]]))
    .on('mouseleave', () => tip.ocultar());
}
function barrasSemanas(cont, sems){
  const c = C(), W = Math.max(280, cont.clientWidth || 420), Hh = 260, mb = 38;
  const svg = svgDe(cont, W, Hh), tip = crearTip(cont), ult = d3.max(sems, s => s.n);
  const y = d3.scaleLinear([0, (d3.max(sems, s => Math.max(s.lab || 0, s.nol || 0)) || 1) * 1.15], [Hh - mb, 14]).nice();
  const ml = d3.max(y.ticks(4), t => anchoTexto(svg, fInt(t))) + 10;
  const x = d3.scaleBand(sems.map(s => s.semana), [ml, W - 6]).paddingInner(0.3).paddingOuter(0.15), bw = Math.min(30, x.bandwidth()), cx = s => x(s.semana) + x.bandwidth() / 2;
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - 6).attr('y1', y).attr('y2', y).attr('stroke', c.rejilla);
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', t => y(t) + 4).attr('text-anchor', 'end').text(fInt);
  const conL = sems.filter(s => s.lab != null);
  svg.append('g').selectAll('rect').data(conL).join('rect').attr('x', s => cx(s) - bw / 2).attr('width', bw).attr('y', s => y(s.lab)).attr('height', s => y(0) - y(s.lab)).attr('rx', 3)
    .attr('fill', s => colorRol(s.rol)).attr('fill-opacity', s => s.n === ult && !s.completa ? 0.6 : 1);
  svg.append('g').selectAll('circle').data(sems.filter(s => s.nol != null)).join('circle').attr('cx', cx).attr('cy', s => y(s.nol)).attr('r', 4).attr('fill', c.tarjeta).attr('stroke', s => s.rol ? colorRol(s.rol) : c.tenue).attr('stroke-width', 2);
  if (x.step() >= 26) svg.append('g').selectAll('text').data(conL).join('text').attr('x', cx).attr('y', s => y(Math.max(s.lab, s.nol || 0)) - 9).attr('text-anchor', 'middle').attr('class', s => s.rol ? 'fuerte' : null).text(s => fInt(s.lab));
  const cada = Math.max(1, Math.ceil(30 / x.step()));
  svg.append('g').selectAll('text').data(sems.filter((s, i) => s.rol || (sems.length - 1 - i) % cada === 0)).join('text').attr('x', cx).attr('y', Hh - mb + 16).attr('text-anchor', 'middle').attr('class', s => s.rol ? 'fuerte' : null).text(s => 'S' + s.n);
  if (x.step() >= 40) svg.append('g').selectAll('text').data(sems.filter(s => s.rol === 'Actual' || s.rol === 'Previa')).join('text').attr('x', cx).attr('y', Hh - mb + 30).attr('text-anchor', 'middle').text(s => s.rol.toLowerCase());
  svg.append('g').selectAll('rect').data(sems).join('rect').attr('x', s => x(s.semana) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', 0).attr('height', Hh).attr('fill', 'transparent')
    .on('mousemove', (e, s) => tip.mostrar(e, s.semana + ', ' + s.rango, [[colorRol(s.rol), 'Día laborable: ' + (s.lab == null ? 'sin días completos' : fInt(s.lab) + ' sesiones (' + s.dias_lab + ' días)')], [null, 'Día no laborable: ' + (s.nol == null ? 'sin días completos' : fInt(s.nol) + ' sesiones (' + s.dias_nol + ' días)')]].concat(s.cambio == null ? [] : [[null, 'Frente a la semana anterior: ' + fCambio(s.cambio)]], [[null, 'Fichas por sesión: ' + (s.fps != null ? f2(s.fps) : '·')]], s.n === ult && !s.completa ? [[null, 'Semana en curso']] : [])))
    .on('mouseleave', () => tip.ocultar());
}
function lineasSemana(cont, sems){
  const c = C(), k = estado.metrica === 'sesiones' ? 'sesiones' : 'aperturas';
  const roles = ['Semana 1', 'Previa', 'Actual'].map(r => sems.find(s => s.rol === r)).filter(Boolean);
  const W = Math.max(280, cont.clientWidth || 420), Hh = 260, svg = svgDe(cont, W, Hh), tip = crearTip(cont);
  const todos = roles.flatMap(s => s.dias);
  const y = d3.scaleLinear([0, (d3.max(todos, d => d[k]) || 1) * 1.08], [Hh - 26, 12]).nice();
  const ml = d3.max(y.ticks(4), t => anchoTexto(svg, fInt(t))) + 10, mr = d3.max(roles, s => anchoTexto(svg, s.rol === 'Semana 1' ? 'S1' : s.rol)) + 14;
  const x = d3.scalePoint(ORD, [ml + 8, W - mr]);
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - mr + 6).attr('y1', y).attr('y2', y).attr('stroke', c.rejilla);
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', t => y(t) + 4).attr('text-anchor', 'end').text(fInt);
  svg.append('g').selectAll('text').data(ORD).join('text').attr('x', x).attr('y', Hh - 6).attr('text-anchor', 'middle').text(d => d);
  const ds = d => DS[dSem(d.fecha)], fin = [];
  roles.forEach(s => {
    const col = colorRol(s.rol), rs = s.dias.slice().sort((a, b2) => ORD.indexOf(ds(a)) - ORD.indexOf(ds(b2)));
    svg.append('path').datum(rs.filter(completo)).attr('fill', 'none').attr('stroke', col).attr('stroke-width', s.rol === 'Actual' ? 2.6 : 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', d3.line().x(d => x(ds(d))).y(d => y(d[k])));
    rs.forEach((d, i) => { const n = rs[i + 1]; if (n && (!completo(d) || !completo(n))) svg.append('line').attr('x1', x(ds(d))).attr('y1', y(d[k])).attr('x2', x(ds(n))).attr('y2', y(n[k])).attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '3 3'); });
    svg.append('g').selectAll('circle').data(rs).join('circle').attr('cx', d => x(ds(d))).attr('cy', d => y(d[k])).attr('r', s.rol === 'Actual' ? 4 : 3.5).attr('fill', d => completo(d) ? col : c.tarjeta).attr('stroke', col).attr('stroke-width', 1.5);
    svg.append('g').selectAll('text').data(rs.filter(d => FEST.has(d.fecha))).join('text').attr('x', d => x(ds(d))).attr('y', d => y(d[k]) - 9).attr('text-anchor', 'middle').text('F');
    const u = rs[rs.length - 1]; if (u) fin.push({x: x(ds(u)) + 8, y: y(u[k]) + 4, t: s.rol === 'Semana 1' ? 'S1' : s.rol});
  });
  fin.sort((a, b2) => a.y - b2.y); for (let i = 1; i < fin.length; i++) if (Math.abs(fin[i].x - fin[i - 1].x) < 40 && fin[i].y - fin[i - 1].y < 13) fin[i].y = fin[i - 1].y + 13;
  svg.append('g').selectAll('text').data(fin).join('text').attr('x', d => d.x).attr('y', d => d.y).attr('class', 'fuerte').text(d => d.t);
  const st = x.step();
  svg.append('g').selectAll('rect').data(ORD).join('rect').attr('x', d => x(d) - st / 2).attr('width', st).attr('y', 0).attr('height', Hh - 20).attr('fill', 'transparent')
    .on('mousemove', (e, dd) => tip.mostrar(e, DSL[(ORD.indexOf(dd) + 1) % 7] + ' · ' + k, roles.map(s => { const d = s.dias.find(x2 => ds(x2) === dd); return [colorRol(s.rol), s.semana + (d ? ', ' + fCorta(d.fecha) + ': ' + fInt(d[k]) + (FEST.has(d.fecha) ? ' (festivo)' : '') + (completo(d) ? '' : ' (parcial)') : ': sin datos')]; })))
    .on('mouseleave', () => tip.ocultar());
}
function tablaSemanas(sems){
  const ult = d3.max(sems, s => s.n);
  const filas = sems.slice().reverse().map(s => {
    const ast = s.n === ult && !s.completa ? '*' : '';
    return h('tr', null, h('td', {style: s.rol ? 'font-weight:600' : null}, h('span', {class: 'punto', style: 'background:' + colorRol(s.rol)}), s.semana + (s.rol === 'Actual' || s.rol === 'Previa' ? ' · ' + s.rol.toLowerCase() : '')),
      h('td', {class: 'ocn', text: s.rango}), h('td', {class: 'n', text: fInt(s.ses) + ast}), h('td', {class: 'n ocn', text: fInt(s.ap) + ast}),
      h('td', {class: 'n', text: s.fps != null ? f2(s.fps) : ''}), h('td', {class: 'n', text: s.lab != null ? f1(s.lab) : ''}),
      h('td', {class: 'n ' + (s.cambio > 0.005 ? 'sube' : s.cambio < -0.005 ? 'baja' : ''), text: s.cambio == null ? '' : fCambio(s.cambio)}), h('td', {class: 'n ocn', text: s.nol != null ? f1(s.nol) : ''}));
  });
  return h('div', {class: 'caja', style: 'margin-top:14px;max-height:22rem'}, h('table', null,
    h('thead', null, h('tr', null, h('th', {text: 'Semana'}), h('th', {class: 'ocn', text: 'Fechas'}), h('th', {class: 'n', text: 'Sesiones'}), h('th', {class: 'n ocn', text: 'Aperturas'}), h('th', {class: 'n', text: 'Fichas por sesión'}), h('th', {class: 'n', text: 'Sesiones por día laborable'}), h('th', {class: 'n', text: 'vs. anterior'}), h('th', {class: 'n ocn', text: 'Por día no laborable'}))),
    h('tbody', null, filas)), h('p', {class: 'pie', text: '* Semana en curso: suma solo hasta la hora de la lectura.'}));
}

/* ---------- 3. Reloj ---------- */
function vistaReloj(sec){
  const {dias} = ventana(estado.p), c = C();
  const comp = dias.filter(completo), lab = comp.filter(d => laborable(d.fecha)), nol = comp.filter(d => !laborable(d.fecha));
  const prom = (rs, i) => rs.length ? suma(rs, d => d.h[i]) / rs.length : 0;
  const filas = d3.range(24).map(i => ({hora: i, lab: prom(lab, i), nol: prom(nol, i)}));
  const porH = d3.range(24).map(i => suma(dias, d => d.h[i])), tot = suma(porH, v => v) || 1, pico = d3.maxIndex(porH);
  const jornada = suma(porH.slice(7, 19), v => v) / tot, noche = suma(porH.slice(19), v => v) / tot, madr = suma(porH.slice(0, 7), v => v) / tot;
  const g1 = h('div', {class: 'chart'}), g2 = h('div', {class: 'chart'});
  sec.replaceChildren(titulo(3, NOMBRE_P[estado.p], 'Reloj', 't-reloj'),
    h('p', {class: 'lema'}, b(fPct(jornada)), ' de las sesiones caen entre las 7:00 y las 18:59. La hora con más uso es la de las ', b(pico + ':00'), '; de noche (19:00 a 23:59) va el ', b(fPct(noche)), ' y de madrugada el ', b(fPct(madr)), '.'),
    h('div', {class: 'rejilla'},
      tarjeta('El reloj de la jornada', 'Sesiones promedio por hora en un día completo, sobre una esfera de 24 horas (medianoche arriba). La franja sombreada va de 7:00 a 17:00. Hora de Colombia.', leyenda([[c.c1, 'Lunes a viernes (' + lab.length + ' días)'], [c.c3, 'Fines de semana y festivos (' + nol.length + ' días)']]), g1),
      tarjeta('Perfil hora a hora', 'Porcentaje de las sesiones del periodo que cae en cada hora.', g2)));
  reloj(g1, filas); perfil(g2, porH, tot, pico);
}
function reloj(cont, filas){
  const c = C(), W = Math.max(260, cont.clientWidth || 360), S = Math.min(W, 380);
  const svg = d3.create('svg').attr('viewBox', `${-(W - S) / 2} 0 ${W} ${S}`).attr('width', '100%'); cont.replaceChildren(svg.node());
  const tip = crearTip(cont), g = svg.append('g').attr('transform', `translate(${S / 2},${S / 2})`);
  const R = S / 2 - 34, r0 = R * 0.2, ang = hh => hh / 24 * 2 * Math.PI;
  const rr = d3.scaleLinear([0, d3.max(filas, d => Math.max(d.lab, d.nol)) || 1], [r0, R]).nice();
  g.append('path').attr('d', d3.arc()({innerRadius: r0, outerRadius: R, startAngle: ang(7), endAngle: ang(17)})).attr('fill', c.rejilla).attr('opacity', .7);
  rr.ticks(3).filter(t => t > 0).forEach(t => { g.append('circle').attr('r', rr(t)).attr('fill', 'none').attr('stroke', c.rejilla); g.append('text').attr('x', 3).attr('y', -rr(t) - 2).text(Number.isInteger(t) ? fInt(t) : f1(t)); });
  d3.range(24).forEach(hh => { const a = ang(hh) - Math.PI / 2, big = hh % 6 === 0;
    g.append('line').attr('x1', Math.cos(a) * r0).attr('y1', Math.sin(a) * r0).attr('x2', Math.cos(a) * (R + (big ? 6 : 2))).attr('y2', Math.sin(a) * (R + (big ? 6 : 2))).attr('stroke', c.rejilla);
    if (hh % 3 === 0) g.append('text').attr('x', Math.cos(a) * (R + 17)).attr('y', Math.sin(a) * (R + 17) + 4).attr('text-anchor', 'middle').attr('class', big ? 'fuerte' : null).text(hh + ' h'); });
  [['nol', c.c3], ['lab', c.c1]].forEach(([k, col]) => {
    g.append('path').datum(filas).attr('d', d3.areaRadial().angle(d => ang(d.hora)).innerRadius(r0).outerRadius(d => rr(d[k])).curve(d3.curveLinearClosed)).attr('fill', col).attr('fill-opacity', .15);
    g.append('path').datum(filas).attr('d', d3.lineRadial().angle(d => ang(d.hora)).radius(d => rr(d[k])).curve(d3.curveLinearClosed)).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2).attr('stroke-linejoin', 'round');
  });
  const pk = filas[d3.maxIndex(filas, d => d.lab)];
  g.append('text').attr('text-anchor', 'middle').attr('y', -3).attr('class', 'fuerte').text('Pico');
  g.append('text').attr('text-anchor', 'middle').attr('y', 12).attr('class', 'fuerte').text(pk.hora + ' h');
  const p1 = g.append('circle').attr('r', 4).attr('fill', c.c1).attr('opacity', 0), p2 = g.append('circle').attr('r', 4).attr('fill', c.c3).attr('opacity', 0);
  g.append('g').selectAll('path').data(filas).join('path').attr('d', d => d3.arc()({innerRadius: r0, outerRadius: R + 8, startAngle: ang(d.hora - .5), endAngle: ang(d.hora + .5)})).attr('fill', 'transparent')
    .on('mousemove', (e, d) => { const a = ang(d.hora) - Math.PI / 2;
      p1.attr('cx', Math.cos(a) * rr(d.lab)).attr('cy', Math.sin(a) * rr(d.lab)).attr('opacity', 1); p2.attr('cx', Math.cos(a) * rr(d.nol)).attr('cy', Math.sin(a) * rr(d.nol)).attr('opacity', 1);
      tip.mostrar(e, d.hora + ':00 a ' + d.hora + ':59', [[c.c1, 'Lunes a viernes: ' + f1(d.lab) + ' sesiones'], [c.c3, 'Fin de semana o festivo: ' + f1(d.nol) + ' sesiones']]); })
    .on('mouseleave', () => { p1.attr('opacity', 0); p2.attr('opacity', 0); tip.ocultar(); });
}
function perfil(cont, porH, tot, pico){
  const c = C(), W = Math.max(260, cont.clientWidth || 360), Hh = 300, mb = 22, svg = svgDe(cont, W, Hh), tip = crearTip(cont);
  const y = d3.scaleLinear([0, d3.max(porH) / tot * 1.15], [Hh - mb, 10]).nice(), ml = d3.max(y.ticks(4), t => anchoTexto(svg, fPct(t))) + 10;
  const x = d3.scaleBand(d3.range(24), [ml, W - 4]).paddingInner(0.2);
  svg.append('rect').attr('x', x(7)).attr('width', x(18) + x.bandwidth() - x(7)).attr('y', 6).attr('height', Hh - mb - 6).attr('fill', c.rejilla).attr('opacity', .5);
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - 4).attr('y1', y).attr('y2', y).attr('stroke', c.rejilla);
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', t => y(t) + 4).attr('text-anchor', 'end').text(fPct);
  svg.append('g').selectAll('rect').data(porH).join('rect').attr('x', (v, i) => x(i)).attr('width', x.bandwidth()).attr('y', v => y(v / tot)).attr('height', v => y(0) - y(v / tot)).attr('rx', 2).attr('fill', (v, i) => i === pico ? c.terracota : c.c1)
    .on('mousemove', (e, v) => { const i = porH.indexOf(v); tip.mostrar(e, i + ':00 a ' + i + ':59', [[null, fInt(v) + ' sesiones (' + fPctFino(v / tot) + ')']]); }).on('mouseleave', () => tip.ocultar());
  svg.append('g').selectAll('text').data(d3.range(0, 24, W < 420 ? 6 : 3)).join('text').attr('x', i => x(i) + x.bandwidth() / 2).attr('y', Hh - 6).attr('text-anchor', 'middle').text(i => i + ' h');
}

/* ---------- 4. Mapa de calor ---------- */
function vistaCalor(sec){
  const {dias} = ventana(estado.p), c = C(), cont = h('div', {class: 'chart'}), ley = h('div', {class: 'leyenda', style: 'margin-top:10px'});
  sec.replaceChildren(titulo(4, NOMBRE_P[estado.p], 'Mapa de calor', 't-calor'),
    tarjeta('Sesiones por día y hora', 'Cada celda es una hora (hora de Colombia); más intensa, más sesiones. Arriba, el perfil horario; a la derecha, el total del día. Fines de semana y festivos (F) en negrita; los días parciales, con su total más tenue.', cont, ley));
  const BINS = [0, 1, 3, 6, 10, 15, 20, 30, 60];
  const bin = v => { let i = 0; while (i < BINS.length - 2 && v >= BINS[i + 1]) i++; return i; };
  const op = v => v <= 0 ? 0 : 0.14 + 0.86 * bin(v) / (BINS.length - 2);
  const W = Math.max(320, cont.clientWidth || 640), angosto = W < 560, N = dias.length;
  const ml = angosto ? 68 : 92, wr = angosto ? 40 : 84, mt = 54, mb = 24, gap = 8, cw = (W - ml - wr - gap) / 24, ch = angosto ? 13 : 16, Hh = mt + N * ch + mb;
  const svg = svgDe(cont, W, Hh), tip = crearTip(cont);
  const celdas = []; dias.forEach((d, i) => d.h.forEach((v, hh) => celdas.push({d, i, hh, v, a: d.ah[hh]})));
  svg.append('g').selectAll('rect').data(celdas).join('rect').attr('x', q => ml + q.hh * cw + .5).attr('y', q => mt + q.i * ch + .5).attr('width', Math.max(1, cw - 1)).attr('height', ch - 1).attr('rx', 1.5)
    .attr('fill', q => q.v > 0 ? c.c1 : c.rejilla).attr('fill-opacity', q => q.v > 0 ? op(q.v) : .7)
    .on('mousemove', (e, q) => tip.mostrar(e, DSL[dSem(q.d.fecha)] + ' ' + fCorta(q.d.fecha) + ', ' + q.hh + ':00 a ' + q.hh + ':59', [[null, 'Sesiones: ' + fInt(q.v)], [null, 'Fichas abiertas: ' + fInt(q.a)]])).on('mouseleave', () => tip.ocultar());
  svg.append('g').selectAll('text').data(dias).join('text').attr('x', ml - 6).attr('y', (d, i) => mt + i * ch + ch / 2 + 4).attr('text-anchor', 'end').attr('class', 'fuerte')
    .style('font-size', angosto ? '10px' : '11px').style('font-weight', d => laborable(d.fecha) ? 400 : 700).text(d => DS[dSem(d.fecha)] + ' ' + fCorta(d.fecha) + (FEST.has(d.fecha) ? ' (F)' : ''));
  svg.append('g').selectAll('text').data(angosto ? [0, 6, 12, 18] : d3.range(0, 24, 2)).join('text').attr('x', hh => ml + hh * cw + cw / 2).attr('y', Hh - 6).attr('text-anchor', 'middle').text(hh => hh);
  const porH = d3.range(24).map(i => suma(dias, d => d.h[i])), tot = suma(porH, v => v) || 1, pmax = d3.max(porH) / tot;
  const yp = d3.scaleLinear([0, pmax || 1], [mt - 6, 8]);
  svg.append('g').selectAll('rect').data(porH).join('rect').attr('x', (v, i) => ml + i * cw + cw * .12).attr('width', cw * .76).attr('y', v => yp(v / tot)).attr('height', v => mt - 6 - yp(v / tot)).attr('rx', 2).attr('fill', c.gris);
  svg.append('text').attr('x', ml - 6).attr('y', yp(pmax) + 4).attr('text-anchor', 'end').text(fPct(pmax));
  const totD = dias.map(d => d.sesiones), x0 = ml + 24 * cw + gap, xr = d3.scaleLinear([0, d3.max(totD) || 1], [0, wr - (angosto ? 4 : 30)]);
  svg.append('g').selectAll('rect').data(dias).join('rect').attr('x', x0).attr('y', (d, i) => mt + i * ch + 2).attr('height', ch - 4).attr('width', d => xr(d.sesiones)).attr('rx', 2).attr('fill', c.gris).attr('fill-opacity', d => completo(d) ? 1 : .45);
  if (!angosto) svg.append('g').selectAll('text').data(dias).join('text').attr('x', d => x0 + xr(d.sesiones) + 4).attr('y', (d, i) => mt + i * ch + ch / 2 + 4).style('font-size', '10px').text(d => fInt(d.sesiones));
  svg.append('text').attr('x', x0).attr('y', mt - 6).text('Por día');
  ley.replaceChildren(...BINS.slice(0, -1).map((v, i) => h('span', null, h('i', {style: 'background:' + (i ? c.c1 : c.rejilla) + ';opacity:' + (i ? 0.14 + 0.86 * i / (BINS.length - 2) : 1)}), i === BINS.length - 2 ? v + ' o más' : (BINS[i + 1] - 1 === v ? String(v) : v + ' a ' + (BINS[i + 1] - 1)))), h('span', {text: 'sesiones por hora'}));
}

/* ---------- 5. Fichas ---------- */
function vistaFichas(sec){
  const {i0} = ventana(estado.p), fx = fichasDe(i0), tot = suma(fx, 'ap') || 1;
  const porEje = d3.rollup(fx, v => suma(v, 'ap'), f => f.eje), ejes = [...porEje].sort((a, b2) => b2[1] - a[1]);
  const orden = fx.slice().sort((a, b2) => b2.ap - a.ap), acum = []; let s = 0; orden.forEach(f => { s += f.ap; acum.push(s / tot); });
  const n50 = acum.findIndex(v => v >= .5) + 1;
  const mos = h('div', {class: 'chart'}), caja = h('div', {class: 'caja'}), buscar = h('input', {type: 'search', placeholder: 'Buscar escala, eje o grupo', 'aria-label': 'Buscar escala', value: estado.buscar});
  sec.replaceChildren(titulo(5, NOMBRE_P[estado.p], 'Fichas', 't-fichas'),
    h('p', {class: 'lema'}, 'Se abrieron ', b(fInt(suma(fx, 'ap'))), ' fichas. La mitad de las aperturas se concentra en ', b(fInt(n50)), ' de las ', fInt(fx.length), ' escalas; la más consultada es ', b(orden[0].escala), ' (' + fPct(orden[0].ap / tot) + ').'),
    tarjeta('Mosaico de las ' + fx.length + ' fichas', 'El área de cada recuadro es proporcional a sus aperturas en el periodo, agrupadas por eje de la VGI. Pase el cursor por los pequeños para ver su nombre.',
      leyenda(ejes.map(([e, v]) => [colorEje(e), e + ' ' + fPct(v / tot)])), mos),
    tarjeta('Ranking', '"Por día" divide las aperturas entre los días en que la ficha estuvo disponible dentro del periodo, para comparar en igualdad las cuatro fichas publicadas el 1 de octubre.', h('div', {class: 'herr'}, buscar), caja));
  buscar.addEventListener('input', () => { estado.buscar = buscar.value.trim(); tablaFichas(caja, fx, tot); });
  mosaico(mos, fx, tot); tablaFichas(caja, fx, tot);
}
function mosaico(cont, fx, tot){
  const W = Math.max(300, cont.clientWidth || 640), Hh = W < 520 ? 460 : 400, svg = svgDe(cont, W, Hh), tip = crearTip(cont);
  const raiz = d3.hierarchy({children: d3.groups(fx.filter(f => f.ap > 0), f => f.eje).map(([eje, v]) => ({eje, children: v.map(f => ({...f, value: f.ap}))}))}).sum(d => d.value || 0).sort((a, b2) => b2.value - a.value);
  d3.treemap().size([W, Hh]).paddingOuter(3).paddingInner(2).paddingTop(d => d.depth === 1 ? 18 : 0).round(true)(raiz);
  (raiz.children || []).forEach(g => {
    svg.append('rect').attr('x', g.x0).attr('y', g.y0).attr('width', g.x1 - g.x0).attr('height', g.y1 - g.y0).attr('rx', 8).attr('fill', 'none').attr('stroke', colorEje(g.data.eje)).attr('stroke-opacity', .6);
    if (g.x1 - g.x0 > 60) svg.append('text').attr('x', g.x0 + 6).attr('y', g.y0 + 13).attr('class', 'fuerte').style('font-weight', 600).text(g.data.eje);
  });
  const hojas = raiz.leaves(), mx = hojas.length ? hojas[0].value : 1;
  const gg = svg.append('g').selectAll('g').data(hojas).join('g').attr('transform', d => `translate(${d.x0},${d.y0})`);
  gg.append('rect').attr('width', d => Math.max(0, d.x1 - d.x0)).attr('height', d => Math.max(0, d.y1 - d.y0)).attr('rx', 4).attr('fill', d => colorEje(d.data.eje)).attr('fill-opacity', d => .2 + .55 * Math.sqrt(d.value / mx))
    .on('mousemove', (e, d) => tip.mostrar(e, d.data.escala, [[colorEje(d.data.eje), d.data.eje + ' · ' + d.data.grupo], [null, 'Aperturas: ' + fInt(d.value) + ' (' + fPctFino(d.value / tot) + ')']])).on('mouseleave', () => tip.ocultar());
  gg.each(function(d){ const w = d.x1 - d.x0, hh = d.y1 - d.y0, g = d3.select(this); if (w < 40 || hh < 26) return;
    const t = g.append('text').attr('x', 6).attr('y', 15).attr('class', 'fuerte').attr('pointer-events', 'none').text(d.data.escala); let s = d.data.escala;
    while (t.node().getComputedTextLength() > w - 12 && s.length > 3) { s = s.slice(0, -1); t.text(s.trim() + '…'); }
    if (hh >= 40) g.append('text').attr('x', 6).attr('y', 30).attr('pointer-events', 'none').text(fInt(d.value)); });
}
function tablaFichas(caja, fx, tot){
  const [k, dir] = estado.orden, q = estado.buscar.toLowerCase(), mx = d3.max(fx, f => f.ap) || 1;
  const rs = fx.filter(f => !q || (f.escala + ' ' + f.eje + ' ' + f.grupo + ' ' + f.id).toLowerCase().includes(q))
    .sort((a, b2) => { const va = a[k], vb = b2[k]; return (va < vb ? -1 : va > vb ? 1 : 0) * dir; });
  const th = (key, txt, cls) => h('th', {class: cls, 'aria-sort': k === key ? (dir > 0 ? 'ascending' : 'descending') : null}, h('button', {type: 'button', onclick: () => { estado.orden = k === key ? [key, -dir] : [key, (key === 'ap' || key === 'por_dia') ? -1 : 1]; tablaFichas(caja, fx, tot); }, text: txt}));
  caja.replaceChildren(h('table', null, h('thead', null, h('tr', null, th('escala', 'Escala'), th('eje', 'Eje'), th('grupo', 'Grupo', 'ocn'), th('ap', 'Aperturas', 'n'), th('por_dia', 'Por día', 'n'))),
    h('tbody', null, rs.map(f => h('tr', null, h('td', {text: f.escala}), h('td', null, h('span', {class: 'punto', style: 'background:' + colorEje(f.eje)}), f.eje), h('td', {class: 'ocn', text: f.grupo}),
      h('td', {class: 'n', style: 'white-space:nowrap'}, fInt(f.ap), h('span', {class: 'barra', style: `width:${Math.max(2, f.ap / mx * 64)}px;background:${colorEje(f.eje)}`})), h('td', {class: 'n', text: f1(f.por_dia)}))))));
}

/* ---------- 6. Audiencia ---------- */
function vistaAudiencia(sec){
  const aud = D().audiencia[estado.p], c = C(), pais = aud.pais, totP = suma(pais, x => x[1]) || 1, col = (pais.find(x => x[0] === 'Colombia') || [0, 0])[1];
  const barras = h('div', {class: 'barras'}, pais.map(([n, v]) => h('div', {class: 'fila'}, h('div', {class: 'nb', title: n, text: n}), h('div', {class: 'pista'}, h('div', {class: 'lleno', style: `width:${Math.max(1.5, v / pais[0][1] * 100)}%;background:${c.c1}`})), h('div', {class: 'v', text: fPctFino(v / totP)}))));
  const NOM = {Desconocido: 'Sin referente', 'www.facebook.com': 'Facebook', 'facebook.com': 'Facebook', 'l.facebook.com': 'Facebook', 'm.facebook.com': 'Facebook', 'www.linkedin.com': 'LinkedIn', 'com.linkedin.android': 'LinkedIn', 'github.com': 'GitHub', 'l.instagram.com': 'Instagram', 't.co': 'X (Twitter)'};
  const apilada = (titulo2, filas, k, renombrar) => {
    const m = new Map(); filas.forEach(([n, v]) => { const n2 = renombrar ? (NOM[n] || (n.startsWith('github.com') ? 'GitHub' : n)) : n; m.set(n2, (m.get(n2) || 0) + v); });
    let it = [...m].map(([n, v]) => ({n, v})).sort((a, b2) => b2.v - a.v);
    if (it.length > k) { const resto = suma(it.slice(k), 'v'); it = it.slice(0, k); it.push({n: 'Otros', v: resto}); }
    const t = suma(it, 'v') || 1, cols = [c.c1, c.c2, c.c3, c.c4, c.c5, c.c6];
    return h('div', {class: 'apilada'}, h('div', {class: 'ti', text: titulo2}),
      h('div', {class: 'tira'}, it.map((x, i) => h('span', {style: `width:${x.v / t * 100}%;background:${x.n === 'Otros' ? c.gris : cols[i % 6]}`, title: x.n + ': ' + fPctFino(x.v / t)}))),
      h('div', {class: 'cl'}, it.map((x, i) => h('span', null, h('i', {style: 'background:' + (x.n === 'Otros' ? c.gris : cols[i % 6])}), x.n + ' ', b(fPctFino(x.v / t))))));
  };
  sec.replaceChildren(titulo(6, NOMBRE_P[estado.p], 'Audiencia', 't-audiencia'),
    h('p', {class: 'lema'}, 'Uso desde ', b(fInt(pais.length)), ' países; ', b(fPct(1 - col / totP)), ' del tráfico llega de fuera de Colombia.'),
    h('p', {class: 'nota', text: 'GoatCounter cuenta estos paneles sobre visitas más eventos (cada apertura de ficha suma), así que los porcentajes son aproximados y sirven como proporción, no como número de personas. Periodo: del ' + fLarga(aud.desde) + ' al ' + fLarga(aud.hasta) + '.'}),
    h('div', {class: 'rejilla'},
      tarjeta('Países', null, h('div', {class: 'caja', style: 'border-top:0;max-height:34rem'}, barras)),
      tarjeta('Cómo llegan y desde qué', 'Cada barra suma el 100 %. "Sin referente" es lo habitual cuando el enlace se abre desde WhatsApp o desde otra app.',
        apilada('Dispositivo', aud.pantalla, 3), apilada('Sistema operativo', aud.sistema, 4), apilada('Navegador', aud.navegador, 3), apilada('De dónde llegan', aud.referente, 4, true))));
}

/* ---------- 7. Datos y método ---------- */
function vistaDatos(sec){
  const Dd = D();
  const csvDias = () => ['fecha,dia_semana,sesiones,aperturas_fichas,dia_completo,festivo'].concat(Dd.dias.map(d => [d.fecha, DS[dSem(d.fecha)], d.sesiones, d.aperturas, completo(d) ? 'sí' : 'no', FEST.has(d.fecha) ? 'sí' : 'no'].join(','))).join('\n') + '\n';
  const csvHoras = () => ['fecha,hora,sesiones,aperturas_fichas'].concat(Dd.dias.flatMap(d => d.h.map((v, i) => [d.fecha, i, v, d.ah[i]].join(',')))).join('\n') + '\n';
  const csvFichas = () => ['fecha,id,escala,eje,grupo,aperturas'].concat(Dd.fichas.flatMap(f => f.dia.map((v, i) => [Dd.fechas[i], f.id, f.escala, f.eje, f.grupo, v].map(csvCelda).join(',')))).join('\n') + '\n';
  const csvAud = () => ['periodo,desde,hasta,dimension,categoria,visitas_mas_eventos'].concat(Object.entries(Dd.audiencia).flatMap(([p, a]) => ['pais', 'pantalla', 'sistema', 'navegador', 'referente'].flatMap(k => a[k].map(([n, v]) => [p, a.desde, a.hasta, k, n, v].map(csvCelda).join(','))))).join('\n') + '\n';
  const sello = Dd.leido.slice(0, 16).replace(/[:T]/g, '-');
  const hoy = new Intl.DateTimeFormat('es-CO', {timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric'}).format(new Date());
  const btn = (txt, fn) => h('button', {type: 'button', class: 'boton', onclick: fn, text: txt});
  sec.replaceChildren(titulo(7, 'Abierto y verificable', 'Datos y método', 't-datos'),
    tarjeta('Qué se cuenta', null, h('ul', {class: 'lista'},
      h('li', null, 'Los datos vienen del panel público de GoatCounter de VGI Digital (', h('a', {href: Dd.fuente, target: '_blank', rel: 'noopener', text: 'vgidigitalco.goatcounter.com'}), '). Un proceso automático lo lee cada 15 minutos; la hora de la última lectura aparece arriba.'),
      h('li', null, 'GoatCounter cuenta sesiones, no personas: quien vuelve otro día suma otra sesión. No usa cookies ni guarda datos personales, y la app nunca envía respuestas, puntajes ni datos de pacientes.'),
      h('li', null, 'Una apertura de ficha se registra una vez por sesión; mide cuántas sesiones consultaron cada escala, no cuántos cálculos se completaron ni su uso clínico.'),
      h('li', null, 'Países, dispositivos, sistemas y referentes se cuentan sobre visitas más eventos: sus porcentajes son aproximados.'),
      h('li', null, 'La analítica empezó el 28 de septiembre de 2026 a las 22:00 (versión 2.10.11), por eso ese día va parcial. El día en curso llega solo hasta la hora de la lectura. Las horas son de Colombia (UTC-5).'),
      h('li', null, 'Los promedios por día usan solo días completos, y los festivos de Colombia cuentan como no laborables.'))),
    tarjeta('Descargar los datos', 'Archivos CSV con la lectura que estás viendo, para revisarlos o analizarlos por tu cuenta.', h('div', {class: 'descargas'},
      btn('Sesiones por día', () => descargar('vgi_uso_diario_' + sello + '.csv', csvDias())),
      btn('Sesiones por hora', () => descargar('vgi_uso_por_hora_' + sello + '.csv', csvHoras())),
      btn('Fichas por día', () => descargar('vgi_fichas_por_dia_' + sello + '.csv', csvFichas())),
      btn('Audiencia', () => descargar('vgi_audiencia_' + sello + '.csv', csvAud())),
      h('a', {class: 'boton', href: URL_DATOS, download: 'vgi_uso_' + sello + '.json', text: 'Todo en JSON'}))),
    tarjeta('Historial público', null, h('p', {class: 'nota', style: 'margin:0'}, 'Cada lectura que cambia las cifras queda guardada con su fecha y hora en el ', h('a', {href: REPO + '/commits/main/datos/uso.json', target: '_blank', rel: 'noopener', text: 'historial del repositorio'}), ', y el código que la produce está en ', h('a', {href: REPO, target: '_blank', rel: 'noopener', text: 'github.com/DRCLLANO/vgi-uso'}), '. Así cualquiera puede comprobar de dónde sale cada número.')),
    tarjeta('Cómo citar', null, h('div', {class: 'cita', text: 'Llano Ceballos CC. Uso de VGI Digital [tablero en línea]. Datos de GoatCounter (vgidigitalco), actualizados cada 15 minutos. Disponible en: https://drcllano.github.io/vgi-uso/ (consultado el ' + hoy + ').'})));
}

/* ---------- navegación ---------- */
const PINTORES = {panorama: vistaPanorama, dia: vistaDia, reloj: vistaReloj, calor: vistaCalor, fichas: vistaFichas, audiencia: vistaAudiencia, datos: vistaDatos};
function pintar(){
  if (!D()) return;
  document.getElementById('cargando').hidden = true;
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.dataset.v === estado.v));
  document.querySelectorAll('.menu a').forEach(a => { if (a.dataset.v === estado.v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.querySelectorAll('.periodos button').forEach(bt => bt.setAttribute('aria-pressed', String(bt.dataset.p === estado.p)));
  const sec = document.getElementById('v-' + estado.v);
  try { PINTORES[estado.v](sec); } catch (e) { console.error(e); sec.replaceChildren(h('p', {class: 'aviso', text: 'No se pudo dibujar esta sección con la última lectura.'})); }
  pintarVivo();
}
function leerHash(){
  const [v, p] = location.hash.slice(1).split('/');
  if (VISTAS.includes(v)) estado.v = v;
  if (['7', '30', 'todo'].includes(p)) estado.p = p;
}
function irA(v, p){
  estado.v = v || estado.v; estado.p = p || estado.p;
  history.replaceState(null, '', '#' + estado.v + (estado.p !== 'todo' ? '/' + estado.p : ''));
  cerrarMenu(); pintar(); window.scrollTo({top: 0});
}
function cerrarMenu(){ document.getElementById('menu').classList.remove('abierto'); document.getElementById('velo').classList.remove('abierto'); document.getElementById('btn-menu').setAttribute('aria-expanded', 'false'); }

async function cargar(manual){
  const bt = document.getElementById('btn-actualizar');
  if (manual) { bt.classList.remove('gira'); void bt.offsetWidth; bt.classList.add('gira'); }
  try {
    const r = await fetch(URL_DATOS + '?t=' + Date.now(), {cache: 'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const nuevo = await r.json();
    const cambio = !estado.datos || nuevo.leido !== estado.datos.leido;
    estado.datos = nuevo;
    if (cambio) pintar(); else pintarVivo();
  } catch (e) {
    console.error(e);
    if (!estado.datos) document.getElementById('cargando').textContent = 'No se pudieron cargar los datos. Intenta de nuevo en unos minutos.';
  }
}

document.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); irA(a.dataset.v); }));
document.querySelectorAll('.periodos button').forEach(bt => bt.addEventListener('click', () => irA(null, bt.dataset.p)));
document.getElementById('btn-actualizar').addEventListener('click', () => cargar(true));
document.getElementById('btn-menu').addEventListener('click', () => { const m = document.getElementById('menu'), ab = !m.classList.contains('abierto'); m.classList.toggle('abierto', ab); document.getElementById('velo').classList.toggle('abierto', ab); document.getElementById('btn-menu').setAttribute('aria-expanded', String(ab)); });
document.getElementById('velo').addEventListener('click', cerrarMenu);
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = Number(e.key) - 1; if (i >= 0 && i < VISTAS.length) irA(VISTAS[i]);
  if (e.key === 'Escape') cerrarMenu();
});
window.addEventListener('hashchange', () => { leerHash(); pintar(); });
let tRes; window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(pintar, 180); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pintar);
document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });

leerHash();
cargar();
setInterval(cargar, RECARGA_MS);
setInterval(pintarVivo, 30000);
})();
