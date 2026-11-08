const PUBLICA = true;   // versión para compartir: sin conectores ni Claude
const FUENTE_WEB = "https://cxyyowzduuwenicsyxcz.supabase.co/functions/v1/resultados-doma";   // en la versión de GitHub Pages: función de Supabase que devuelve la web de resultados
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const LETRAS_PISTA = "AKVESHCMRBPFDLXIG";

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const guardar = (k,v) => { try{ localStorage.setItem("domaclm."+k, JSON.stringify(v)); }catch(e){} };
const leer = (k,d) => { try{ const v = localStorage.getItem("domaclm."+k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } };
function norm(s){
  return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/\(campeonato\)/g," campeonato ").replace(/[*º°]/g," ").replace(/[-_.,;:()\/]/g," ")
    .replace(/(\d)([a-z])/g,"$1 $2").replace(/\bposcion\b/g,"posicion").replace(/\s+/g," ").trim();
}
// Une el nombre de una prueba de los resultados con el de la orden de salida. En resultados-ecuestres.es, «(CDT)» = sin campeonato y sin nada = campeonato
function pruebaOS(nombreRes, pruebasOS){
  const n = norm(nombreRes);
  if (/\bcdt\b/.test(n)){ const b = n.replace(/\bcdt\b/g,"").replace(/\s+/g," ").trim(); return pruebasOS.find(p => norm(p) === b) || null; }
  const exacta = pruebasOS.find(p => norm(p) === n), camp = pruebasOS.find(p => norm(p) === n + " campeonato");
  return (st.subida ? (exacta || camp) : (camp || exacta)) || null;   // en la web de resultados de hoy, sin «(CDT)» es la de campeonato
}
const fmtPuesto = p => (p === null || p === undefined || p === "") ? "–" : (/^\d+$/.test(String(p)) ? p + ".º" : String(p));
const sinCamp = s => norm(s).replace(/\bcampeonato\b/g,"").replace(/\s+/g," ").trim();
const minutos = h => { const m = /^(\d{1,2}):(\d{2})/.exec(h||""); return m ? (+m[1])*60 + (+m[2]) : null; };
const ahoraMin = () => { const d = new Date(); return d.getHours()*60 + d.getMinutes() + d.getSeconds()/60; };
const fmtHM = m => { const x = Math.round(m); return String(Math.floor(x/60)).padStart(2,"0") + ":" + String(x%60).padStart(2,"0"); };
const hoyISO = () => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };

/* ---------- reprises ---------- */
const cacheRep = {};
function buscarReprise(prueba){
  const key = sinCamp(prueba);
  if (key in cacheRep) return cacheRep[key];
  const pt = new Set(key.replace(/\basiento y posicion\b/g,"ap").split(" "));
  let mejor = null, mejorN = 0;
  for (const [nivel,nombre,url] of CATALOGO){
    const ct = norm(nombre).replace(/\b(19|20)\d\d\b/g,"").trim().split(" ").filter(Boolean);
    if (ct.length && ct.every(t => pt.has(t)) && ct.length > mejorN){ mejor = {nivel,nombre,url}; mejorN = ct.length; }
  }
  return (cacheRep[key] = mejor);
}
function letrasDe(s){
  const out = [];
  for (const tok of String(s||"").split(/[\s,·]+/)) if (tok && [...tok].every(ch => LETRAS_PISTA.includes(ch))) for (const ch of tok) if (out[out.length-1] !== ch) out.push(ch);
  return out;
}

/* ---------- estado ---------- */
const st = {
  tab: "salidas", pista: "Todas", q: "",
  sel: leer("sel", null), mov: leer("mov", 0),
  offset: Object.fromEntries(Object.entries(leer("offset", {}) || {}).filter(([k,v]) => v && typeof v === "object")),   // retraso (+) o adelanto (−) por pista: {min, bloque}
  subida: PUBLICA ? null : leer("subida", null),            // orden de salida de otro concurso, si se ha cargado
  res: null,
  enlaceRes: leer("enlaceRes", EVENTO_HOY.web),
  estadoRes: "", estadoOS: "", textoRes: "", cargandoWeb: false, vistaRes: leer("vistaRes", "campeonato"),
  autoOn: leer("autoOn", true), autoListo: FUENTE_WEB ? true : leer("autoListo", false), ultimaAuto: 0,
  catRes: leer("catRes", "")   // categoría elegida en Clasificaciones ("" = todas)
};
function iniciarRes(){
  const guardado = leer("res", {pruebas:[], hora:null});
  if (st.subida){ st.res = guardado; return; }
  const out = [...fotoJ1(), ...RES_FOTO.pruebas.map(p => ({...p, jornada:2, foto:true}))];
  for (const g of guardado.pruebas || []){
    const i = out.findIndex(o => jor(o) === jor(g) && norm(o.prueba) === norm(g.prueba));
    if (i < 0) out.push(g); else if ((g.actualizado || "") >= (out[i].actualizado || "")) out[i] = g;
  }
  st.res = {pruebas: out, hora: guardado.hora && guardado.hora > RES_FOTO.hora ? guardado.hora : RES_FOTO.hora};
}
function evento(){ return st.subida ? {nombre: st.subida.concurso || "Concurso cargado", corto: st.subida.concurso || "Concurso cargado", fecha: st.subida.fecha || "", fechaTxt: st.subida.fecha || "", web: st.enlaceRes} : EVENTO_HOY; }
function salidas(){
  const raw = st.subida ? st.subida.salidas.map(s => [s.pista||"Pista", s.prueba||"", s.orden||"", s.hora||"", s.jinete||"", s.caballo||""]) : SALIDAS_HOY;
  return aplicarRetrasos(raw.map(([pista,prueba,orden,hora,jinete,caballo]) => ({pista,prueba,orden,hora,jinete,caballo,key:[pista,hora,jinete,caballo].join("|"),m:minutos(hora)}))
            .sort((a,b) => a.pista.localeCompare(b.pista) || (a.m??0)-(b.m??0)));
}
// Descansos de la orden de salida de hoy: el retraso o adelanto se aplica hasta el siguiente descanso
const DESCANSOS_HOY = {"Júcar":["11:26","14:07"], "Huécar":["11:20","14:06"]};   // hora del último jinete antes de cada descanso
const DURACION = 7;   // minutos entre salidas
function aplicarRetrasos(arr){
  for (const p of pistas(arr)){
    const l = arr.filter(s => s.pista === p && s.m != null);
    let b = 0;
    l.forEach((s,i) => {
      s.bloque = b;
      const sig = l[i+1]; if (!sig) return;
      const corte = st.subida ? (sig.m - s.m >= 20) : (DESCANSOS_HOY[p] || []).includes(s.hora);
      if (corte) b++;
    });
    const o = st.offset[p], offs = {};
    if (o && typeof o === "object"){
      for (let k = 0; k <= b; k++){
        if (k < o.bloque) offs[k] = 0;
        else if (k === o.bloque) offs[k] = o.min;
        else {   // si el retraso no cabe en el descanso, pasa lo que sobra al siguiente bloque
          const ult = l.filter(s => s.bloque === k-1).pop(), pri = l.find(s => s.bloque === k);
          offs[k] = Math.max(0, offs[k-1] - (pri.m - (ult.m + DURACION)));
        }
      }
    }
    l.forEach(s => { s.desfase = offs[s.bloque] || 0; s.mE = s.m + s.desfase; });
  }
  arr.forEach(s => { if (s.mE == null){ s.mE = s.m; s.desfase = 0; } });
  return arr;
}
const horaPrevista = s => s.desfase ? `≈${fmtHM(s.mE)}` : "";
const pistas = list => [...new Set(list.map(s => s.pista))];
function enPista(list, pista){
  const l = list.filter(s => s.pista === pista && s.mE != null).sort((a,b) => a.mE - b.mE), t = ahoraMin();
  if (!l.length) return {};
  let i = -1; l.forEach((s,k) => { if (s.mE <= t) i = k; });
  const sig = l[i+1] || null;
  if (i < 0) return {antes:true, sig};
  const act = l[i], fin = (sig ? sig.mE : act.mE + 8);
  if (t - act.mE <= Math.min(9, fin - act.mE + 1)) return {act, sig};
  return {pausa:true, sig, ultimo: !sig};
}
function resultadoDe(s){
  const nj = norm(s.jinete), todas = [...new Set(salidas().map(x => x.prueba))];
  for (const p of st.res.pruebas || []){
    if (jor(p) !== 2 || pruebaOS(p.prueba, todas) !== s.prueba) continue;
    for (const r of p.clasificacion || []){
    const rn = norm(r.jinete);
    if (rn && (rn === nj || nj.includes(rn) || rn.includes(nj))){
      if (r.caballo && s.caballo && !norm(s.caballo).includes(norm(r.caballo).split(" ")[0])) continue;
      return r;
    }
  }
  }
  return null;
}

