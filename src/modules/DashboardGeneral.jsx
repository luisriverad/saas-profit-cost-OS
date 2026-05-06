import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { VarianceBars } from '../components/Charts';
import {
  VARIATIONS, RATES_BY_CC, VENTA_REAL, PNL,
  PRODUCT_A_BOM, PRODUCT_A_ROUTING,
  PRODUCT_B_BOM, PRODUCT_B_ROUTING,
  PRODUCT_C_BOM, PRODUCT_C_ROUTING,
  PRODUCTION_SCHEDULE,
} from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtMoneySigned } from '../utils/format';

const PERIODS_LABELS = ['ENERO 2026', 'FEBRERO 2026', 'MARZO 2026', 'ABRIL 2026'];
const PERIODS_WITH_ACUM = [...PERIODS_LABELS, 'ACUMULADO'];
const ACUMULADO_IDX = 4;
const PR_STORAGE_KEY = 'prodReal.workspace.v2';
const ING_STORAGE_KEY = 'ingenieria.workspace.v2';
const VR_PERIOD_KEY = 'ventaReal.periodIdx';

const MP_COSTS = {
  1001: 100, 1002: 55, 1003: 20, 1004: 34, 1005: 15,
  1006: 67,  1007: 22, 1008: 35, 1009: 15, 1010: 10,
};
const MP_CODES = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];

const ING_BASE_PRODUCTS = [
  { code: 9001, name: 'PRODUCTO A', bom: PRODUCT_A_BOM, routing: PRODUCT_A_ROUTING },
  { code: 9002, name: 'PRODUCTO B', bom: PRODUCT_B_BOM, routing: PRODUCT_B_ROUTING },
  { code: 9003, name: 'PRODUCTO C', bom: PRODUCT_C_BOM, routing: PRODUCT_C_ROUTING },
];