/* ---------- vista: salidas ---------- */
function vSalidas(){
  const list = salidas(), ev = evento(), t = ahoraMin(), esHoy = !st.subida && hoyISO() === EVENTO_HOY.fecha;
  const ps = pistas(list);
  let h = "";
  h += `<section class="now-grid" aria-label="Ahora en pista">` + ps.map((p, ip) => {
    const e = enPista(list, p), o = st.offset[p], off = o && typeof o === "object" ? Math.round(o.min) : 0;
    const actual = e.act ? e.act.key : "";
    const opciones = (actual ? "" : `<option value="" selected>Elige quién está en pista</option>`) +
      list.filter(s => s.pista === p).map(s => `<option value="${esc(s.key)}"${s.key === actual ? " selected" : ""}>${esc(s.hora)} · ${esc(s.jinete)} · ${esc(s.caballo)}</option>`).join("");
    const ajuste = `<select id="enpista-${ip}" data-pistasel="${esc(p)}" aria-label="Quién está en pista en ${esc(p)}">${opciones}</select>` +
      (off ? `<div class="row small" style="justify-content:space-between"><span class="pill ${off > 0 ? "hl" : ""}">${off > 0 ? `${off} min de retraso` : `${-off} min de adelanto`} hasta el descanso</span><button class="btn small" data-act="resetOffset" data-pistareset="${esc(p)}">Volver al horario</button></div>` : "");
    let estado, body = "";
    if (e.act){ estado = `<span class="pill hl">En pista · ${esc(e.act.hora)}</span>`; body = `<div class="who">${esc(e.act.jinete)}</div><div class="horse">${esc(e.act.caballo)} · ${esc(e.act.prueba)}</div>`; }
    else if (e.antes){ estado = `<span class="pill grey">Empieza ${esc(e.sig?.hora||"")}</span>`; body = `<div class="who">${esc(e.sig?.jinete||"")}</div><div class="horse">${esc(e.sig?.caballo||"")}</div>`; }
    else if (e.ultimo) estado = `<span class="pill grey">Terminada</span>`;
    else estado = `<span class="pill grey">Descanso</span>`;
    const pie = `<div class="pie"><span class="small muted">${e.sig && !e.antes ? `Siguiente: <b>${esc(e.sig.desfase ? horaPrevista(e.sig) : e.sig.hora)}</b> ${esc(e.sig.jinete)}` : ""}</span>${e.act ? `<button class="btn primary" data-sel="${esc(e.act.key)}">Seguir reprise ›</button>` : ""}</div>`;
    return `<div class="now"><div class="pista">${esc(p)}${estado}</div>${body}${pie}${ajuste}</div>`;
  }).join("") + `</section>`;
  if (!st.subida) h += `<div class="row" style="justify-content:space-between"><span class="small muted">${st.estadoRes || ("Clasificaciones hasta las " + esc(st.res.hora || "--:--"))}</span>${botonActualizar()}</div>`;
  if (!esHoy && !st.subida) h += `<p class="note">Lo que está «en pista» se calcula con la hora del móvil y el horario de la orden de salida (${esc(EVENTO_HOY.fechaTxt)}).</p>`;

  h += `<section class="card" style="display:flex;flex-direction:column;gap:10px">
    <div class="row"><div class="seg" role="group" aria-label="Pista">${["Todas",...ps].map(p => `<button data-pista="${esc(p)}" aria-pressed="${st.pista===p}">${esc(p)}</button>`).join("")}</div></div>
    <label class="label" for="buscar">Buscar jinete o caballo</label>
    <input type="search" id="buscar" placeholder="Por ejemplo: Valtierra o Beltran" value="${esc(st.q)}" autocomplete="off">
  </section>`;

  const q = norm(st.q);
  const filtro = list.filter(s => (st.pista==="Todas" || s.pista===st.pista) && (!q || norm(s.jinete+" "+s.caballo).includes(q)));
  // agrupar por pista y prueba, respetando el orden horario
  const grupos = [];
  for (const s of filtro){
    const g = grupos[grupos.length-1];
    if (g && g.pista===s.pista && g.prueba===s.prueba) g.items.push(s); else grupos.push({pista:s.pista, prueba:s.prueba, items:[s]});
  }
  if (!grupos.length) h += `<div class="empty">No hay salidas con ese filtro.</div>`;
  let pistaAnt = null;
  for (const g of grupos){
    if (st.pista==="Todas" && g.pista !== pistaAnt){ h += `<div class="label" style="margin-top:6px">Pista ${esc(g.pista)}</div>`; pistaAnt = g.pista; }
    const rep = buscarReprise(g.prueba);
    const lr = enlaceRes(g.prueba);
    h += `<section class="prueba"><h3>${esc(g.prueba)}</h3><div class="meta">${rep ? "Reprise: "+esc(rep.nombre) + (DETALLE[rep.nombre] ? "" : " · solo PDF") : "Reprise sin identificar"} · ${g.items.length} ${g.items.length===1?"salida":"salidas"}${lr ? ` · <a href="${esc(lr)}" target="_blank" rel="noopener">Resultados en directo ↗</a>` : ""}</div><div class="list">`;
    for (const s of g.items){
      const e = enPista(list, s.pista), live = e.act && e.act.key===s.key;
      const past = !live && s.mE != null && s.mE + 8 < ahoraMin() && (esHoy || st.subida);
      const r = resultadoDe(s);
      h += `<button class="item${live?" live":""}${past?" past":""}${st.sel===s.key?" sel":""}" data-sel="${esc(s.key)}">
        <span class="h">${esc(s.hora)}${s.desfase ? `<small class="est">${horaPrevista(s)}</small>` : ""}</span>
        <span><span class="who">${esc(s.jinete)}</span><br><span class="horse">${esc(s.caballo)}</span></span>
        ${r ? `<span class="res">${esc(fmtPuesto(r.puesto))}<br>${esc(r.resultado??"")}</span>` : `<span class="go" aria-hidden="true">›</span>`}
      </button>`;
    }
    h += `</div></section>`;
  }

  if (!PUBLICA) h += `<details class="card"><summary>Usar la app en otro concurso</summary>
    <p class="small muted">Sube el PDF de la orden de salida de otro concurso. Claude, dentro de la app, la lee y la ordena. Las reprises se enlazan solas con el catálogo de la Real Federación Hípica Española; los ejercicios paso a paso solo están cargados para las reprises de hoy.</p>
    <input type="file" id="fileOS" accept="application/pdf">
    <p class="status" id="estadoOS">${st.estadoOS}</p>
    ${st.subida ? `<button class="btn" data-act="volverHoy">Volver a la orden de hoy (Doma Clásica CLM, 08/11/2026)</button>` : ""}
  </details>`;
  return h;
}

/* ---------- vista: directo ---------- */
function arenaSVG(marcadas){
  const W=140, H=340, x0=20, x1=120, xc=70, y0=20, y1=320;
  const y = m => y0 + m*5;                     // metros desde C
  const pos = {C:[xc,y0],A:[xc,y1],H:[x0,y(6)],S:[x0,y(18)],E:[x0,y(30)],V:[x0,y(42)],K:[x0,y(54)],
               M:[x1,y(6)],R:[x1,y(18)],B:[x1,y(30)],P:[x1,y(42)],F:[x1,y(54)],
               G:[xc,y(6)],I:[xc,y(18)],X:[xc,y(30)],L:[xc,y(42)],D:[xc,y(54)]};
  const lab = {C:[xc,11],A:[xc,334]};
  const set = new Set(marcadas);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pista de 20 por 60 metros${marcadas.length?": letras "+marcadas.join(", "):""}">`;
  s += `<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="2" fill="var(--sand)" stroke="var(--sand-line)" stroke-width="1.5"/>`;
  s += `<line x1="${xc}" y1="${y0}" x2="${xc}" y2="${y1}" stroke="var(--sand-line)" stroke-width="1" stroke-dasharray="3 4"/>`;
  if (marcadas.length > 1){
    const pts = marcadas.map(l => pos[l].join(",")).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="var(--hl)" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="6 4" opacity=".85"/>`;
  }
  for (const [l,[px,py]] of Object.entries(pos)){
    const on = set.has(l), centro = px===xc && l!=="A" && l!=="C";
    let tx = px===x0 ? 9 : px===x1 ? 131 : px; let ty = py;
    if (lab[l]) [tx,ty] = lab[l];
    if (centro){ tx = px + 9; }
    if (on) s += `<circle cx="${centro?px:tx}" cy="${ty}" r="8" fill="var(--hl)"/>`;
    else if (centro) s += `<circle cx="${px}" cy="${py}" r="1.8" fill="var(--sand-line)"/>`;
    const fx = on && centro ? px : tx;
    s += `<text x="${fx}" y="${ty+4}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="${on?12:11}" fill="${on?"var(--hl-ink)":(centro?"var(--muted)":"var(--ink)")}">${l}</text>`;
  }
  s += `<text x="${xc}" y="${y0+16}" text-anchor="middle" font-size="8" fill="var(--muted)" font-family="Barlow, sans-serif">jueces en C</text>`;
  return s + `</svg>`;
}
function vDirecto(){
  const list = salidas();
  const s = list.find(x => x.key === st.sel);
  const ps = pistas(list);
  let h = "";
  const rapidos = `<div class="chips">${ps.map(p => `<button class="btn" data-ahora="${esc(p)}">Ahora en ${esc(p)}</button>`).join("")}</div>`;
  if (!s){
    return h + `<section class="card" style="display:flex;flex-direction:column;gap:10px"><p style="margin:0">Elige un jinete en <b>Salidas</b> o salta al que está ahora en pista.</p>${rapidos}</section>`;
  }
  const rep = buscarReprise(s.prueba), det = rep && DETALLE[rep.nombre];
  const enLaPista = list.filter(x => x.pista === s.pista);
  const idx = enLaPista.findIndex(x => x.key === s.key);
  const r = resultadoDe(s);
  h += `<section class="card rider-head">
    <span class="label">${esc(s.pista)} · ${esc(s.hora)} · ${esc(s.prueba)}</span>
    <span class="name">${esc(s.jinete)}</span>
    <span class="horse">${esc(s.caballo)}</span>
    <div class="row">${r ? `<span class="pill">Hoy: ${esc(fmtPuesto(r.puesto))} · ${esc(r.resultado??"")}</span>` : ""}${(() => { const cf = campeonatoDe(s); if (!cf || !cf.f.puesto) return ""; const f = cf.f; return `<span class="pill hl">Campeonato ${esc(cf.c.nombre)}: ${f.puesto}.º · ${f.media != null ? "media " + fmtNum(f.media) + " %" : "ayer " + fmtNum(f.a) + " %"}</span>`; })()}</div>
    <div class="navr" style="margin-top:6px">
      <button class="btn" data-sel="${esc(enLaPista[idx-1]?.key||"")}" ${idx>0?"":"disabled"}>‹ Jinete ant.</button>
      <button class="btn" data-sel="${esc(enLaPista[idx+1]?.key||"")}" ${idx<enLaPista.length-1?"":"disabled"}>Jinete sig. ›</button>
    </div>
    ${rapidos}
  </section>`;
  if (!rep){
    return h + `<section class="card"><p class="err">No he encontrado la reprise de la prueba «${esc(s.prueba)}».</p><p class="small muted">Búscala en la página de reprises de la Real Federación Hípica Española: <a href="https://rfhe.com/?page_id=1139" target="_blank" rel="noopener">rfhe.com/?page_id=1139</a></p></section>`;
  }
  h += `<section class="card" style="display:flex;flex-direction:column;gap:6px;padding:10px 14px">
    <div><span class="label">Reprise</span> <b style="font-family:var(--display);font-size:19px">${esc(det?.titulo || rep.nombre)}</b> <span class="muted small">${esc(rep.nombre)}${det?.tiempo ? " · ≈ "+esc(det.tiempo) : ""}</span></div>
    <div class="chips"><a class="btn" href="${esc(rep.url)}" target="_blank" rel="noopener">PDF oficial ↗</a>${enlaceRes(s.prueba) ? `<a class="btn" href="${esc(enlaceRes(s.prueba))}" target="_blank" rel="noopener">Resultados ↗</a>` : ""}</div>
  </section>`;
  if (!det){
    return h + `<section class="card"><p style="margin:0">Para esta reprise solo está el PDF oficial. Ábrelo con el botón de arriba.</p></section>`;
  }
  const n = det.ejercicios.length, i = Math.max(0, Math.min(st.mov, n-1)), e = det.ejercicios[i];
  const numOf = (ej,k) => ej[3] || String(k+1);
  h += `<section class="card live-grid">
    <div class="arena">${arenaSVG(letrasDe(e[0]))}</div>
    <div class="current">
      <span class="num">Ejercicio ${esc(numOf(e,i))} · ${i+1} de ${n}${e[2]>1?` · <span class="coef">×${e[2]}</span>`:""}</span>
      <span class="letters">${esc(e[0] || "—")}</span>
      <span class="text">${esc(e[1])}</span>
    </div>
  </section>
  <div class="stepbar"><div class="wrap stepgrid">
    <button class="btn" data-mov="${i-1}" ${i>0?"":"disabled"} aria-label="Ejercicio anterior">‹</button>
    <div class="stepinfo">${i+1} de ${n}<b>${esc(e[0] || "—")}</b></div>
    <button class="btn primary" data-mov="${i+1}" ${i<n-1?"":"disabled"}>Siguiente ›</button>
  </div></div>`;
  if (det.sinLetras) h += `<p class="note">En el PDF de esta reprise no se pueden leer bien las letras de cada ejercicio. Solo salen las que son seguras; el resto, en el PDF oficial.</p>`;
  h += `<section><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="label">Toda la reprise</span><button class="btn small" data-mov="0">Volver al principio</button></div><div class="list" id="movs">`;
  det.ejercicios.forEach((ej,k) => {
    h += `<button class="mov${k<i?" done":""}${k===i?" cur":""}" data-mov="${k}" ${k===i?'aria-current="step"':""}>
      <span class="n">${esc(numOf(ej,k))}</span><span class="l">${esc(ej[0]||"—")}</span><span>${esc(ej[1])}</span>${ej[2]>1?`<span class="coef">×${ej[2]}</span>`:"<span></span>"}</button>`;
  });
  h += `</div></section>`;
  if (det.conjunto?.length) h += `<section class="card"><span class="label">Notas de conjunto</span><ul style="margin:6px 0 0;padding-left:18px">${det.conjunto.map(c => `<li>${esc(c[0])}${c[1]?` <span class="coef">×${c[1]}</span>`:""}</li>`).join("")}</ul></section>`;
  h += `<p class="note">Ejercicios resumidos del PDF oficial de la Real Federación Hípica Española. Si algo no cuadra con lo que ves en pista, manda el PDF oficial. La reprise de cada prueba se deduce por su nombre en la orden de salida.</p>`;
  return h;
}