const readJson = (key) => {
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

const readPeriodIdx = () => {
  try {
    const raw = window.localStorage.getItem(VR_PERIOD_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n >= PERIODS_LABELS.length) return 0;
    return n;
  } catch { return 0; }
};

function computeUnitCosts(product) {
  const totalMp = product.bom.reduce((s, r) => s + r.consumo * (MP_COSTS[r.code] ?? 0), 0);
  let mod = 0, gv = 0, gf = 0;
  product.routing.forEach((r, i) => {
    const cc = RATES_BY_CC[i] ?? RATES_BY_CC[RATES_BY_CC.length - 1];
    mod += (r.tiempo || 0) * (cc?.modRate ?? 0);
    gv  += (r.tiempo || 0) * (cc?.gvRate  ?? 0);
    gf  += (r.tiempo || 0) * (cc?.gfRate  ?? 0);
  });
  return { totalMp, mod, gv, gf };
}

// Default values mirroring ProdReal so the chart works even before user edits
const PR_FACTORS = [0.94, 0.98, 1.04, 0.99];
const PR_DEFAULT_REAL_MP_JAN = {
  1001: 7313250, 1002: 1896221.25, 1003: 383353.6, 1004: 5020372,
  1005: 636984.075, 1006: 895977.6, 1007: 144036.2, 1008: 1813686,
  1009: 966000, 1010: 679000,
};

function buildDefaultSnapshot(periodIdx, products, schedule) {
  const factor = PR_FACTORS[periodIdx] ?? 1;
  const kgs = {};
  products.forEach((p) => {
    const sched = schedule.find((s) => s.code === p.code);
    const fcts = sched?.months[periodIdx] ?? 0;
    kgs[p.code] = Math.round(fcts * factor);
  });
  const realMp = {};
  MP_CODES.forEach((code) => {
    realMp[code] = Math.round((PR_DEFAULT_REAL_MP_JAN[code] ?? 0) * factor);
  });
  return {
    kgs,
    realMp,
    realMod: Math.round(273000 * factor),
    realGv: Math.round(80500 * factor),
    realGf: Math.round(205000 * factor),
  };
}

function aggregateSnapshots(snapshots, products) {
  const out = { kgs: {}, realMp: {}, realMod: 0, realGv: 0, realGf: 0 };
  products.forEach((p) => { out.kgs[p.code] = 0; });
  MP_CODES.forEach((c) => { out.realMp[c] = 0; });
  snapshots.forEach((s) => {
    if (!s) return;
    products.forEach((p) => { out.kgs[p.code] += s.kgs?.[p.code] ?? 0; });
    MP_CODES.forEach((c) => { out.realMp[c] += s.realMp?.[c] ?? 0; });
    out.realMod += s.realMod ?? 0;
    out.realGv  += s.realGv  ?? 0;
    out.realGf  += s.realGf  ?? 0;
  });
  return out;
}

function getSnapshotForPeriod(periodIdx, products, schedule, accumulate = false) {
  const prStored = readJson(PR_STORAGE_KEY);
  const safeIdx = Math.max(0, Math.min(periodIdx, PERIODS_LABELS.length - 1));
  if (accumulate) {
    const snaps = [];
    for (let i = 0; i <= safeIdx; i++) {
      snaps.push(prStored?.matrix?.[i] ?? buildDefaultSnapshot(i, products, schedule));
    }
    return aggregateSnapshots(snaps, products);
  }
  return prStored?.matrix?.[safeIdx] ?? buildDefaultSnapshot(safeIdx, products, schedule);
}

const acumLabel = (periodIdx) => {
  const safe = Math.max(0, Math.min(periodIdx, PERIODS_LABELS.length - 1));
  if (safe === 0) return 'ENERO 2026';
  const last = PERIODS_LABELS[safe].split(' ')[0].slice(0, 3);
  return `ENE–${last} 2026`;
};

// Venta Real shift logic (mirrors VentaReal.jsx)
const VR_FACTORS = [
  [0.92, 0.975], [0.96, 0.99], [1.02, 1.005], [0.98, 1.015],
];

function shiftVentaSnapshot(periodIdx) {
  const base = VENTA_REAL;
  const [scaleK, scaleP] = VR_FACTORS[periodIdx] ?? [1, 1];
  const rows = base.rows.map((r) => {
    const kgs = Math.max(0, Math.round(r.kgs * scaleK));
    const precio = +(r.precio * scaleP).toFixed(4);
    const ventaBruta = +(kgs * precio).toFixed(2);
    const dRate = r.ventaBruta > 0 ? r.descuentos / r.ventaBruta : 0;
    const descuentos = +(ventaBruta * dRate).toFixed(2);
    const ventaNeta = +(ventaBruta - descuentos).toFixed(2);
    const fctsKgs = r.fctsKgs;
    const varKgs = kgs - fctsKgs;
    const fctsVentas = +(fctsKgs * r.precio).toFixed(2);
    const varVentas = +(ventaNeta - fctsVentas).toFixed(2);
    const xVolumen = +(varKgs * r.precio).toFixed(2);
    const xPrecio = +(varVentas - xVolumen).toFixed(2);
    return { code: r.code, name: r.name, ventaNeta, varVentas, xVolumen, xPrecio };
  });
  const totals = {
    ventaNeta: +rows.reduce((s, r) => s + r.ventaNeta, 0).toFixed(2),
  };
  return { period: PERIODS_LABELS[periodIdx], rows, totals };
}

function aggregateVentaRows(rowsList) {
  const map = new Map();
  rowsList.forEach((rows) => {
    rows.forEach((r) => {
      const cur = map.get(r.code) ?? { code: r.code, name: r.name, varVentas: 0, xVolumen: 0, xPrecio: 0 };
      cur.varVentas += r.varVentas;
      cur.xVolumen  += r.xVolumen;
      cur.xPrecio   += r.xPrecio;
      map.set(r.code, cur);
    });
  });
  return [...map.values()];
}

function computeVentaVariations(periodIdx, accumulate = false) {
  let snap;
  const safeIdx = Math.max(0, Math.min(periodIdx, PERIODS_LABELS.length - 1));
  if (accumulate) {
    const allSnaps = [];
    for (let i = 0; i <= safeIdx; i++) allSnaps.push(shiftVentaSnapshot(i));
    const rows = aggregateVentaRows(allSnaps.map((s) => s.rows));
    snap = { period: `ACUMULADO · ${acumLabel(safeIdx)}`, rows };
  } else {
    snap = shiftVentaSnapshot(safeIdx);
  }
  // Convention: VarianceBars uses negative=FAVORABLE / positive=DESFAVORABLE.
  // For sales, positive varVentas (sold MORE) is favorable, so we flip the sign.
  const items = snap.rows.map((r) => ({
    code: String(r.code),
    name: r.name,
    varT: -r.varVentas,
    rawVar: r.varVentas,
    xVolumen: r.xVolumen,
    xPrecio: r.xPrecio,
  }));
  return { period: snap.period, items };
}

const MP_NAMES = {
  1001: 'MATERIA PRIMA A', 1002: 'MATERIA PRIMA B', 1003: 'MATERIA PRIMA C',
  1004: 'MATERIA PRIMA D', 1005: 'MATERIA PRIMA E', 1006: 'MATERIA PRIMA F',
  1007: 'MATERIA PRIMA G', 1008: 'MATERIA PRIMA H', 1009: 'MATERIA PRIMA I',
  1010: 'MATERIA PRIMA J',
};
const MP_UM = {
  1001: 'KGS', 1002: 'KGS', 1003: 'KGS', 1004: 'KGS', 1005: 'KGS',
  1006: 'KGS', 1007: 'KGS', 1008: 'KGS', 1009: 'PZA', 1010: 'PZA',
};

function computeProdRealVariations(periodIdx, accumulate = false) {
  const ingStored = readJson(ING_STORAGE_KEY);
  const products = ingStored?.products ?? ING_BASE_PRODUCTS;
  const schedule = ingStored?.schedule ?? PRODUCTION_SCHEDULE;
  const period = accumulate
    ? `ACUMULADO · ${acumLabel(periodIdx)}`
    : (PERIODS_LABELS[periodIdx] ?? PERIODS_LABELS[0]);
  const snapshot = getSnapshotForPeriod(periodIdx, products, schedule, accumulate);

  // === MP DETAIL: per code ===
  const mpDetail = MP_CODES.map((code) => {
    const cost = MP_COSTS[code] ?? 0;
    let consumo = 0;
    products.forEach((p) => {
      const kgs = snapshot.kgs?.[p.code] ?? 0;
      const bomRow = p.bom.find((b) => b.code === code);
      if (bomRow) consumo += kgs * bomRow.consumo;
    });
    const std = consumo * cost;
    const real = snapshot.realMp?.[code] ?? 0;
    const varT = real - std;
    return { code, name: MP_NAMES[code], um: MP_UM[code], cost, consumo, std, real, varT };
  });
  const totalMpStd = mpDetail.reduce((s, r) => s + r.std, 0);
  const totalMpReal = mpDetail.reduce((s, r) => s + r.real, 0);
  const varMp = totalMpReal - totalMpStd;

  // === MOD/GV/GF DETAIL: per product ===
  const productCostDetail = products.map((p) => {
    const kgs = snapshot.kgs?.[p.code] ?? 0;
    const u = computeUnitCosts(p);
    return {
      code: p.code, name: p.name, kgs,
      modU: u.mod, gvU: u.gv, gfU: u.gf,
      modAbs: kgs * u.mod, gvAbs: kgs * u.gv, gfAbs: kgs * u.gf,
    };
  });
  const absMod = productCostDetail.reduce((s, r) => s + r.modAbs, 0);
  const absGv  = productCostDetail.reduce((s, r) => s + r.gvAbs, 0);
  const absGf  = productCostDetail.reduce((s, r) => s + r.gfAbs, 0);
  const realMod = snapshot.realMod ?? 0;
  const realGv  = snapshot.realGv  ?? 0;
  const realGf  = snapshot.realGf  ?? 0;
  const varMod = realMod - absMod;
  const varGv  = realGv  - absGv;
  const varGf  = realGf  - absGf;

  return {
    period,
    hasData: true,
    mpDetail, totalMpStd, totalMpReal, varMp,
    productCostDetail,
    absMod, realMod, varMod,
    absGv,  realGv,  varGv,
    absGf,  realGf,  varGf,
  };
}

// ===== ESTADO DE RESULTADOS =====
function computePeriodStatement(periodIdx, products, schedule) {
  const vrSnap = shiftVentaSnapshot(periodIdx);
  const prStored = readJson(PR_STORAGE_KEY);
  const prSnap = prStored?.matrix?.[periodIdx] ?? buildDefaultSnapshot(periodIdx, products, schedule);

  const ventas = vrSnap.totals.ventaNeta;
  const costoMp = MP_CODES.reduce((s, c) => s + (prSnap.realMp?.[c] ?? 0), 0);
  const costoMod = prSnap.realMod ?? 0;
  const costoGv = prSnap.realGv ?? 0;
  const costoGf = prSnap.realGf ?? 0;
  const costoTotal = costoMp + costoMod + costoGv + costoGf;
  const utBruta = ventas - costoTotal;
  const margenBruto = ventas > 0 ? utBruta / ventas : 0;
  const gtosOp = PNL.gtosOperacion[periodIdx] ?? 0;
  const utOp = utBruta - gtosOp;
  const margenOp = ventas > 0 ? utOp / ventas : 0;
  return { ventas, costoMp, costoMod, costoGv, costoGf, costoTotal, utBruta, margenBruto, gtosOp, utOp, margenOp };
}

function computeEstadoResultados(periodIdx) {
  const ingStored = readJson(ING_STORAGE_KEY);
  const products = ingStored?.products ?? ING_BASE_PRODUCTS;
  const schedule = ingStored?.schedule ?? PRODUCTION_SCHEDULE;

  const mes = computePeriodStatement(periodIdx, products, schedule);

  const acumKeys = ['ventas','costoMp','costoMod','costoGv','costoGf','costoTotal','utBruta','gtosOp','utOp'];
  const acum = Object.fromEntries(acumKeys.map((k) => [k, 0]));
  for (let i = 0; i <= periodIdx; i++) {
    const p = computePeriodStatement(i, products, schedule);
    acumKeys.forEach((k) => { acum[k] += p[k]; });
  }
  acum.margenBruto = acum.ventas > 0 ? acum.utBruta / acum.ventas : 0;
  acum.margenOp    = acum.ventas > 0 ? acum.utOp    / acum.ventas : 0;

  // === Costo estándar y variaciones de manufactura (mes y acumulado) ===
  const prMes  = computeProdRealVariations(periodIdx, false);
  const prAcum = computeProdRealVariations(periodIdx, true);

  const attachVariations = (target, src) => {
    target.costoMpStd = src.totalMpStd;
    target.absMod     = src.absMod;
    target.absGv      = src.absGv;
    target.absGf      = src.absGf;
    target.costoStd   = src.totalMpStd + src.absMod + src.absGv + src.absGf;
    target.varMp      = src.varMp;
    target.varMod     = src.varMod;
    target.varGv      = src.varGv;
    target.varGf      = src.varGf;
    target.varTotal   = src.varMp + src.varMod + src.varGv + src.varGf;
  };
  attachVariations(mes,  prMes);
  attachVariations(acum, prAcum);

  // Forecast YTD (suma desde Ene hasta el mes seleccionado)
  const fcst = { ventas: 0, costoTotal: 0, utBruta: 0, gtosOp: 0, utOp: 0 };
  for (let i = 0; i <= periodIdx; i++) {
    fcst.ventas     += PNL.ventas[i]        ?? 0;
    fcst.costoTotal += PNL.totalCosto[i]    ?? 0;
    fcst.utBruta    += PNL.utBruta[i]       ?? 0;
    fcst.gtosOp     += PNL.gtosOperacion[i] ?? 0;
    fcst.utOp       += PNL.utOperacion[i]   ?? 0;
  }
  fcst.margenBruto = fcst.ventas > 0 ? fcst.utBruta / fcst.ventas : 0;
  fcst.margenOp    = fcst.ventas > 0 ? fcst.utOp    / fcst.ventas : 0;

  // Forecast del mes seleccionado
  const fcstMes = {
    ventas:      PNL.ventas[periodIdx]        ?? 0,
    costoTotal:  PNL.totalCosto[periodIdx]    ?? 0,
    utBruta:     PNL.utBruta[periodIdx]       ?? 0,
    gtosOp:      PNL.gtosOperacion[periodIdx] ?? 0,
    utOp:        PNL.utOperacion[periodIdx]   ?? 0,
  };
  fcstMes.margenBruto = fcstMes.ventas > 0 ? fcstMes.utBruta / fcstMes.ventas : 0;
  fcstMes.margenOp    = fcstMes.ventas > 0 ? fcstMes.utOp    / fcstMes.ventas : 0;

  return { mes, acum, fcst, fcstMes };
}

// ===== ANÁLISIS FINANCIERO IA =====
// Genera interpretación estructurada examinando todas las fuentes de datos del dashboard.
// Determinístico (basado en reglas sobre datos reales). Reemplazable más adelante por
// una llamada a Claude vía backend sin tocar el resto del componente.
function generateFinancialAnalysis({ er, prVarMes, prVarAcum, ventaVarMes, ventaVarAcum, mesLabel, acumLabel: acumLbl }) {
  const { mes, acum, fcst, fcstMes } = er;
  const interpretation = [];
  const recommendations = [];
  const warnings = [];
  const actions = [];

  // ---- Ventas ----
  const ventasDeltaPct = fcst.ventas ? ((acum.ventas - fcst.ventas) / Math.abs(fcst.ventas)) * 100 : 0;
  const ventasDeltaMesPct = fcstMes.ventas ? ((mes.ventas - fcstMes.ventas) / Math.abs(fcstMes.ventas)) * 100 : 0;
  if (ventasDeltaPct < -3) {
    interpretation.push(`Ventas YTD ${ventasDeltaPct.toFixed(1)}% por debajo del forecast (${fmtMoneyM(acum.ventas)} vs ${fmtMoneyM(fcst.ventas)}).`);
    warnings.push(`Pérdida de tracción comercial sostenida — gap acumulado de ${fmtMoneyM(fcst.ventas - acum.ventas)}.`);
    actions.push('Revisar pipeline comercial, mix de clientes y disciplina de descuentos en los próximos 15 días.');
  } else if (ventasDeltaPct > 3) {
    interpretation.push(`Ventas YTD superan al forecast en ${ventasDeltaPct.toFixed(1)}% (${fmtMoneyM(acum.ventas)} vs ${fmtMoneyM(fcst.ventas)}).`);
    recommendations.push('Validar capacidad productiva y nivel de inventario para sostener el ritmo de venta.');
  } else {
    interpretation.push(`Ventas YTD en línea con el forecast (${ventasDeltaPct.toFixed(1)}% de desviación).`);
  }
  if (ventasDeltaMesPct < -5) {
    warnings.push(`Mes ${mesLabel}: ventas ${ventasDeltaMesPct.toFixed(1)}% bajo forecast — desviación mensual relevante.`);
  }

  // ---- Variaciones por producto en venta ----
  const prodNeg = ventaVarAcum.items.filter((i) => i.rawVar < 0).sort((a, b) => a.rawVar - b.rawVar);
  const prodPos = ventaVarAcum.items.filter((i) => i.rawVar > 0).sort((a, b) => b.rawVar - a.rawVar);
  if (prodNeg.length) {
    const peor = prodNeg[0];
    interpretation.push(`Producto con mayor caída de venta YTD: ${peor.name} con ${fmtMoneyMSigned(peor.rawVar)} (volumen ${fmtMoneyMSigned(peor.xVolumen)} · precio ${fmtMoneyMSigned(peor.xPrecio)}).`);
    if (Math.abs(peor.xVolumen) > Math.abs(peor.xPrecio)) {
      actions.push(`${peor.name}: el problema es VOLUMEN, no precio. Verificar disponibilidad, clientes perdidos o sustitución.`);
    } else {
      actions.push(`${peor.name}: el problema es PRECIO/MIX. Auditar lista de precios y nivel de descuentos aplicados.`);
    }
  }
  if (prodPos.length) {
    interpretation.push(`Producto con mejor desempeño: ${prodPos[0].name} aportando ${fmtMoneyMSigned(prodPos[0].rawVar)} sobre forecast.`);
  }

  // ---- Margen Bruto ----
  const margenDeltaPP = (acum.margenBruto - fcst.margenBruto) * 100;
  if (margenDeltaPP < -1) {
    interpretation.push(`Margen Bruto YTD se comprime ${margenDeltaPP.toFixed(1)} p.p. vs forecast (${fmtPct(acum.margenBruto)} vs ${fmtPct(fcst.margenBruto)}).`);
    warnings.push('Compresión de margen bruto fuera del rango natural — riesgo estructural si persiste.');
  } else if (margenDeltaPP > 1) {
    interpretation.push(`Margen Bruto YTD expande ${margenDeltaPP.toFixed(1)} p.p. vs forecast — mix u operación favorable.`);
  }

  // ---- Variaciones de Manufactura ----
  const varTotalAcum = prVarAcum.varMp + prVarAcum.varMod + prVarAcum.varGv + prVarAcum.varGf;
  const varTotalMes  = prVarMes.varMp  + prVarMes.varMod  + prVarMes.varGv  + prVarMes.varGf;
  const sign = (n) => n > 0 ? 'desfavorable' : n < 0 ? 'favorable' : 'sin variación';
  interpretation.push(`Variación neta de manufactura YTD: ${fmtMoneyMSigned(varTotalAcum)} (${sign(varTotalAcum)}). Mes ${mesLabel}: ${fmtMoneyMSigned(varTotalMes)} (${sign(varTotalMes)}).`);

  // MP
  if (prVarAcum.varMp > 200000) {
    warnings.push(`Variación desfavorable de Materia Prima YTD: ${fmtMoneyMSigned(prVarAcum.varMp)}. Consumo o precio fuera de estándar.`);
    const peoresMp = [...prVarAcum.mpDetail].sort((a, b) => b.varT - a.varT).slice(0, 2).filter((x) => x.varT > 0);
    if (peoresMp.length) {
      actions.push(`Auditar consumo y precio de compra de: ${peoresMp.map((m) => m.name).join(', ')}.`);
    }
  } else if (prVarAcum.varMp < -200000) {
    interpretation.push(`Variación favorable de MP YTD ${fmtMoneyMSigned(prVarAcum.varMp)} — eficiencia o mejora de precio.`);
    recommendations.push('Validar si el ahorro es estructural (compra) o circunstancial (mix), para actualizar el estándar.');
  }
  // MOD
  if (prVarAcum.varMod > 100000) {
    warnings.push(`Mano de Obra YTD desfavorable: ${fmtMoneyMSigned(prVarAcum.varMod)}. Posible baja eficiencia o sobre-tiempo.`);
    actions.push('Revisar productividad por centro de costo y horas extra de los últimos meses.');
  } else if (prVarAcum.varMod < -100000) {
    interpretation.push(`Eficiencia de MOD por encima del estándar (${fmtMoneyMSigned(prVarAcum.varMod)}).`);
  }
  // GV
  if (Math.abs(prVarAcum.varGv) > 80000) {
    interpretation.push(`Gastos Variables YTD ${sign(prVarAcum.varGv)}: ${fmtMoneyMSigned(prVarAcum.varGv)}.`);
  }
  // GF / Absorción
  if (prVarAcum.varGf > 150000) {
    warnings.push(`Sub-absorción de Gastos Fijos YTD: ${fmtMoneyMSigned(prVarAcum.varGf)} — volumen producido por debajo del que carga la cuota.`);
    actions.push('Revisar plan de producción vs capacidad cargada en cuotas. Decisión: ajustar cuota o recuperar volumen.');
  } else if (prVarAcum.varGf < -150000) {
    interpretation.push(`Sobre-absorción favorable de GF (${fmtMoneyMSigned(prVarAcum.varGf)}) — volumen real superior al que carga la cuota.`);
  }

  // ---- Utilidad Operativa ----
  const utOpDeltaPct = fcst.utOp ? ((acum.utOp - fcst.utOp) / Math.abs(fcst.utOp)) * 100 : 0;
  if (utOpDeltaPct < -10) {
    warnings.push(`Utilidad Operativa YTD ${utOpDeltaPct.toFixed(1)}% vs forecast (${fmtMoneyM(acum.utOp)} vs ${fmtMoneyM(fcst.utOp)}).`);
    interpretation.push('La presión a la utilidad operativa proviene principalmente de ' + (Math.abs(acum.ventas - fcst.ventas) > Math.abs(acum.costoTotal - fcst.costoTotal) ? 'menores ventas' : 'mayores costos') + '.');
  }

  // ---- Recomendaciones generales ----
  if (recommendations.length === 0 && warnings.length === 0) {
    recommendations.push('Resultados estables — mantener la disciplina operativa actual y monitorear desviaciones puntuales.');
  }
  if (Math.abs(varTotalAcum) > 500000) {
    recommendations.push('Convocar revisión mensual de variaciones con Producción, Compras y Costos para alinear estándares.');
  }
  if (acum.margenBruto < 0.20) {
    warnings.push(`Margen Bruto YTD bajo (${fmtPct(acum.margenBruto)}) — revisar estructura de costos vs precio de venta.`);
  }

  return { interpretation, recommendations, warnings, actions };
}

export default function DashboardGeneral() {
  const [varSide, setVarSide] = useState(null);
  const [mpClick, setMpClick] = useState(null);
  const [absClick, setAbsClick] = useState(null);
  const [ventaClick, setVentaClick] = useState(null);
  const [periodIdx, setPeriodIdx] = useState(readPeriodIdx);
  const [iaOpen, setIaOpen] = useState(false);

  const handleSelectMes = (e) => {
    const next = parseInt(e.target.value, 10);
    if (Number.isNaN(next)) return;
    setPeriodIdx(next);
    try { window.localStorage.setItem(VR_PERIOD_KEY, String(next)); } catch {}
  };

  const prVarMes = computeProdRealVariations(periodIdx, false);
  const prVarAcum = computeProdRealVariations(periodIdx, true);
  const ventaVarMes = computeVentaVariations(periodIdx, false);
  const ventaVarAcum = computeVentaVariations(periodIdx, true);
  const er = computeEstadoResultados(periodIdx);

  useEffect(() => {
    const anyOpen = varSide || mpClick || absClick || ventaClick || iaOpen;
    if (!anyOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setVarSide(null); setMpClick(null); setAbsClick(null); setVentaClick(null);
        setIaOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [varSide, mpClick, absClick, ventaClick, iaOpen]);

  return (
    <>
      <PageHeader
        title="DASHBOARD GENERAL"
        subtitle="Visión ejecutiva consolidada · El periodo aquí seleccionado guía todas las pestañas"
        actions={
          <label className="month-picker">
            <span className="month-picker-label">RESULTADO DEL MES</span>
            <select
              className="month-picker-select"
              value={periodIdx}
              onChange={handleSelectMes}
            >
              {PERIODS_LABELS.map((p, i) => (
                <option key={p} value={i}>{p}</option>
              ))}
            </select>
          </label>
        }
      />

      <EstadoResultadosPanel
        data={er}
        mesLabel={prVarMes.period}
        acumLabel={acumLabel(periodIdx)}
        ventaVarMesTotal={ventaVarMes.items.reduce((s, i) => s + i.rawVar, 0)}
        ventaVarAcumTotal={ventaVarAcum.items.reduce((s, i) => s + i.rawVar, 0)}
      />

      <Panel
        title="Variaciones de Materia Prima · YTD"
        meta="Real vs Estándar · efecto sobre costo"
      >
        <div style={{ padding: '6px 18px 14px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <VarianceBars data={VARIATIONS} width={760} onSelect={setVarSide} />
          </div>
          <div style={{
            marginTop: 10, paddingTop: 12,
            borderTop: '1px solid var(--line)',
            fontFamily: "'IBM Plex Serif'", fontSize: 12,
            color: 'var(--ink-soft)', fontStyle: 'italic',
          }}>
            <strong style={{
              color: 'var(--accent)', fontStyle: 'normal',
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
            }}>LECTURA</strong>
            &nbsp; MP-D compensa por –$557K, pero MP-A erosiona +$348K. Saldo neto favorable.
          </div>
        </div>
      </Panel>

      <VariationBox
        title={`Variación · Uso de Material · ${prVarMes.period}`}
        subtitle="Captura: $ Real (Vales) − $ Estándar consumido"
        contextRows={[
          { label: 'Mes · $ Estándar', value: `$${fmtMoneyNoDec(prVarMes.totalMpStd)}` },
          { label: 'Mes · $ Real',     value: `$${fmtMoneyNoDec(prVarMes.totalMpReal)}` },
          { label: 'Mes · Variación',  value: fmtMoneySigned(prVarMes.varMp), highlight: true, signed: true },
          { label: 'Acum · Variación', value: fmtMoneySigned(prVarAcum.varMp), highlight: true, signed: true },
        ]}
        mesLabel={prVarMes.period}
        acumLabel={acumLabel(periodIdx)}
        chartDataMes={prVarMes.mpDetail.map((r) => ({ code: String(r.code), name: r.name, varT: r.varT }))}
        onItemClickMes={(item) => setMpClick({ code: parseInt(item.code, 10), scope: 'mes' })}
        chartDataAcum={prVarAcum.mpDetail.map((r) => ({ code: String(r.code), name: r.name, varT: r.varT }))}
        onItemClickAcum={(item) => setMpClick({ code: parseInt(item.code, 10), scope: 'acum' })}
      />

      <VariationBox
        title={`Variación · Mano de Obra · ${prVarMes.period}`}
        subtitle="Real captura − Absorción (Σ KGS × $/U por producto)"
        contextRows={[
          { label: 'Mes · Absorción', value: `$${fmtMoney(prVarMes.absMod)}` },
          { label: 'Mes · Real',      value: `$${fmtMoney(prVarMes.realMod)}` },
          { label: 'Mes · Variación', value: fmtMoneySigned(prVarMes.varMod), highlight: true, signed: true },
          { label: 'Acum · Variación', value: fmtMoneySigned(prVarAcum.varMod), highlight: true, signed: true },
        ]}
        mesLabel={prVarMes.period}
        acumLabel={acumLabel(periodIdx)}
        chartDataMes={[{ code: 'MOD', name: 'MANO DE OBRA', varT: prVarMes.varMod }]}
        onItemClickMes={() => setAbsClick({ kind: 'MOD', scope: 'mes' })}
        chartDataAcum={[{ code: 'MOD', name: 'MANO DE OBRA', varT: prVarAcum.varMod }]}
        onItemClickAcum={() => setAbsClick({ kind: 'MOD', scope: 'acum' })}
      />

      <VariationBox
        title={`Variación · Gastos Variables · ${prVarMes.period}`}
        subtitle="Real captura − Absorción"
        contextRows={[
          { label: 'Mes · Absorción', value: `$${fmtMoney(prVarMes.absGv)}` },
          { label: 'Mes · Real',      value: `$${fmtMoney(prVarMes.realGv)}` },
          { label: 'Mes · Variación', value: fmtMoneySigned(prVarMes.varGv), highlight: true, signed: true },
          { label: 'Acum · Variación', value: fmtMoneySigned(prVarAcum.varGv), highlight: true, signed: true },
        ]}
        mesLabel={prVarMes.period}
        acumLabel={acumLabel(periodIdx)}
        chartDataMes={[{ code: 'GV', name: 'GASTOS VARIABLES', varT: prVarMes.varGv }]}
        onItemClickMes={() => setAbsClick({ kind: 'GV', scope: 'mes' })}
        chartDataAcum={[{ code: 'GV', name: 'GASTOS VARIABLES', varT: prVarAcum.varGv }]}
        onItemClickAcum={() => setAbsClick({ kind: 'GV', scope: 'acum' })}
      />

      <VariationBox
        title={`Variación · Gastos Fijos · ${prVarMes.period}`}
        subtitle="Real captura − Absorción"
        contextRows={[
          { label: 'Mes · Absorción', value: `$${fmtMoney(prVarMes.absGf)}` },
          { label: 'Mes · Real',      value: `$${fmtMoney(prVarMes.realGf)}` },
          { label: 'Mes · Variación', value: fmtMoneySigned(prVarMes.varGf), highlight: true, signed: true },
          { label: 'Acum · Variación', value: fmtMoneySigned(prVarAcum.varGf), highlight: true, signed: true },
        ]}
        mesLabel={prVarMes.period}
        acumLabel={acumLabel(periodIdx)}
        chartDataMes={[{ code: 'GF', name: 'GASTOS FIJOS', varT: prVarMes.varGf }]}
        onItemClickMes={() => setAbsClick({ kind: 'GF', scope: 'mes' })}
        chartDataAcum={[{ code: 'GF', name: 'GASTOS FIJOS', varT: prVarAcum.varGf }]}
        onItemClickAcum={() => setAbsClick({ kind: 'GF', scope: 'acum' })}
      />

      <VariationBox
        title={`Variaciones en la Venta · ${ventaVarMes.period}`}
        subtitle="Real vs Forecast · variación neta por producto (volumen + precio)"
        contextRows={ventaVarMes.items.map((m, i) => {
          const acum = ventaVarAcum.items[i];
          return {
            label: `${m.name.split(' ').slice(-1)[0]} · Mes`,
            value: fmtMoneySigned(m.rawVar),
            signed: true,
            sub: `Acum: ${fmtMoneySigned(acum?.rawVar ?? 0)}`,
          };
        })}
        mesLabel={ventaVarMes.period}
        acumLabel={acumLabel(periodIdx)}
        chartDataMes={ventaVarMes.items}
        onItemClickMes={(item) => setVentaClick({ code: parseInt(item.code, 10), scope: 'mes' })}
        chartDataAcum={ventaVarAcum.items}
        onItemClickAcum={(item) => setVentaClick({ code: parseInt(item.code, 10), scope: 'acum' })}
      />

      {varSide && <VariationModal side={varSide} onClose={() => setVarSide(null)} />}
      {mpClick && (() => {
        const data = mpClick.scope === 'acum' ? prVarAcum : prVarMes;
        return (
          <MpDetailModal
            item={data.mpDetail.find((m) => m.code === mpClick.code)}
            period={data.period}
            scope={mpClick.scope}
            onClose={() => setMpClick(null)}
          />
        );
      })()}
      {absClick && (() => {
        const data = absClick.scope === 'acum' ? prVarAcum : prVarMes;
        const k = absClick.kind;
        return (
          <AbsorptionDetailModal
            kind={k}
            period={data.period}
            scope={absClick.scope}
            products={data.productCostDetail}
            abs={k === 'MOD' ? data.absMod : k === 'GV' ? data.absGv : data.absGf}
            real={k === 'MOD' ? data.realMod : k === 'GV' ? data.realGv : data.realGf}
            vari={k === 'MOD' ? data.varMod : k === 'GV' ? data.varGv : data.varGf}
            onClose={() => setAbsClick(null)}
          />
        );
      })()}
      {ventaClick && (() => {
        const data = ventaClick.scope === 'acum' ? ventaVarAcum : ventaVarMes;
        return (
          <VentaDetailModal
            item={data.items.find((v) => parseInt(v.code, 10) === ventaClick.code)}
            period={data.period}
            scope={ventaClick.scope}
            onClose={() => setVentaClick(null)}
          />
        );
      })()}

      <FinancialAnalysisPanel onOpen={() => setIaOpen(true)} />

      {iaOpen && (
        <FinancialAnalysisModal
          analysis={generateFinancialAnalysis({
            er, prVarMes, prVarAcum, ventaVarMes, ventaVarAcum,
            mesLabel: prVarMes.period,
            acumLabel: acumLabel(periodIdx),
          })}
          mesLabel={prVarMes.period}
          acumLabel={acumLabel(periodIdx)}
          onClose={() => setIaOpen(false)}
        />
      )}
    </>
  );
}

function ChartLabel({ text, accent }) {
  return (
    <div style={{
      display: 'inline-block', padding: '3px 10px',
      background: accent ? '#0a0a0a' : 'var(--panel-alt)',
      color: accent ? '#fff' : 'var(--ink)',
      border: `1px solid ${accent ? '#0a0a0a' : 'var(--line)'}`,
      fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: '0.1em',
      fontWeight: 700, textTransform: 'uppercase',
      marginBottom: 6,
    }}>
      {text}
    </div>
  );
}

function colorFor(v) {
  if (v < 0) return 'var(--pos)';
  if (v > 0) return 'var(--neg)';
  return 'var(--ink)';
}

function VariationBox({
  title, subtitle, contextRows, mesLabel, acumLabel: acumLbl,
  chartDataMes, onItemClickMes,
  chartDataAcum, onItemClickAcum,
}) {
  // Detail rows (Estándar / Real / etc.) y totales (Variación) para el bloque "Cifras".
  const detailRows = (contextRows ?? []).filter((r) => !r.highlight);
  const totalRows  = (contextRows ?? []).filter((r) =>  r.highlight);
  const parseSigned = (s) => parseFloat(String(s).replace(/[^\d.\-−]/g, '').replace('−', '-')) || 0;

  return (
    <Panel title={title} meta={subtitle}>
      <div style={{
        padding: '14px 20px 18px',
        display: 'grid',
        gridTemplateColumns: '260px 1fr 1fr',
        gap: 18,
        alignItems: 'start',
      }}>
        {/* Cifras / contexto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: '0.1em',
            color: 'var(--ink-mute)', textTransform: 'uppercase',
          }}>Cifras</div>
          {detailRows.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              {detailRows.map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  fontFamily: "'IBM Plex Mono'", fontSize: 11,
                  padding: '3px 0',
                  color: 'var(--ink-soft)',
                }}>
                  <span>{row.label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* TOTALES — golpe visual de 1 segundo */}
          {totalRows.length > 0 && (
            <div style={{
              marginTop: 10,
              borderTop: '2px solid var(--ink)',
              paddingTop: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {totalRows.map((row, i) => {
                const num = parseSigned(row.value);
                const color = row.signed ? colorFor(num) : 'var(--ink)';
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                    padding: '6px 10px',
                    background: 'var(--panel-alt, #f6f3ea)',
                    border: '1px solid var(--line)',
                  }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono'", fontSize: 9,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--ink-mute)',
                      alignSelf: 'flex-start',
                    }}>
                      {row.label}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono'", fontVariantNumeric: 'tabular-nums',
                      fontSize: 26, fontWeight: 700, lineHeight: 1.1,
                      color,
                      marginTop: 2,
                    }}>
                      {row.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfica MES */}
        <div style={{ paddingRight: 10 }}>
          <ChartLabel text={`MES · ${mesLabel}`} accent={false} />
          <VarianceBars data={chartDataMes} width={520} onItemClick={onItemClickMes} />
          <div style={{
            marginTop: 6, fontFamily: "'IBM Plex Mono'", fontSize: 9,
            color: 'var(--ink-mute)', letterSpacing: '0.06em', textAlign: 'right',
          }}>
            ▸ CLICK EN BARRA — DESGLOSE DEL MES
          </div>
        </div>

        {/* Gráfica ACUMULADO — separada por línea sutil del bloque MES */}
        <div style={{
          borderLeft: '1px solid var(--line)',
          paddingLeft: 18,
        }}>
          <ChartLabel text={`ACUMULADO · ${acumLbl}`} accent />
          <VarianceBars data={chartDataAcum} width={520} onItemClick={onItemClickAcum} />
          <div style={{
            marginTop: 6, fontFamily: "'IBM Plex Mono'", fontSize: 9,
            color: 'var(--ink-mute)', letterSpacing: '0.06em', textAlign: 'right',
          }}>
            ▸ CLICK EN BARRA — DESGLOSE ACUMULADO
          </div>
        </div>
      </div>
    </Panel>
  );
}

// =============== ESTADO DE RESULTADOS PANEL ===============
function fmtMoneyM(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const abs = Math.abs(n);
  let body;
  if (abs >= 1_000_000) body = `$${(abs / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) body = `$${(abs / 1_000).toFixed(0)}K`;
  else body = `$${abs.toFixed(0)}`;
  return n < 0 ? `(${body})` : body;
}
function fmtMoneyMSigned(n) {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  let body;
  if (abs >= 1_000_000) body = `$${(abs / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) body = `$${(abs / 1_000).toFixed(0)}K`;
  else body = `$${abs.toFixed(0)}`;
  return n < 0 ? `−${body}` : `+${body}`;
}
function fmtPct(v) { return `${(v * 100).toFixed(1)}%`; }
function fmtPctPpDelta(real, fcst) {
  const d = (real - fcst) * 100;
  const sign = d >= 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(1)} p.p.`;
}
function deltaPct(real, fcst) {
  if (!fcst) return 0;
  return (real - fcst) / Math.abs(fcst);
}

function RowLabel({ text }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      color: 'var(--ink-mute)',
      borderTop: '1px solid var(--line)',
      paddingTop: 6,
    }}>{text}</div>
  );
}

function HeroCard({ label, value, sub, deltaText, positive, accent }) {
  const color = positive === true ? 'var(--pos)' : positive === false ? 'var(--neg)' : 'var(--ink-mute)';
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--line)',
      borderTop: `3px solid ${accent}`,
      padding: '14px 16px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
      minHeight: 110,
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: '0.12em',
        color: 'var(--ink-mute)', textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: "'IBM Plex Serif'", fontWeight: 700, fontSize: 30,
        color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.05,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: "'IBM Plex Mono'", fontSize: 10,
          color: 'var(--ink-soft)', letterSpacing: '0.04em',
        }}>{sub}</div>
      )}
      {deltaText && (
        <div style={{
          marginTop: 'auto',
          fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
          color, letterSpacing: '0.04em',
        }}>
          {positive === true ? '▲ ' : positive === false ? '▼ ' : '• '}
          {deltaText}
        </div>
      )}
    </div>
  );
}

function EstadoResultadosPanel({ data, mesLabel, acumLabel, ventaVarMesTotal = 0, ventaVarAcumTotal = 0 }) {
  const { mes, acum, fcst, fcstMes } = data;
  const ventasDelta = deltaPct(acum.ventas, fcst.ventas);
  const utBrutaDelta = deltaPct(acum.utBruta, fcst.utBruta);
  const utOpDelta = deltaPct(acum.utOp, fcst.utOp);
  const [desgloseExpanded, setDesgloseExpanded] = useState(false);

  const Row = ({ label, mesV, fcstMesV, acumV, fcstV, isCost, isSubtotal, isMargin, indent }) => {
    const wrapper = (v) => (isCost && typeof v === 'number') ? -Math.abs(v) : v;
    const dispMes = isMargin ? fmtPct(mesV) : fmtMoneyM(wrapper(mesV));
    const dispFcstMes = isMargin ? fmtPct(fcstMesV) : fmtMoneyM(wrapper(fcstMesV));
    const dispAcum = isMargin ? fmtPct(acumV) : fmtMoneyM(wrapper(acumV));
    const dispFcst = isMargin ? fmtPct(fcstV) : fmtMoneyM(wrapper(fcstV));

    const dPctMes = isMargin
      ? fmtPctPpDelta(mesV, fcstMesV)
      : (fcstMesV ? `${(deltaPct(mesV, fcstMesV) * 100).toFixed(1)}%` : '—');
    const dPctMesVal = isMargin ? (mesV - fcstMesV) : deltaPct(mesV, fcstMesV);
    const dColorMes = dPctMesVal > 0 ? (isCost ? 'var(--neg)' : 'var(--pos)')
                    : dPctMesVal < 0 ? (isCost ? 'var(--pos)' : 'var(--neg)')
                    : 'var(--ink-mute)';

    const dPct = isMargin
      ? fmtPctPpDelta(acumV, fcstV)
      : (fcstV ? `${(deltaPct(acumV, fcstV) * 100).toFixed(1)}%` : '—');
    const dPctVal = isMargin ? (acumV - fcstV) : deltaPct(acumV, fcstV);
    const dColor = dPctVal > 0 ? (isCost ? 'var(--neg)' : 'var(--pos)')
                  : dPctVal < 0 ? (isCost ? 'var(--pos)' : 'var(--neg)')
                  : 'var(--ink-mute)';

    const numCellBase = {
      padding: '10px 12px', textAlign: 'right',
      fontFamily: "'IBM Plex Mono'",
      fontVariantNumeric: 'tabular-nums',
    };
    const realCell = {
      ...numCellBase,
      fontSize: isSubtotal ? 14 : 12,
      fontWeight: isSubtotal ? 700 : 500,
      color: isMargin ? 'var(--gold)' : 'inherit',
    };
    const fcstCell = {
      ...numCellBase,
      fontSize: isSubtotal ? 13 : 11,
      fontWeight: 400,
      color: isSubtotal ? 'rgba(255,255,255,0.7)' : 'var(--ink-soft)',
      fontStyle: 'italic',
    };
    const deltaCell = (color) => ({
      ...numCellBase,
      fontSize: isSubtotal ? 13 : 11,
      fontWeight: 600,
      color: isSubtotal ? '#fff' : color,
    });
    const acumDivider = { borderLeft: '1px solid var(--line)' };

    return (
      <tr style={{
        background: isSubtotal ? '#0a0a0a' : isMargin ? '#fffae8' : 'transparent',
        color: isSubtotal ? '#fff' : 'var(--ink)',
        borderTop: isSubtotal ? '2px solid var(--ink)' : 'none',
        borderBottom: isSubtotal ? '2px solid var(--ink)' : '1px solid var(--line-soft)',
      }}>
        <td style={{
          padding: '10px 14px',
          paddingLeft: indent ? 32 : 14,
          fontFamily: isSubtotal ? "'IBM Plex Serif'" : "'IBM Plex Sans', sans-serif",
          fontSize: isSubtotal ? 14 : isMargin ? 11 : 12,
          fontWeight: isSubtotal ? 700 : isMargin ? 500 : 400,
          fontStyle: isMargin ? 'italic' : 'normal',
          letterSpacing: isSubtotal ? '0' : 'normal',
          textTransform: isSubtotal ? 'uppercase' : 'none',
          color: isMargin ? 'var(--gold)' : 'inherit',
        }}>
          {label}
        </td>
        <td style={realCell}>{dispMes}</td>
        <td style={fcstCell}>{dispFcstMes}</td>
        <td style={deltaCell(dColorMes)}>{dPctMes}</td>
        <td style={{ ...realCell, ...acumDivider }}>{dispAcum}</td>
        <td style={fcstCell}>{dispFcst}</td>
        <td style={deltaCell(dColor)}>{dPct}</td>
      </tr>
    );
  };

  // Fila para variaciones de manufactura (Real − Estándar). Convención:
  //   negativo = favorable (verde) · positivo = desfavorable (rojo).
  // Forecast no tiene variaciones (se asume al estándar) → muestra "—".
  // main=true: fila principal del P&L (bold, color de acento, botón toggle de desglose).
  // breakdownMes/breakdownAcum: array de { label, value, goodIfNegative }. Se muestran sólo cuando expanded=true.
  const VariationRow = ({ label, mesV, acumV, main, breakdownMes, breakdownAcum, expanded, onToggle }) => {
    const colorMes  = mesV  < 0 ? 'var(--pos)' : mesV  > 0 ? 'var(--neg)' : 'var(--ink-mute)';
    const colorAcum = acumV < 0 ? 'var(--pos)' : acumV > 0 ? 'var(--neg)' : 'var(--ink-mute)';
    const dispMes   = mesV  === 0 ? '$0' : fmtMoneyMSigned(mesV);
    const dispAcum  = acumV === 0 ? '$0' : fmtMoneyMSigned(acumV);
    const numCell = {
      padding: main ? '12px 12px' : '8px 12px',
      textAlign: 'right',
      fontFamily: "'IBM Plex Mono'", fontVariantNumeric: 'tabular-nums',
      fontSize: main ? 14 : 11,
      fontWeight: main ? 700 : 600,
    };
    const muteCell = {
      ...numCell,
      fontWeight: main ? 600 : 400,
      fontStyle: main ? 'normal' : 'italic',
      color: 'var(--ink-mute)',
    };

    const renderList = (items) => (
      <div style={{
        display: 'flex', flexDirection: 'column',
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 11,
        color: 'var(--ink-soft)',
      }}>
        {items.map((c) => {
          const goodIfNegative = c.goodIfNegative !== false;
          const fav   = goodIfNegative ? c.value < 0 : c.value > 0;
          const unfav = goodIfNegative ? c.value > 0 : c.value < 0;
          const color = fav ? 'var(--pos)' : unfav ? 'var(--neg)' : 'var(--ink-mute)';
          const disp = c.value === 0 ? '$0' : fmtMoneyMSigned(c.value);
          return (
            <div key={c.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '3px 0',
              borderBottom: '1px dotted var(--line-soft)',
            }}>
              <span>{c.label}</span>
              <span style={{
                fontFamily: "'IBM Plex Mono'", fontVariantNumeric: 'tabular-nums',
                color, fontWeight: 600,
              }}>{disp}</span>
            </div>
          );
        })}
      </div>
    );

    const hasBreakdown = main && breakdownMes && breakdownAcum;
    const showDesglose = hasBreakdown && expanded;

    return (
      <>
        <tr style={{
          background: main ? '#fff7e0' : '#fafafa',
          borderTop: main ? '1px solid var(--gold)' : 'none',
          borderBottom: main && !showDesglose ? '1px solid var(--gold)' : '1px solid var(--line-soft)',
        }}>
          <td style={{
            padding: main ? '12px 14px 10px' : '8px 14px',
            paddingLeft: main ? 14 : 32,
            fontFamily: main ? "'IBM Plex Serif'" : "'IBM Plex Sans', sans-serif",
            fontSize: main ? 13 : 11,
            fontStyle: main ? 'normal' : 'italic',
            fontWeight: main ? 700 : 'inherit',
            color: main ? 'var(--accent-3)' : 'var(--ink-soft)',
            letterSpacing: main ? '0.01em' : 'normal',
          }}>
            <div>{label}</div>
            {hasBreakdown && (
              <button
                type="button"
                onClick={onToggle}
                style={{
                  marginTop: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono'",
                  fontSize: 9, letterSpacing: '0.12em',
                  color: 'var(--ink-mute)',
                  textTransform: 'uppercase',
                  padding: 0,
                  display: 'block',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
              >
                {expanded ? '▾ Ocultar desglose' : '▸ Click para ver desglose'}
              </button>
            )}
          </td>
          <td style={{ ...numCell, color: colorMes }}>{dispMes}</td>
          <td style={muteCell}>—</td>
          <td style={muteCell}>—</td>
          <td style={{ ...numCell, color: colorAcum, borderLeft: '1px solid var(--line)' }}>{dispAcum}</td>
          <td style={muteCell}>—</td>
          <td style={muteCell}>—</td>
        </tr>
        {showDesglose && (
          <tr style={{
            background: '#fffbe8',
            borderBottom: '1px solid var(--gold)',
          }}>
            <td style={{
              padding: '10px 14px 12px',
              verticalAlign: 'top',
              fontFamily: "'IBM Plex Mono'",
              fontSize: 9, letterSpacing: '0.10em',
              color: 'var(--ink-mute)',
              textTransform: 'uppercase',
            }}>
              ↳ desglose
            </td>
            <td colSpan={3} style={{ padding: '10px 14px 12px', verticalAlign: 'top' }}>
              {renderList(breakdownMes)}
            </td>
            <td colSpan={3} style={{
              padding: '10px 14px 12px', verticalAlign: 'top',
              borderLeft: '1px solid var(--line)',
            }}>
              {renderList(breakdownAcum)}
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div style={{ maxWidth: 1080, margin: '24px auto', padding: '0 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12,
        marginBottom: 4, paddingBottom: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <h3 style={{
          margin: 0,
          fontFamily: "'IBM Plex Serif'", fontSize: 20, fontWeight: 600,
        }}>Estado de Resultados</h3>
        <span style={{
          padding: '2px 8px',
          background: '#0a0a0a', color: 'var(--gold)',
          fontFamily: "'IBM Plex Mono'", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.14em',
        }}>EXECUTIVE</span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: "'IBM Plex Mono'", fontSize: 10,
          color: 'var(--ink-mute)', letterSpacing: '0.08em',
        }}>{mesLabel} · Acumulado {acumLabel} · vs Forecast</span>
      </div>
      <div style={{ paddingTop: 18 }}>

        {/* HERO KPIs · MES (arriba) y YTD (abajo) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          <RowLabel text={`MES · ${mesLabel}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <HeroCard
              label="Ventas"
              value={fmtMoneyM(mes.ventas)}
              sub={`Forecast: ${fmtMoneyM(fcstMes.ventas)}`}
              deltaText={`${(deltaPct(mes.ventas, fcstMes.ventas) * 100).toFixed(1)}% vs FCST`}
              positive={mes.ventas >= fcstMes.ventas}
              accent="var(--accent-3)"
            />
            <HeroCard
              label="Costo de Ventas"
              value={fmtMoneyM(mes.costoTotal)}
              sub={`MP ${fmtMoneyM(mes.costoMp)} · Conv ${fmtMoneyM(mes.costoMod + mes.costoGv + mes.costoGf)}`}
              deltaText={`${(deltaPct(mes.costoTotal, fcstMes.costoTotal) * 100).toFixed(1)}% vs FCST`}
              positive={mes.costoTotal <= fcstMes.costoTotal}
              accent="var(--accent-2)"
            />
            <HeroCard
              label="Utilidad Bruta"
              value={fmtMoneyM(mes.utBruta)}
              sub={`Margen ${fmtPct(mes.margenBruto)} · FCST ${fmtMoneyM(fcstMes.utBruta)}`}
              deltaText={`${fmtPctPpDelta(mes.margenBruto, fcstMes.margenBruto)} vs FCST`}
              positive={mes.margenBruto >= fcstMes.margenBruto}
              accent="var(--gold)"
            />
            <HeroCard
              label="Utilidad Operativa"
              value={fmtMoneyM(mes.utOp)}
              sub={`Margen ${fmtPct(mes.margenOp)} · FCST ${fmtMoneyM(fcstMes.utOp)}`}
              deltaText={`${(deltaPct(mes.utOp, fcstMes.utOp) * 100).toFixed(1)}% vs FCST`}
              positive={mes.utOp >= fcstMes.utOp}
              accent="var(--accent)"
            />
          </div>

          <RowLabel text={`ACUMULADO YTD · ${acumLabel}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <HeroCard
              label="Ventas"
              value={fmtMoneyM(acum.ventas)}
              sub={`Forecast: ${fmtMoneyM(fcst.ventas)}`}
              deltaText={`${(ventasDelta * 100).toFixed(1)}% vs FCST`}
              positive={ventasDelta >= 0}
              accent="var(--accent-3)"
            />
            <HeroCard
              label="Costo de Ventas"
              value={fmtMoneyM(acum.costoTotal)}
              sub={`MP ${fmtMoneyM(acum.costoMp)} · Conv ${fmtMoneyM(acum.costoMod + acum.costoGv + acum.costoGf)}`}
              deltaText={`${(deltaPct(acum.costoTotal, fcst.costoTotal) * 100).toFixed(1)}% vs FCST`}
              positive={acum.costoTotal <= fcst.costoTotal}
              accent="var(--accent-2)"
            />
            <HeroCard
              label="Utilidad Bruta"
              value={fmtMoneyM(acum.utBruta)}
              sub={`Margen ${fmtPct(acum.margenBruto)} · FCST ${fmtMoneyM(fcst.utBruta)}`}
              deltaText={`${fmtPctPpDelta(acum.margenBruto, fcst.margenBruto)} vs FCST`}
              positive={acum.margenBruto >= fcst.margenBruto}
              accent="var(--gold)"
            />
            <HeroCard
              label="Utilidad Operativa"
              value={fmtMoneyM(acum.utOp)}
              sub={`Margen ${fmtPct(acum.margenOp)} · FCST ${fmtMoneyM(fcst.utOp)}`}
              deltaText={`${(utOpDelta * 100).toFixed(1)}% vs FCST`}
              positive={utOpDelta >= 0}
              accent="var(--accent)"
            />
          </div>
        </div>

        {/* P&L TABLE */}
        <div>
          <div style={{
            background: '#0a0a0a', color: '#fff',
            padding: '10px 14px',
            fontFamily: "'IBM Plex Mono'", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>P&amp;L · Real vs Forecast</span>
            <span style={{ color: 'var(--gold)' }}>Cifras en MXN</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
            <colgroup>
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--panel-alt)' }}>
                <th style={{ textAlign: 'left',  padding: '10px 14px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>Concepto</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>{mesLabel}</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>FCST MES</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>Δ MES</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)' }}>ACUM YTD</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>FCST YTD</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)', borderBottom: '1px solid var(--line)' }}>Δ YTD</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Ventas Netas" mesV={mes.ventas} fcstMesV={fcstMes.ventas} acumV={acum.ventas} fcstV={fcst.ventas} />
              <Row label="(−) Costo de Ventas Estándar" mesV={mes.costoStd} fcstMesV={fcstMes.costoTotal} acumV={acum.costoStd} fcstV={fcst.costoTotal} isCost />
              <VariationRow
                label="(+/−) Variaciones"
                mesV={mes.varTotal}
                acumV={acum.varTotal}
                main
                expanded={desgloseExpanded}
                onToggle={() => setDesgloseExpanded((v) => !v)}
                breakdownMes={[
                  { label: 'Var. Precio Materia Prima', value: mes.varMp },
                  { label: 'Var. Uso de Material',  value: mes.varMp },
                  { label: 'Var. MOD',              value: mes.varMod },
                  { label: 'Var. Gto. Variable',    value: mes.varGv },
                  { label: 'Var. Gto. Fijo',        value: mes.varGf },
                  { label: 'Var. en la Vta.',       value: ventaVarMesTotal, goodIfNegative: false },
                ]}
                breakdownAcum={[
                  { label: 'Var. Materia Prima',    value: acum.varMp },
                  { label: 'Var. Uso de Material',  value: acum.varMp },
                  { label: 'Var. MOD',              value: acum.varMod },
                  { label: 'Var. Gto. Variable',    value: acum.varGv },
                  { label: 'Var. Gto. Fijo',        value: acum.varGf },
                  { label: 'Var. en la Vta.',       value: ventaVarAcumTotal, goodIfNegative: false },
                ]}
              />
              <Row label="(=) Total Costo de Ventas" mesV={mes.costoTotal} fcstMesV={fcstMes.costoTotal} acumV={acum.costoTotal} fcstV={fcst.costoTotal} isCost isSubtotal />
              <Row label="═ Utilidad Bruta" mesV={mes.utBruta} fcstMesV={fcstMes.utBruta} acumV={acum.utBruta} fcstV={fcst.utBruta} isSubtotal />
              <Row label="Margen Bruto" mesV={mes.margenBruto} fcstMesV={fcstMes.margenBruto} acumV={acum.margenBruto} fcstV={fcst.margenBruto} isMargin indent />
              <Row label="(−) Gastos de Operación" mesV={mes.gtosOp} fcstMesV={fcstMes.gtosOp} acumV={acum.gtosOp} fcstV={fcst.gtosOp} isCost />
              <Row label="═ Utilidad Operativa" mesV={mes.utOp} fcstMesV={fcstMes.utOp} acumV={acum.utOp} fcstV={fcst.utOp} isSubtotal />
              <Row label="Margen Operativo" mesV={mes.margenOp} fcstMesV={fcstMes.margenOp} acumV={acum.margenOp} fcstV={fcst.margenOp} isMargin indent />
            </tbody>
          </table>
        </div>

        {/* FOOTER NOTE */}
        <div style={{
          marginTop: 14,
          fontFamily: "'IBM Plex Serif'", fontSize: 12,
          color: 'var(--ink-soft)', fontStyle: 'italic',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>
            <strong style={{
              color: 'var(--accent)', fontStyle: 'normal',
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
            }}>NOTA</strong>
            &nbsp; Real toma Ventas Netas (Venta Real) y Costo Total (Prod Real). Forecast desde el P&amp;L Forecast.
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.08em' }}>
            UPDATED · {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

function MpDetailModal({ item, period, scope, onClose }) {
  if (!item) return null;
  const consumoDisplay = item.um === 'PZA' ? `${fmtMoneyNoDec(item.consumo)} PZA` : `${fmtMoneyNoDec(item.consumo)} KGS`;
  const scopeLabel = scope === 'acum' ? 'ACUMULADO ENE–ABR 2026' : period;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(680px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3>Detalle · {item.name}</h3>
            <span className="modal-tag" style={{ background: scope === 'acum' ? '#0a0a0a' : 'var(--panel-alt)', color: scope === 'acum' ? '#fff' : 'var(--ink)' }}>
              {scope === 'acum' ? 'ACUMULADO' : 'MES'}
            </span>
            <span className={`modal-tag ${item.varT < 0 ? 'favorable' : item.varT > 0 ? 'desfavorable' : ''}`}>
              {item.varT < 0 ? 'Favorable' : item.varT > 0 ? 'Desfavorable' : 'Sin variación'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.06em',
            color: 'var(--ink-mute)', marginBottom: 10,
          }}>
            CÓDIGO {item.code} · UM {item.um} · PERIODO {scopeLabel}
          </div>
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Consumo total (Σ KGS producidos × consumo/U del BOM)</td>
                <td style={{ textAlign: 'right' }}>{consumoDisplay}</td>
              </tr>
              <tr>
                <td>Costo unitario (maestro Compras)</td>
                <td style={{ textAlign: 'right' }}>${fmtMoney(item.cost)}</td>
              </tr>
              <tr>
                <td>$ Estándar (consumo × costo)</td>
                <td style={{ textAlign: 'right' }}>${fmtMoneyNoDec(item.std)}</td>
              </tr>
              <tr>
                <td>$ Real (vales / inventario)</td>
                <td style={{ textAlign: 'right' }}>${fmtMoneyNoDec(item.real)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td>Variación = Real − Estándar</td>
                <td style={{ textAlign: 'right', color: item.varT < 0 ? 'var(--pos)' : item.varT > 0 ? 'var(--neg)' : 'var(--ink)' }}>
                  {fmtMoneySigned(item.varT)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AbsorptionDetailModal({ kind, period, scope, products, abs, real, vari, onClose }) {
  const labelMap = { MOD: 'Mano de Obra', GV: 'Gastos Variables', GF: 'Gastos Fijos' };
  const fieldMap = { MOD: { u: 'modU', a: 'modAbs' }, GV: { u: 'gvU', a: 'gvAbs' }, GF: { u: 'gfU', a: 'gfAbs' } };
  const f = fieldMap[kind];
  const totalKgs = products.reduce((s, p) => s + p.kgs, 0);
  const scopeLabel = scope === 'acum' ? 'ACUMULADO ENE–ABR 2026' : period;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3>Detalle · {labelMap[kind]}</h3>
            <span className="modal-tag" style={{ background: scope === 'acum' ? '#0a0a0a' : 'var(--panel-alt)', color: scope === 'acum' ? '#fff' : 'var(--ink)' }}>
              {scope === 'acum' ? 'ACUMULADO' : 'MES'}
            </span>
            <span className={`modal-tag ${vari < 0 ? 'favorable' : vari > 0 ? 'desfavorable' : ''}`}>
              {vari < 0 ? 'Favorable' : vari > 0 ? 'Desfavorable' : 'Sin variación'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.06em',
            color: 'var(--ink-mute)', marginBottom: 10,
          }}>
            ABSORCIÓN POR PRODUCTO · PERIODO {scopeLabel}
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ textAlign: 'right' }}>KGS</th>
                <th style={{ textAlign: 'right' }}>$ / U</th>
                <th style={{ textAlign: 'right' }}>Absorción</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.code}>
                  <td>{p.name}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoneyNoDec(p.kgs)}</td>
                  <td style={{ textAlign: 'right' }}>${fmtMoney(p[f.u], 4)}</td>
                  <td style={{ textAlign: 'right' }}>${fmtMoney(p[f.a])}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--ink)' }}>
                <td>TOTAL ABSORCIÓN</td>
                <td style={{ textAlign: 'right' }}>{fmtMoneyNoDec(totalKgs)}</td>
                <td></td>
                <td style={{ textAlign: 'right' }}>${fmtMoney(abs)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={3}>$ REAL CAPTURADO</td>
                <td style={{ textAlign: 'right' }}>${fmtMoney(real)}</td>
              </tr>
              <tr style={{ fontWeight: 700, background: 'var(--panel-alt)' }}>
                <td colSpan={3}>VARIACIÓN = Real − Absorción</td>
                <td style={{ textAlign: 'right', color: vari < 0 ? 'var(--pos)' : vari > 0 ? 'var(--neg)' : 'var(--ink)' }}>
                  {fmtMoneySigned(vari)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{
            marginTop: 14, fontFamily: "'IBM Plex Serif'", fontSize: 12,
            color: 'var(--ink-soft)', fontStyle: 'italic',
          }}>
            La absorción se distribuye por producto según los KGS reales producidos × $/U calculado del routing y
            cuotas por CC. El real se captura en la pestaña Prod Real como total de la planta.
          </p>
        </div>
      </div>
    </div>
  );
}

function VentaDetailModal({ item, period, scope, onClose }) {
  if (!item) return null;
  const scopeLabel = scope === 'acum' ? 'ACUMULADO ENE–ABR 2026' : period;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(680px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3>Detalle · {item.name}</h3>
            <span className="modal-tag" style={{ background: scope === 'acum' ? '#0a0a0a' : 'var(--panel-alt)', color: scope === 'acum' ? '#fff' : 'var(--ink)' }}>
              {scope === 'acum' ? 'ACUMULADO' : 'MES'}
            </span>
            <span className={`modal-tag ${item.rawVar > 0 ? 'favorable' : item.rawVar < 0 ? 'desfavorable' : ''}`}>
              {item.rawVar > 0 ? 'Favorable' : item.rawVar < 0 ? 'Desfavorable' : 'Sin variación'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.06em',
            color: 'var(--ink-mute)', marginBottom: 10,
          }}>
            CÓDIGO {item.code} · PERIODO {scopeLabel}
          </div>
          <table>
            <thead>
              <tr>
                <th>Componente</th>
                <th style={{ textAlign: 'right' }}>Impacto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Variación por VOLUMEN (KGS reales − Forecast) × precio std</td>
                <td style={{ textAlign: 'right', color: item.xVolumen > 0 ? 'var(--pos)' : item.xVolumen < 0 ? 'var(--neg)' : 'var(--ink)' }}>
                  {fmtMoneySigned(item.xVolumen)}
                </td>
              </tr>
              <tr>
                <td>Variación por PRECIO (mix + descuentos)</td>
                <td style={{ textAlign: 'right', color: item.xPrecio > 0 ? 'var(--pos)' : item.xPrecio < 0 ? 'var(--neg)' : 'var(--ink)' }}>
                  {fmtMoneySigned(item.xPrecio)}
                </td>
              </tr>
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--ink)' }}>
                <td>VARIACIÓN NETA DE VENTA</td>
                <td style={{ textAlign: 'right', color: item.rawVar > 0 ? 'var(--pos)' : item.rawVar < 0 ? 'var(--neg)' : 'var(--ink)' }}>
                  {fmtMoneySigned(item.rawVar)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{
            marginTop: 14, fontFamily: "'IBM Plex Serif'", fontSize: 12,
            color: 'var(--ink-soft)', fontStyle: 'italic',
          }}>
            Convención: variación positiva (venta real superior al forecast) = favorable.
            La descomposición separa el impacto puro de volumen del impacto de precio/descuentos.
          </p>
        </div>
      </div>
    </div>
  );
}

function VariationModal({ side, onClose }) {
  const isFav = side === 'favorable';
  const rows = VARIATIONS.filter((d) => isFav ? d.varT < 0 : d.varT > 0);
  const totalVar = rows.reduce((s, r) => s + r.varT, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3>Variaciones de Materia Prima</h3>
            <span className={`modal-tag ${isFav ? 'favorable' : 'desfavorable'}`}>
              {isFav ? 'Favorables' : 'Desfavorables'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          {rows.length === 0 ? (
            <p style={{ color: 'var(--ink-mute)', textAlign: 'center', padding: '20px 0' }}>
              No hay materias primas con variación {isFav ? 'favorable' : 'desfavorable'}.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cód.</th>
                  <th>Materia Prima</th>
                  <th>Consumo</th>
                  <th>Costo Std.</th>
                  <th>Costo Real</th>
                  <th>Var / U</th>
                  <th>Var. Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const stdU = r.std / r.consumo;
                  const realU = r.real / r.consumo;
                  const cls = r.varT < 0 ? 'var-pos' : 'var-neg';
                  return (
                    <tr key={r.code}>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{fmtMoneyNoDec(r.consumo)}</td>
                      <td>${fmtMoney(stdU)}</td>
                      <td>${fmtMoney(realU)}</td>
                      <td className={cls}>{fmtMoneySigned(r.varU)}</td>
                      <td className={cls}>${fmtMoneySigned(r.varT)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>TOTAL {isFav ? 'FAVORABLE' : 'DESFAVORABLE'}</td>
                  <td className={totalVar < 0 ? 'var-pos' : 'var-neg'}>
                    ${fmtMoneySigned(totalVar)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== ANÁLISIS FINANCIERO · Panel + Modal =====
function FinancialAnalysisPanel({ onOpen }) {
  return (
    <div style={{
      maxWidth: 1080, margin: '32px auto 24px', padding: '0 16px',
    }}>
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        color: '#fff',
        border: '1px solid #0a0a0a',
        padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 420px' }}>
          <div style={{
            display: 'inline-block',
            padding: '3px 10px',
            background: 'var(--gold)', color: '#0a0a0a',
            fontFamily: "'IBM Plex Mono'", fontSize: 9, fontWeight: 700,
            letterSpacing: '0.14em', marginBottom: 10,
          }}>POWERED BY IA</div>
          <h3 style={{
            margin: 0, fontFamily: "'IBM Plex Serif'",
            fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em',
          }}>Análisis Financiero Inteligente</h3>
          <p style={{
            margin: '8px 0 0', fontFamily: "'IBM Plex Serif'",
            fontSize: 13, color: 'rgba(255,255,255,0.75)',
            fontStyle: 'italic', lineHeight: 1.5,
          }}>
            Interpreta toda la información de Ventas, Producción, Costos, Compras, Forecast y Variaciones.
            Genera lectura ejecutiva, recomendaciones, alertas y acciones priorizadas.
          </p>
        </div>
        <button
          onClick={onOpen}
          style={{
            background: 'var(--gold)', color: '#0a0a0a',
            border: 'none', padding: '14px 28px',
            fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          ▸ Análisis Financiero
        </button>
      </div>
    </div>
  );
}

function FinancialAnalysisModal({ analysis, mesLabel, acumLabel, onClose }) {
  const { interpretation, recommendations, warnings, actions } = analysis;
  const Section = ({ tag, title, accent, items, emptyText, icon }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, background: accent, color: '#0a0a0a',
          fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 700,
        }}>{icon}</span>
        <span style={{
          fontFamily: "'IBM Plex Mono'", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.16em', color: 'var(--ink-mute)',
        }}>{tag}</span>
        <h4 style={{
          margin: 0, fontFamily: "'IBM Plex Serif'", fontSize: 16, fontWeight: 600,
        }}>{title}</h4>
      </div>
      {items.length === 0 ? (
        <p style={{
          margin: 0, paddingLeft: 34,
          fontFamily: "'IBM Plex Serif'", fontSize: 13, fontStyle: 'italic',
          color: 'var(--ink-mute)',
        }}>{emptyText}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 34, listStyle: 'none' }}>
          {items.map((t, i) => (
            <li key={i} style={{
              position: 'relative', padding: '6px 0 6px 16px',
              fontFamily: "'IBM Plex Serif'", fontSize: 13.5, lineHeight: 1.55,
              color: 'var(--ink)',
              borderLeft: `2px solid ${accent}`,
              marginBottom: 4, paddingLeft: 14,
            }}>
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(820px, 100%)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3>Análisis Financiero</h3>
            <span className="modal-tag" style={{ background: 'var(--gold)', color: '#0a0a0a' }}>IA</span>
            <span style={{
              fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--ink-mute)',
              letterSpacing: '0.08em',
            }}>{mesLabel} · ACUM {acumLabel}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          <p style={{
            margin: '0 0 18px',
            fontFamily: "'IBM Plex Serif'", fontSize: 12.5, fontStyle: 'italic',
            color: 'var(--ink-soft)', lineHeight: 1.55,
            paddingBottom: 14, borderBottom: '1px solid var(--line)',
          }}>
            Interpretación generada a partir del Estado de Resultados, variaciones de
            manufactura (MP / MOD / GV / GF), variaciones de venta (volumen y precio),
            y comparación contra el Forecast del periodo seleccionado.
          </p>

          <Section
            tag="01 · LECTURA"
            title="Interpretación"
            accent="var(--accent-3)"
            icon="i"
            items={interpretation}
            emptyText="Sin lecturas relevantes con los datos disponibles."
          />
          <Section
            tag="02 · ALERTAS"
            title="Warnings"
            accent="var(--neg)"
            icon="!"
            items={warnings}
            emptyText="Sin alertas críticas — operación dentro de rangos normales."
          />
          <Section
            tag="03 · RECOMENDACIONES"
            title="Recomendaciones"
            accent="var(--gold)"
            icon="★"
            items={recommendations}
            emptyText="Sin recomendaciones específicas en este momento."
          />
          <Section
            tag="04 · NEXT STEPS"
            title="Acciones a Seguir"
            accent="var(--accent)"
            icon="→"
            items={actions}
            emptyText="Sin acciones priorizadas pendientes."
          />

          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: "'IBM Plex Mono'", fontSize: 9.5,
            color: 'var(--ink-mute)', letterSpacing: '0.08em',
          }}>
            <span>ANÁLISIS AUTOMATIZADO · BASADO EN DATOS REALES DEL PERIODO</span>
            <span>{new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