/* ---------- campeonato: media de ayer y hoy ---------- */
const claveBin = (j,c) => norm(j) + "|" + (norm(c).split(" ")[0] || "");
function filasDia(c, jornada, list){
  const pruebas = (st.res.pruebas || []).filter(p => jor(p) === jornada);
  if (jornada === 1) return (pruebas.find(p => norm(p.prueba) === norm(c.d1)) || {}).clasificacion || [];
  const nombresOS = [...new Set(list.map(x => x.prueba))];
  const p = pruebas.find(p => pruebaOS(p.prueba, nombresOS) === c.os);
  const enOS = new Set(list.filter(x => x.prueba === c.os).map(x => claveBin(x.jinete, x.caballo)));
  return ((p || {}).clasificacion || []).filter(r => enOS.has(claveBin(r.jinete, r.caballo)));   // la web a veces mezcla binomios de otra prueba
}
function calcularCampeonato(c){
  const list = salidas(), bin = new Map();
  const toma = (j, c2) => { const k = claveBin(j, c2); if (!bin.has(k)) bin.set(k, {jinete:j, caballo:c2, d1:null, d2:null, hora:null}); return bin.get(k); };
  for (const r of filasDia(c, 1, list)) toma(r.jinete, r.caballo).d1 = r;
  for (const s of list.filter(x => x.prueba === c.os)){ const b = toma(s.jinete, s.caballo); b.hora = s.desfase ? fmtHM(s.mE) : s.hora; b.m = s.mE; }
  for (const r of filasDia(c, 2, list)) toma(r.jinete, r.caballo).d2 = r;
  const filas = [...bin.values()].map(b => {
    const a = b.d1 && /^\d+$/.test(String(b.d1.puesto)) ? numRes(b.d1.resultado) : null;
    const h = b.d2 && /^\d+$/.test(String(b.d2.puesto)) ? numRes(b.d2.resultado) : null;
    const fuera = [b.d1, b.d2].some(r => r && CODIGOS[String(r.puesto).toUpperCase()]);   // eliminado, retirado o no presentado un día: sin puesto
    return {...b, a, h, fuera, media: a != null && h != null ? (a + h) / 2 : null};
  });
  const orden = f => f.fuera ? [3, -(f.a ?? f.h ?? 0)] : f.media != null ? [0, -f.media] : (f.a != null || f.h != null) ? [1, -(f.a ?? f.h)] : [2, 0];
  filas.sort((x,y) => { const ox = orden(x), oy = orden(y); return ox[0]-oy[0] || ox[1]-oy[1]; });
  let pos = 0, ant = null;
  filas.forEach((f,i) => { const v = orden(f); if (v[0] >= 2){ f.puesto = null; return; } if (!ant || ant[0] !== v[0] || ant[1] !== v[1]) pos = i + 1; f.puesto = pos; ant = v; });
  return filas;
}
function campeonatoDe(s){
  const c = CAMPEONATOS.find(c => c.os === s.prueba); if (!c) return null;
  const f = calcularCampeonato(c).find(f => claveBin(f.jinete, f.caballo) === claveBin(s.jinete, s.caballo));
  return f ? {c, f} : null;
}
function celdaDia(r, valor, f, hoy){
  if (valor != null) return fmtNum(valor);
  if (r && r.puesto) return `<span class="muted">${esc(fmtPuesto(r.puesto))}</span>`;
  if (hoy && f.hora){ return f.m != null && f.m > ahoraMin() - 8 ? `<span class="muted">${esc(f.hora)}</span>` : `<span class="muted">…</span>`; }
  return `<span class="muted">–</span>`;
}
function vCampeonato(){
  let h = `<p class="small muted" style="margin:0">Provisional. Media de la prueba de ayer y la de hoy, con el mismo peso.</p>`;
  for (const c of CAMPEONATOS){
    if (st.catRes && c.nombre !== st.catRes) continue;
    const filas = calcularCampeonato(c);
    if (!filas.length) continue;
    h += `<section class="card"><div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="font-family:var(--display);margin:0;font-size:21px">${esc(c.nombre)}</h3><span class="small muted">${esc(c.d1)} + ${esc(c.d2)}</span></div>
      <div style="overflow-x:auto;margin-top:6px"><table class="camp"><thead><tr><th class="num">Pto.</th><th>Jinete y caballo</th><th class="num">Ayer<br>Hoy</th><th class="num">Media</th></tr></thead><tbody>${
      filas.map(f => `<tr${f.puesto && f.puesto <= 3 && f.media != null ? ' class="podio"' : ""}><td class="num">${f.puesto ? f.puesto + ".º" : "–"}</td><td><b>${esc(f.jinete)}</b><br><span class="horse">${esc(f.caballo)}</span></td><td class="num dias">${celdaDia(f.d1, f.a, f, false)}<br>${celdaDia(f.d2, f.h, f, true)}</td><td class="num media"><b>${f.media != null ? fmtNum(f.media) : "–"}</b></td></tr>`).join("")
      }</tbody></table></div></section>`;
  }
  return h;
}

/* ---------- vista: clasificaciones ---------- */
function masOpciones(){
  if (PUBLICA) return "";
  return `<details class="card"><summary>Más opciones</summary>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <div class="row"><label class="btn" for="fileRes">Subir PDF de resultados</label><input class="hidden" type="file" id="fileRes" accept="application/pdf" multiple></div>
      <label class="label" for="pegado">Pegar texto de resultados</label>
      <textarea id="pegado">${esc(st.textoRes)}</textarea>
      <div class="row"><button class="btn" data-act="ordenarTexto">Ordenar con Claude</button></div>
      <label class="label" for="enlace">Enlace de la web de resultados</label>
      <input type="url" id="enlace" value="${esc(st.enlaceRes)}">
      <div class="row"><button class="btn" data-act="guardarEnlace">Guardar enlace</button><button class="btn" data-act="borrarRes">Volver a los datos de origen</button></div>
    </div></details>`;
}
// Filtro por categoría: hoy, las categorías del campeonato; en otro concurso, cada prueba
function categorias(){
  if (st.subida) return [...new Set(salidas().map(s => s.prueba))].map(p => ({id:p, nombre:p}));
  return CAMPEONATOS.map(c => ({id:c.nombre, nombre:c.nombre}));
}
function pruebaEnCategoria(prueba){
  if (!st.catRes) return true;
  if (st.subida) return prueba === st.catRes;
  const c = CAMPEONATOS.find(c => c.nombre === st.catRes);
  return !!c && sinCamp(prueba) === sinCamp(c.os);   // la prueba de campeonato y la que no lo es
}
const selectorCategoria = () => `<select id="catRes" aria-label="Categoría">${[{id:"", nombre:"Todas las categorías"}, ...categorias()].map(o => `<option value="${esc(o.id)}"${o.id === st.catRes ? " selected" : ""}>${esc(o.nombre)}</option>`).join("")}</select>`;
function vClasif(){
  if (st.catRes && !categorias().some(c => c.id === st.catRes)) st.catRes = "";
  const list = salidas();
  const pruebasOS = []; for (const s of list) if (!pruebasOS.some(p => p.prueba===s.prueba && p.pista===s.pista)) pruebasOS.push({pista:s.pista, prueba:s.prueba});
  const res = (st.res.pruebas || []).filter(p => jor(p) === 2);
  const usadas = new Set();
  const nombresOS = pruebasOS.map(p => p.prueba);
  const buscar = prueba => { const i = res.findIndex(r => pruebaOS(r.prueba, nombresOS) === prueba); if (i>=0){ usadas.add(i); return res[i]; } return null; };
  let h = `<section class="card" style="display:flex;flex-direction:column;gap:10px">
    <div class="row" style="justify-content:space-between">${botonActualizar()}<a class="btn" href="${esc(st.enlaceRes)}" target="_blank" rel="noopener">Web de resultados ↗</a></div>
    ${casillaAuto()}
    <p class="status" id="estadoRes" style="margin:0">${st.estadoRes || (st.res.hora ? `Datos hasta las ${esc(st.res.hora)}` : "")}</p>
    ${st.subida ? "" : `<div class="seg" role="group" aria-label="Vista">${[["campeonato","Campeonato"],["hoy","Pruebas de hoy"]].map(([k,t]) => `<button data-vista="${k}" aria-pressed="${st.vistaRes===k}">${t}</button>`).join("")}</div>`}
    ${selectorCategoria()}
  </section>`;
  if (!st.subida && st.vistaRes === "campeonato") return h + vCampeonato() + masOpciones();
  const tabla = r => r && r.clasificacion?.length ? `<div style="overflow-x:auto"><table><thead><tr><th class="num">Puesto</th><th>Jinete y caballo</th><th class="num">Resultado</th></tr></thead><tbody>${
      r.clasificacion.map(c => `<tr><td class="num">${esc(fmtPuesto(c.puesto))}</td><td><b>${esc(c.jinete)}</b><br><span class="horse">${esc(c.caballo||"")}</span></td><td class="num">${esc(c.resultado||"")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Sin clasificación cargada.</div>`;
  let pistaAnt = null;
  for (const p of pruebasOS){
    if (!pruebaEnCategoria(p.prueba)) continue;
    if (p.pista !== pistaAnt){ h += `<div class="label" style="margin-top:4px">Pista ${esc(p.pista)}</div>`; pistaAnt = p.pista; }
    const r0 = buscar(p.prueba), lr = enlaceRes(p.prueba);
    const jinetes = list.filter(x => x.prueba === p.prueba && x.pista === p.pista).map(x => new Set(norm(x.jinete).split(" ")));
    const esDeLaPrueba = c => { const t = norm(c.jinete).split(" "); return jinetes.some(js => t.filter(w => w.length > 2 && js.has(w)).length >= 2); };
    const r = r0 ? {...r0, clasificacion: (r0.clasificacion || []).filter(esDeLaPrueba)} : null;
    const quitadas = r0 ? (r0.clasificacion || []).length - r.clasificacion.length : 0;
    h += `<section class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="font-family:var(--display);margin:0;font-size:19px">${esc(p.prueba)}</h3>${lr ? `<a class="small" href="${esc(lr)}" target="_blank" rel="noopener">Web ↗</a>` : ""}</div>${r && r.actualizado ? `<p class="small muted" style="margin:0 0 6px">${esc(r.actualizado)}</p>` : ""}${tabla(r)}</section>`;
  }
  const otras = st.catRes ? [] : res.filter((r,i) => !usadas.has(i));
  if (otras.length){
    h += `<div class="label">Otras pruebas encontradas en los resultados</div>`;
    for (const r of otras) h += `<section class="card"><h3 style="font-family:var(--display);margin:0 0 6px;font-size:19px">${esc(r.prueba)}</h3>${tabla(r)}</section>`;
  }
  return h + masOpciones();
}

/* ---------- PDF y Claude ---------- */
function cargarScript(src){ return new Promise((ok,ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("No se ha podido cargar el lector de PDF.")); document.head.appendChild(s); }); }
let pdfP = null;
function lectorPDF(){
  if (!pdfP) pdfP = (async () => {
    await cargarScript(PDFJS+"pdf.min.js");
    await cargarScript(PDFJS+"pdf.worker.min.js");   // se ejecuta en la propia página
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS+"pdf.worker.min.js";
    return window.pdfjsLib;
  })().catch(e => { pdfP = null; throw e; });
  return pdfP;
}
async function textoPDF(file){
  const lib = await lectorPDF();
  const doc = await lib.getDocument({data: await file.arrayBuffer(), isEvalSupported:false}).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++){
    const tc = await (await doc.getPage(p)).getTextContent();
    const lines = []; let line = "", lastY = null;
    for (const it of tc.items){
      const yy = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(yy-lastY) > 2){ lines.push(line); line = ""; }
      if (it.str) line += (line && !line.endsWith(" ") ? "  " : "") + it.str;
      lastY = yy;
    }
    if (line) lines.push(line);
    out += `\n--- ${file.name} · página ${p} ---\n` + lines.join("\n");
  }
  return out;
}
let samplerP = null;
function claudeSample(){
  if (!samplerP) samplerP = (window.claude && typeof window.claude.use === "function") ? window.claude.use("sample").catch(() => null) : Promise.resolve(null);
  return samplerP;
}
async function pedirJSON(instrucciones, texto){
  const s = await claudeSample();
  if (!s) throw new Error("Claude no está disponible en esta vista. Abre la app desde Claude.");
  const input = instrucciones + "\n\n<texto>\n" + texto.slice(0, 150000) + "\n</texto>";
  try{
    if (typeof s.json === "function") return await s.json(input, {modelTier:"default"});
    const r = await s(input, {modelTier:"default"});
    const t = r.text || ""; return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}")+1));
  }catch(e){
    if (e && e.code === "not_granted") throw new Error("La app no tiene permiso para usar Claude. Vuelve a intentarlo y acepta el permiso.");
    if (e && e.code === "rate_limited") throw new Error("Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo.");
    throw new Error("Claude no ha podido ordenar el texto. Prueba con otro PDF o pega el texto.");
  }
}
const INSTR_RES = `Eres un extractor de datos. El texto es una o varias clasificaciones de un concurso de doma clásica.
Devuelve SOLO un objeto JSON, sin comentarios, con esta forma:
{"pruebas":[{"prueba":"nombre de la prueba tal como aparece","clasificacion":[{"puesto":1,"jinete":"Nombre Apellidos","caballo":"NOMBRE","resultado":"68,529 %"}]}]}
Reglas: copia los nombres tal cual, sin "D." ni "Dña.". En "resultado" pon el porcentaje final o la nota total que aparezca. Si un participante está eliminado (ELI), retirado (RET) o no presentado (NOP), pon ese código en "puesto" y en "resultado" "Eliminado", "Retirado" o "No presentado". Si alguien aún no tiene nota, no lo incluyas. Si la prueba lleva "(CDT)" en el nombre, mantenlo. No inventes nada. Si no hay clasificaciones, devuelve {"pruebas":[]}.`;
const INSTR_OS = `Eres un extractor de datos. El texto es la orden de salida de un concurso hípico.
Devuelve SOLO un objeto JSON, sin comentarios, con esta forma:
{"concurso":"nombre del concurso","fecha":"DD/MM/AAAA","salidas":[{"pista":"nombre de la pista o Pista única","prueba":"nombre de la prueba tal como aparece","orden":1,"hora":"09:00","jinete":"Nombre Apellidos","caballo":"NOMBRE"}]}
Reglas: copia los nombres tal cual, sin "D." ni "Dña.". Hora con dos cifras (09:00). Si una salida aparece repetida en dos bloques, inclúyela una sola vez, en su hora. No inventes nada.`;
function horaTxt(){ const d = new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
function mezclarRes(nuevas){
  const actuales = (st.res.pruebas || []).slice();
  for (const p of nuevas || []){
    if (!p || !p.prueba) continue;
    p.actualizado = p.actualizado || horaTxt();
    const i = actuales.findIndex(a => jor(a) === jor(p) && norm(a.prueba) === norm(p.prueba));
    if (i >= 0) actuales[i] = p; else actuales.push(p);
  }
  st.res = {pruebas: actuales, hora: horaTxt()};
  const propias = actuales.filter(a => !a.foto);
  guardar("res", {pruebas: propias, hora: st.res.hora});
}
async function procesarRes(texto){
  st.estadoRes = "Claude está ordenando las clasificaciones…"; render();
  try{
    const j = await pedirJSON(INSTR_RES, texto);
    const n = (j.pruebas || []).length;
    mezclarRes(j.pruebas);
    st.estadoRes = n ? `Cargadas ${n} ${n===1?"prueba":"pruebas"} a las ${horaTxt()}.` : "Claude no ha encontrado clasificaciones en ese texto.";
  }catch(e){ st.estadoRes = `<span class="err">${esc(e.message)}</span>`; }
  render();
}

/* ---------- actualizar desde la web de resultados (vía el conector de Supabase de Solico) ---------- */
const SUPABASE = "SupaBase Solico";
const RES_GENERAL_J1 = RES_GENERAL.replace("jornada=2", "jornada=1");
const SQL_RES = `select 1 as jornada, status, substr(content, greatest(strpos(content, '<div class="card-panel'), 1)) as html from extensions.http_get('${RES_GENERAL_J1}')
union all
select 2, status, substr(content, greatest(strpos(content, '<div class="card-panel'), 1)) from extensions.http_get('${RES_GENERAL}')`;
// En automático solo se lee hoy: lo de ayer ya no cambia
const SQL_RES_HOY = `select 2 as jornada, status, substr(content, greatest(strpos(content, '<div class="card-panel'), 1)) as html from extensions.http_get('${RES_GENERAL}')`;
const AUTO_MS = 120000;
const enfocado = () => { const a = document.activeElement; return a && /^(SELECT|INPUT|TEXTAREA)$/.test(a.tagName); };
const CODIGOS = {ELI:"Eliminado", NOP:"No presentado", RET:"Retirado", NP:"No presentado", DES:"Descalificado"};
function filasSQL(payload){
  let t = payload;
  if (Array.isArray(t)) return t;
  if (t && typeof t === "object") t = t.result ?? JSON.stringify(t);
  t = String(t || "");
  const m = /<untrusted-data-[^>]*>\s*([\s\S]*?)\s*<\/untrusted-data-/.exec(t);
  const body = m ? m[1] : t;
  return JSON.parse(body.slice(body.indexOf("["), body.lastIndexOf("]") + 1));
}
function leerTablas(html, jornada){
  const doc = new DOMParser().parseFromString(html, "text/html");   // documento inerte: no ejecuta nada
  const out = [];
  doc.querySelectorAll(".card-panel").forEach(panel => {
    const h4 = panel.querySelector("h4"); if (!h4) return;
    const textoAct = [...panel.querySelectorAll("p")].map(x => x.textContent).find(x => /actualizaci/i.test(x)) || "";
    const ma = /(\d{2}:\d{2})(:\d{2})?/.exec(textoAct);
    const clasificacion = [];
    panel.querySelectorAll("table tbody tr").forEach(tr => {
      const tds = [...tr.querySelectorAll("td")];
      if (tds.length < 2) return;
      const puesto = tds[0].textContent.trim();
      const pEl = tds[1].querySelector("p") || tds[1];
      const partes = [""];
      for (const n of pEl.childNodes){ if (n.nodeName === "BR") partes.push(""); else partes[partes.length-1] += n.textContent; }
      const jinete = (partes[0] || "").trim().replace(/^(D\.|Dña\.)\s*/, "");
      const caballo = (partes[1] || "").trim();
      const visibles = tds.slice(2).filter(td => !td.classList.contains("hide-on-small-only"));
      const total = visibles.length ? visibles[visibles.length-1].textContent.trim() : "";
      const cod = puesto.toUpperCase();
      if (/^\d+$/.test(puesto) && total) clasificacion.push({puesto:+puesto, jinete, caballo, resultado: total.replace(".", ",") + " %"});
      else if (CODIGOS[cod]) clasificacion.push({puesto:cod, jinete, caballo, resultado: CODIGOS[cod]});
    });
    out.push({prueba: h4.textContent.trim(), jornada: jornada || 2, actualizado: ma ? ma[1] : "", clasificacion});
  });
  return out;
}
async function actualizarDesdeFuente(auto){
  if (st.cargandoWeb) return;
  st.cargandoWeb = true;
  if (!auto){ st.estadoRes = "Leyendo la web de resultados…"; render(); }
  try{
    const r = await fetch(FUENTE_WEB, {cache:"no-store"});
    if (!r.ok) throw new Error("http");
    const j = await r.json();
    const pruebas = Object.entries(j.jornadas || {}).filter(([k,v]) => v && +v.status === 200).flatMap(([k,v]) => leerTablas(v.html || "", +k));
    if (!pruebas.length) throw new Error("vacio");
    mezclarRes(pruebas);
    st.estadoRes = `Actualizado a las ${horaTxt()}`;
  }catch(e){
    st.estadoRes = `<span class="err">No se ha podido actualizar. Se vuelve a intentar en 2 minutos.</span>`;
  }
  st.ultimaAuto = Date.now();
  st.cargandoWeb = false;
  if (!(auto && enfocado())) render();
}
async function actualizarDesdeWeb(auto){
  if (PUBLICA && FUENTE_WEB) return actualizarDesdeFuente(auto);
  if (st.subida){ if (!auto){ st.estadoRes = `<span class="err">El botón solo sirve para el concurso de hoy. Para otro concurso, pega el texto o sube el PDF.</span>`; render(); } return; }
  if (st.cargandoWeb) return;
  st.cargandoWeb = true;
  if (!auto){ st.estadoRes = "Leyendo la web de resultados…"; render(); }
  try{
    const mcp = window.claude && typeof window.claude.use === "function" ? await window.claude.use("mcp") : null;
    if (!mcp) throw {code:"sin_mcp"};
    const r = await mcp.callTool(SUPABASE, "execute_sql", {query: auto ? SQL_RES_HOY : SQL_RES}, {cache:false});
    const filas = filasSQL(r.payload) || [];
    if (!filas.length) throw {code:"vacio"};
    const malas = filas.filter(f => +f.status !== 200);
    if (malas.length === filas.length) throw {code:"http", status:malas[0].status};
    const pruebas = filas.filter(f => +f.status === 200).flatMap(f => leerTablas(f.html || "", +f.jornada || 2));
    if (!pruebas.length) throw {code:"vacio"};
    mezclarRes(pruebas);
    const conNota = pruebas.filter(p => jor(p) === 2 && p.clasificacion.length).length;
    st.ultimaAuto = Date.now();
    if (!st.autoListo){ st.autoListo = true; guardar("autoListo", true); }
    st.estadoRes = `${auto ? "Actualizado solo" : "Actualizado"} a las ${horaTxt()}: ${conNota} ${conNota===1?"prueba tiene":"pruebas tienen"} ya resultados.`;
  }catch(e){
    const c = e && e.code;
    // si hace falta que hagas algo (permiso, reconectar…), se para la actualización automática
    if (["sin_mcp","server_not_connected","needs_reauth","selection_required","approval_required","not_in_manifest","blocked_by_policy","not_granted","capability_disabled"].includes(c)){ st.autoListo = false; guardar("autoListo", false); }
    const msg = {
      sin_mcp: "Esta vista no deja usar conectores. Abre la app desde Claude.",
      server_not_connected: "No encuentro el conector de Supabase de Solico. Añádelo en Claude: Ajustes → Conectores.",
      needs_reauth: "El conector de Supabase de Solico necesita volver a conectarse. En Claude: Ajustes → Conectores.",
      selection_required: "Claude te pide elegir qué conector de Supabase usar. Elige el de Solico y vuelve a pulsar.",
      approval_required: "Hace falta tu permiso. Pulsa otra vez «Actualizar» y acepta el aviso.",
      not_in_manifest: "Has rechazado el permiso para usar Supabase en esta app. Vuelve a pulsar y acéptalo.",
      blocked_by_policy: "Tu organización no permite usar este conector desde la app.",
      server_unavailable: "Supabase no responde ahora mismo. Prueba en un momento.",
      upstream_error: "Supabase no responde ahora mismo. Prueba en un momento.",
      tool_error: "Supabase no ha podido leer la web de resultados. Prueba en un momento.",
      http: `La web de resultados ha respondido con un error (${esc(e && e.status)}). Prueba en un momento.`,
      vacio: "La web de resultados no ha devuelto clasificaciones. Prueba en un momento."
    }[c] || "No he podido actualizar. Prueba otra vez o usa «Ver en directo».";
    st.estadoRes = `<span class="err">${msg}</span>`;
  }
  st.cargandoWeb = false;
  if (!(auto && enfocado())) render();
}
function tareaAuto(){
  if ((PUBLICA && !FUENTE_WEB) || st.subida || !st.autoOn || !st.autoListo || st.cargandoWeb) return;
  if (document.visibilityState && document.visibilityState !== "visible") return;
  if (Date.now() - (st.ultimaAuto || 0) < AUTO_MS - 5000) return;
  actualizarDesdeWeb(true);
}
const casillaAuto = () => (PUBLICA && !FUENTE_WEB) || st.subida ? "" : `<label class="small row" style="gap:6px;cursor:pointer"><input type="checkbox" id="autoRes" ${st.autoOn ? "checked" : ""}> Actualizar sola cada 2 minutos${st.autoOn && !st.autoListo ? " (empieza tras pulsar una vez el botón)" : ""}</label>`;
const botonActualizar = () => PUBLICA && !FUENTE_WEB ? "" : `<button class="btn primary" data-act="actualizarWeb" ${st.cargandoWeb?"disabled":""}>${st.cargandoWeb ? "Actualizando…" : "↻ Actualizar clasificaciones"}</button>`;

/* ---------- pintar y eventos ---------- */
function render(){
  const ev = evento();
  $("#titulo").textContent = ev.corto;
  $("#subtitulo").textContent = st.subida ? (ev.fechaTxt || "Orden de salida cargada") : "Campeonato de Castilla-La Mancha · Final Riders · " + EVENTO_HOY.fechaTxt;
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === st.tab)));
  const main = $("#main");
  main.innerHTML = st.tab === "salidas" ? vSalidas() : st.tab === "directo" ? vDirecto() : vClasif();
  main.classList.toggle("con-barra", !!main.querySelector(".stepbar"));
}
function irA(tab){ st.tab = tab; if (location.hash !== "#"+tab) history.replaceState(null, "", "#"+tab); render(); window.scrollTo(0,0); }
function elegir(key){ if (!key) return; if (st.sel !== key){ st.sel = key; st.mov = 0; guardar("sel", key); guardar("mov", 0); } irA("directo"); }

document.addEventListener("click", ev => {
  const b = ev.target.closest("button, [data-tab]"); if (!b) return;
  if (b.dataset.tab) return irA(b.dataset.tab);
  if (b.dataset.sel !== undefined) return elegir(b.dataset.sel);
  if (b.dataset.pista){ st.pista = b.dataset.pista; return render(); }
  if (b.dataset.vista){ st.vistaRes = b.dataset.vista; guardar("vistaRes", st.vistaRes); return render(); }
  if (b.dataset.mov !== undefined){ st.mov = +b.dataset.mov; guardar("mov", st.mov); return render(); }
  if (b.dataset.ahora){
    const e = enPista(salidas(), b.dataset.ahora), s = e.act || e.sig;
    if (s) elegir(s.key);
    return;
  }
  const act = b.dataset.act;
  if (act === "volverHoy"){ st.subida = null; guardar("subida", null); st.sel = null; st.estadoOS = ""; iniciarRes(); return render(); }
  if (act === "actualizarWeb") return actualizarDesdeWeb(false);
  if (act === "resetOffset"){ delete st.offset[b.dataset.pistareset]; guardar("offset", st.offset); return render(); }
  if (act === "borrarRes"){ guardar("res", {pruebas:[], hora:null}); iniciarRes(); st.estadoRes = ""; return render(); }
  if (act === "guardarEnlace"){ const v = $("#enlace").value.trim(); if (/^https?:\/\//.test(v)){ st.enlaceRes = v; guardar("enlaceRes", v); st.estadoRes = "Enlace guardado."; } else st.estadoRes = `<span class="err">El enlace tiene que empezar por https://</span>`; return render(); }
  if (act === "ordenarTexto"){ const t = $("#pegado").value.trim(); st.textoRes = t; if (!t){ st.estadoRes = `<span class="err">Pega primero el texto de la clasificación.</span>`; return render(); } return procesarRes(t); }
});
document.addEventListener("input", ev => {
  if (ev.target.id === "buscar"){ st.q = ev.target.value; const pos = ev.target.selectionStart; render(); const i = $("#buscar"); if (i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} } }
});
document.addEventListener("change", async ev => {
  if (ev.target.id === "catRes"){ st.catRes = ev.target.value; guardar("catRes", st.catRes); return render(); }
  if (ev.target.id === "autoRes"){ st.autoOn = ev.target.checked; guardar("autoOn", st.autoOn); if (st.autoOn) tareaAuto(); return render(); }
  if (ev.target.dataset && ev.target.dataset.pistasel !== undefined){
    const p = ev.target.dataset.pistasel, s = salidas().find(x => x.key === ev.target.value);
    if (s && s.m != null){ st.offset[p] = {min: Math.floor(ahoraMin() - s.m), bloque: s.bloque || 0}; guardar("offset", st.offset); }
    return render();
  }
  if (ev.target.id === "fileRes" && ev.target.files.length){
    const files = [...ev.target.files];
    st.estadoRes = "Leyendo el PDF…"; render();
    try{ let t = ""; for (const f of files) t += await textoPDF(f); await procesarRes(t); }
    catch(e){ st.estadoRes = `<span class="err">${esc(e.message)}</span>`; render(); }
  }
  if (ev.target.id === "fileOS" && ev.target.files.length){
    st.estadoOS = "Leyendo el PDF…"; render();
    try{
      const t = await textoPDF(ev.target.files[0]);
      st.estadoOS = "Claude está ordenando la orden de salida…"; render();
      const j = await pedirJSON(INSTR_OS, t);
      if (!j.salidas || !j.salidas.length) throw new Error("Claude no ha encontrado salidas en ese PDF.");
      st.subida = j; guardar("subida", j); st.sel = null; guardar("res", {pruebas:[], hora:null}); iniciarRes();
      st.estadoOS = `Cargadas ${j.salidas.length} salidas.`;
    }catch(e){ st.estadoOS = `<span class="err">${esc(e.message)}</span>`; }
    render();
  }
});
document.addEventListener("keydown", ev => {
  if (st.tab !== "directo" || /input|textarea/i.test(ev.target.tagName)) return;
  if (ev.key === "ArrowRight" || ev.key === "ArrowLeft"){
    const nb = document.querySelector(ev.key === "ArrowRight" ? '.stepbar [data-mov]:last-child' : '.stepbar [data-mov]:first-child');
    if (nb && !nb.disabled) nb.click();
  }
});
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (["salidas","directo","clasificaciones"].includes(t) && t !== st.tab){ st.tab = t; render(); } });
function tic(){ $("#reloj").textContent = horaTxt(); }
setInterval(() => { tic(); const a = document.activeElement; if (st.tab === "salidas" && a?.id !== "buscar" && a?.tagName !== "SELECT") render(); }, 30000);
setInterval(tareaAuto, 15000);
document.addEventListener("visibilitychange", tareaAuto);
(function inicio(){
  const t = location.hash.slice(1);
  if (["salidas","directo","clasificaciones"].includes(t)) st.tab = t;
  iniciarRes(); tic(); render();
  setTimeout(tareaAuto, 1500);
})();
