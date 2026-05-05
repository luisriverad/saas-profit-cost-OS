import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import {
  PRODUCT_A_BOM, PRODUCT_A_ROUTING,
  PRODUCT_B_BOM, PRODUCT_B_ROUTING,
  PRODUCT_C_BOM, PRODUCT_C_ROUTING,
  PRODUCTION_SCHEDULE, RATES_BY_CC,
} from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtMoneySigned, fmtUnits } from '../utils/format';

const PERIODS_LABELS = ['ENERO 2026', 'FEBRERO 2026', 'MARZO 2026', 'ABRIL 2026'];
const PERIODS_WITH_ACUM = [...PERIODS_LABELS, 'ACUMULADO'];
const ACUMULADO_IDX = 4;
const ING_STORAGE_KEY = 'ingenieria.workspace.v2';
const STORAGE_KEY = 'prodReal.workspace.v2';
const PERIOD_KEY = 'ventaReal.periodIdx'; // shared with Venta Real / Dashboard General

const MP_CODES = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];
const MP_COSTS = {
  1001: 100, 1002: 55, 1003: 20, 1004: 34, 1005: 15,
  1006: 67,  1007: 22, 1008: 35, 1009: 15, 1010: 10,
};
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

const ING_BASE_PRODUCTS = [
  { code: 9001, name: 'PRODUCTO A', bom: PRODUCT_A_BOM, routing: PRODUCT_A_ROUTING },
  { code: 9002, name: 'PRODUCTO B', bom: PRODUCT_B_BOM, routing: PRODUCT_B_ROUTING },
  { code: 9003, name: 'PRODUCTO C', bom: PRODUCT_C_BOM, routing: PRODUCT_C_ROUTING },
];

const readIngStored = () => {
  try {
    const raw = window.localStorage.getItem(ING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const readStored = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const persist = (data) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

const readStoredPeriodIdx = () => {
  try {
    const raw = window.localStorage.getItem(PERIOD_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n >= PERIODS_LABELS.length) return 0;
    return n;
  } catch { return 0; }
};

// Per-unit costs: TOTAL MP, MOD, GV, GF, TOTAL — computed from BOM and routing
function computeUnitCosts(product) {
  const totalMp = product.bom.reduce((s, r) => s + r.consumo * (MP_COSTS[r.code] ?? 0), 0);
  let mod = 0, gv = 0, gf = 0;
  product.routing.forEach((r, i) => {
    const cc = RATES_BY_CC[i] ?? RATES_BY_CC[RATES_BY_CC.length - 1];
    mod += (r.tiempo || 0) * (cc?.modRate ?? 0);
    gv  += (r.tiempo || 0) * (cc?.gvRate  ?? 0);
    gf  += (r.tiempo || 0) * (cc?.gfRate  ?? 0);
  });
  return { totalMp, mod, gv, gf, total: totalMp + mod + gv + gf };
}

// Default real KGS produced per period (close to forecast ± variation factor)
const FACTORS = [0.94, 0.98, 1.04, 0.99];

const buildDefaultSnapshot = (periodIdx, products, schedule) => {
  const factor = FACTORS[periodIdx] ?? 1;
  const kgs = {};
  products.forEach((p) => {
    const sched = schedule.find((s) => s.code === p.code);
    const fcts = sched?.months[periodIdx] ?? 0;
    kgs[p.code] = Math.round(fcts * factor);
  });
  // Real MP $ — slightly above/below STD for visible variations
  const realMp = {};
  // Seed with same as the Excel for ENERO (period 0) when factor ~ 1, otherwise scaled
  const defaultRealForJan = {
    1001: 7313250, 1002: 1896221.25, 1003: 383353.6, 1004: 5020372,
    1005: 636984.075, 1006: 895977.6, 1007: 144036.2, 1008: 1813686,
    1009: 966000, 1010: 679000,
  };
  MP_CODES.forEach((code) => {
    realMp[code] = Math.round((defaultRealForJan[code] ?? 0) * factor);
  });
  return {
    kgs,
    realMp,
    realMod: Math.round(273000 * factor),
    realGv: Math.round(80500 * factor),
    realGf: Math.round(205000 * factor),
  };
};

const buildDefaultMatrix = (products, schedule) =>
  PERIODS_LABELS.map((_, i) => buildDefaultSnapshot(i, products, schedule));

const sumObj = (obj) => Object.values(obj).reduce((s, n) => s + (n || 0), 0);

function aggregateMatrixSnapshots(matrix, products) {
  const out = { kgs: {}, realMp: {}, realMod: 0, realGv: 0, realGf: 0, scrap: 0 };
  products.forEach((p) => { out.kgs[p.code] = 0; });
  MP_CODES.forEach((c) => { out.realMp[c] = 0; });
  matrix.forEach((s) => {
    if (!s) return;
    products.forEach((p) => { out.kgs[p.code] += s.kgs?.[p.code] ?? 0; });
    MP_CODES.forEach((c) => { out.realMp[c] += s.realMp?.[c] ?? 0; });
    out.realMod += s.realMod ?? 0;
    out.realGv  += s.realGv  ?? 0;
    out.realGf  += s.realGf  ?? 0;
  });
  return out;
}

export default function ProdReal() {
  const ingStored = readIngStored();
  const products = ingStored?.products ?? ING_BASE_PRODUCTS;
  const schedule = ingStored?.schedule ?? PRODUCTION_SCHEDULE;

  const [matrix, setMatrix] = useState(() => {
    const stored = readStored();
    if (stored?.matrix && Array.isArray(stored.matrix) && stored.matrix.length === PERIODS_LABELS.length) {
      return stored.matrix;
    }
    return buildDefaultMatrix(products, schedule);
  });

  const [periodIdx] = useState(readStoredPeriodIdx);
  const [status, setStatus] = useState(null);
  const timerRef = useRef(null);

  const flash = (kind, text, ms = 2400) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const period = PERIODS_WITH_ACUM[periodIdx] ?? PERIODS_LABELS[0];
  const isAcumulado = periodIdx === ACUMULADO_IDX;
  const snapshot = isAcumulado
    ? aggregateMatrixSnapshots(matrix, products)
    : (matrix[periodIdx] ?? buildDefaultSnapshot(periodIdx, products, schedule));

  // === MUTATIONS ===
  const updateKgs = (productCode, value) => {
    const num = parseInt(String(value).replace(/[^\d-]/g, ''), 10) || 0;
    setMatrix((prev) => {
      const next = prev.map((s, i) => i !== periodIdx ? s : ({ ...s, kgs: { ...s.kgs, [productCode]: Math.max(0, num) } }));
      persist({ matrix: next });
      return next;
    });
  };
  const updateRealMp = (mpCode, value) => {
    const num = parseFloat(String(value).replace(/[^\d.\-]/g, '')) || 0;
    setMatrix((prev) => {
      const next = prev.map((s, i) => i !== periodIdx ? s : ({ ...s, realMp: { ...s.realMp, [mpCode]: Math.max(0, num) } }));
      persist({ matrix: next });
      return next;
    });
  };
  const updateReal = (field, value) => {
    const num = parseFloat(String(value).replace(/[^\d.\-]/g, '')) || 0;
    setMatrix((prev) => {
      const next = prev.map((s, i) => i !== periodIdx ? s : ({ ...s, [field]: Math.max(0, num) }));
      persist({ matrix: next });
      return next;
    });
  };

  // === DERIVED DATA ===
  // Section 1: Valuación de la Producción
  const sec1 = products.map((p) => {
    const kgs = snapshot.kgs[p.code] ?? 0;
    const u = computeUnitCosts(p);
    return {
      code: p.code, name: p.name, kgs,
      uTotalMp: u.totalMp, uMod: u.mod, uGv: u.gv, uGf: u.gf, uTotal: u.total,
      tTotalMp: kgs * u.totalMp, tMod: kgs * u.mod, tGv: kgs * u.gv, tGf: kgs * u.gf, tTotal: kgs * u.total,
    };
  });
  const sec1Tot = sec1.reduce((acc, r) => ({
    kgs: acc.kgs + r.kgs,
    tTotalMp: acc.tTotalMp + r.tTotalMp,
    tMod: acc.tMod + r.tMod,
    tGv: acc.tGv + r.tGv,
    tGf: acc.tGf + r.tGf,
    tTotal: acc.tTotal + r.tTotal,
  }), { kgs: 0, tTotalMp: 0, tMod: 0, tGv: 0, tGf: 0, tTotal: 0 });
  const fctsKgsTot = products.reduce((s, p) => {
    const sched = schedule.find((x) => x.code === p.code);
    return s + (sched?.months[periodIdx] ?? 0);
  }, 0);

  // Section 2: Explosión de Materiales (per product)
  const sec2 = products.map((p) => {
    const kgs = snapshot.kgs[p.code] ?? 0;
    const mpRows = p.bom.map((b) => {
      const consumo = kgs * b.consumo;
      const costo = MP_COSTS[b.code] ?? 0;
      return {
        code: b.code, name: b.name, um: b.um,
        consumo, costo, total: consumo * costo,
      };
    });
    const wcRows = p.routing.map((r, i) => ({
      wc: r.wc, name: r.name, um: r.um,
      tiempo: kgs * (r.tiempo || 0),
    }));
    return { code: p.code, name: p.name, kgs, mpRows, wcRows };
  });
  const sec2TotalConsumo = sec2.reduce((s, prod) =>
    s + prod.mpRows.reduce((a, r) => a + r.total, 0), 0);

  // Section 3: STD vs REAL (Variación uso de MP)
  const sec3 = MP_CODES.map((code) => {
    const um = MP_UM[code];
    const name = MP_NAMES[code];
    const costo = MP_COSTS[code];
    // Total units consumed across all products (for this period)
    const units = sec2.reduce((s, prod) => {
      const row = prod.mpRows.find((r) => r.code === code);
      return s + (row?.consumo ?? 0);
    }, 0);
    const std = units * costo;
    const real = snapshot.realMp[code] ?? 0;
    const vari = real - std;
    return { code, name, um, units, costo, std, real, vari };
  });
  const sec3Tot = sec3.reduce((acc, r) => ({
    units: acc.units + r.units,
    std: acc.std + r.std,
    real: acc.real + r.real,
    vari: acc.vari + r.vari,
  }), { units: 0, std: 0, real: 0, vari: 0 });

  // Section 4: Mano de Obra · Absorción vs Real
  const sec4 = products.map((p) => {
    const kgs = snapshot.kgs[p.code] ?? 0;
    const u = computeUnitCosts(p);
    return { code: p.code, name: p.name, abs: kgs * u.mod };
  });
  const sec4AbsTot = sec4.reduce((s, r) => s + r.abs, 0);
  const sec4Real = snapshot.realMod;
  const sec4Var = sec4Real - sec4AbsTot;
  const sec4AbsFcst = products.reduce((s, p) => {
    const sched = schedule.find((x) => x.code === p.code);
    const fcts = sched?.months[periodIdx] ?? 0;
    const u = computeUnitCosts(p);
    return s + fcts * u.mod;
  }, 0);

  // Section 5: Variables · Absorción vs Real
  const sec5 = products.map((p) => {
    const kgs = snapshot.kgs[p.code] ?? 0;
    const u = computeUnitCosts(p);
    return { code: p.code, name: p.name, abs: kgs * u.gv };
  });
  const sec5AbsTot = sec5.reduce((s, r) => s + r.abs, 0);
  const sec5Real = snapshot.realGv;
  const sec5Var = sec5Real - sec5AbsTot;
  const sec5AbsFcst = products.reduce((s, p) => {
    const sched = schedule.find((x) => x.code === p.code);
    const fcts = sched?.months[periodIdx] ?? 0;
    const u = computeUnitCosts(p);
    return s + fcts * u.gv;
  }, 0);

  // Section 6: Fijos · Absorción vs Real
  const sec6 = products.map((p) => {
    const kgs = snapshot.kgs[p.code] ?? 0;
    const u = computeUnitCosts(p);
    return { code: p.code, name: p.name, abs: kgs * u.gf };
  });
  const sec6AbsTot = sec6.reduce((s, r) => s + r.abs, 0);
  const sec6Real = snapshot.realGf;
  const sec6Var = sec6Real - sec6AbsTot;
  const sec6AbsFcst = products.reduce((s, p) => {
    const sched = schedule.find((x) => x.code === p.code);
    const fcts = sched?.months[periodIdx] ?? 0;
    const u = computeUnitCosts(p);
    return s + fcts * u.gf;
  }, 0);

  // === EXPORT ===
  const handleExportar = () => {
    const slug = period.toLowerCase().replace(/\s+/g, '-');
    const lines = [];
    const escape = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    lines.push(`# PROD REAL · ${period}`);
    lines.push('');
    lines.push('## Sec.1 Valuación de la Producción');
    lines.push(['COD','PRODUCTO','KGS','U_MP','U_MOD','U_GV','U_GF','U_TOTAL','T_MP','T_MOD','T_GV','T_GF','T_TOTAL'].map(escape).join(','));
    sec1.forEach((r) => lines.push([r.code, r.name, r.kgs, r.uTotalMp, r.uMod, r.uGv, r.uGf, r.uTotal, r.tTotalMp, r.tMod, r.tGv, r.tGf, r.tTotal].map(escape).join(',')));
    lines.push('');
    lines.push('## Sec.3 STD vs REAL (MP)');
    lines.push(['COD','MP','UM','UNITS','COSTO','STD','REAL','VAR'].map(escape).join(','));
    sec3.forEach((r) => lines.push([r.code, r.name, r.um, r.units, r.costo, r.std, r.real, r.vari].map(escape).join(',')));
    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prod-real-${slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash('ok', `Exportado · prod-real-${slug}.csv`);
  };

  // === RENDER ===
  return (
    <>
      <PageHeader
        title={`Producción Real · ${period}`}
        subtitle="Valuación · Explosión de materiales · Variaciones MP · Absorciones MOD/GV/GF"
        actions={
          <>
            <span className="period-pill">
              <span className="period-pill-label">PERIODO</span>
              <span className="period-pill-value">{period}</span>
            </span>
            <button className="btn btn-primary" onClick={handleExportar}>Exportar</button>
            {status && (
              <span className={`status-pill dot ${status.kind}`}>{status.text}</span>
            )}
          </>
        }
      />

      {/* ========== SECCIÓN 1 ========== */}
      <Panel
        title="Valuación de la Producción"
        meta={`${period} · KGS reales × Costo unitario`}
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 60 }}>COD</th>
              <th rowSpan={2} style={{ textAlign: 'left' }}>PRODUCTO</th>
              <th rowSpan={2} className="num">{period.split(' ')[0]}</th>
              <th colSpan={5} className="center" style={{ background: '#fafaf6', borderLeft: '2px solid var(--ink)' }}>$ POR UNIDAD</th>
              <th colSpan={5} className="center" style={{ background: '#fafaf6', borderLeft: '2px solid var(--ink)' }}>$ TOTALES</th>
            </tr>
            <tr>
              <th className="num" style={{ borderLeft: '2px solid var(--ink)' }}>TOTAL MP</th>
              <th className="num">MOD</th>
              <th className="num">GTOS V</th>
              <th className="num">GTOS F</th>
              <th className="num">TOTAL</th>
              <th className="num" style={{ borderLeft: '2px solid var(--ink)' }}>TOTAL MP</th>
              <th className="num">MOD</th>
              <th className="num">GTOS V</th>
              <th className="num">GTOS F</th>
              <th className="num">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sec1.map((r) => (
              <tr key={r.code}>
                <td className="num">{r.code}</td>
                <td>{r.name}</td>
                <td className="cell-input num">
                  <input
                    type="text"
                    value={fmtUnits(r.kgs)}
                    onChange={(e) => updateKgs(r.code, e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
                <td className="num" style={{ borderLeft: '2px solid var(--ink)' }}>{fmtMoney(r.uTotalMp)}</td>
                <td className="num">{fmtMoney(r.uMod, 4)}</td>
                <td className="num">{fmtMoney(r.uGv, 4)}</td>
                <td className="num">{fmtMoney(r.uGf, 4)}</td>
                <td className="num">{fmtMoney(r.uTotal)}</td>
                <td className="cell-formula num" style={{ borderLeft: '2px solid var(--ink)' }}>${fmtMoneyNoDec(r.tTotalMp)}</td>
                <td className="cell-formula num">${fmtMoney(r.tMod)}</td>
                <td className="cell-formula num">${fmtMoney(r.tGv)}</td>
                <td className="cell-formula num">${fmtMoney(r.tGf)}</td>
                <td className="cell-formula num"><b>${fmtMoneyNoDec(r.tTotal)}</b></td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={2}><b>TOTAL</b></td>
              <td className="num"><b>{fmtUnits(sec1Tot.kgs)}</b></td>
              <td colSpan={5} style={{ borderLeft: '2px solid var(--ink)' }}></td>
              <td className="num" style={{ borderLeft: '2px solid var(--ink)' }}><b>${fmtMoneyNoDec(sec1Tot.tTotalMp)}</b></td>
              <td className="num"><b>${fmtMoney(sec1Tot.tMod)}</b></td>
              <td className="num"><b>${fmtMoney(sec1Tot.tGv)}</b></td>
              <td className="num"><b>${fmtMoney(sec1Tot.tGf)}</b></td>
              <td className="num"><b>${fmtMoneyNoDec(sec1Tot.tTotal)}</b></td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>
                FCTS
              </td>
              <td className="num fcts-col">{fmtUnits(fctsKgsTot)}</td>
              <td colSpan={10}></td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {/* ========== SECCIÓN 2 ========== */}
      <Panel
        title="Consumo a Estándar · Explosión de Materiales"
        meta={`${period} · Por producto: MPs y tiempos por WC`}
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>COD</th>
              <th>DESCRIPCIÓN</th>
              <th className="center" style={{ width: 60 }}>UM</th>
              <th className="num" style={{ width: 110 }}>CONSUMO</th>
              <th className="num" style={{ width: 90 }}>COSTO</th>
              <th className="num" style={{ width: 130 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sec2.map((prod) => (
              <SectionExplosion key={prod.code} prod={prod} />
            ))}
            <tr className="row-total">
              <td colSpan={3} style={{ textAlign: 'right' }}><b>TOTAL CONSUMO ESTÁNDAR</b></td>
              <td></td>
              <td></td>
              <td className="num"><b>${fmtMoneyNoDec(sec2TotalConsumo)}</b></td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {/* ========== SECCIÓN 3 ========== */}
      <Panel
        title="Variación de Uso de MP · Estándar vs Real (Vales)"
        meta={`${period} · Captura "$ REAL (Vales)" desde inventario / vales de salida`}
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>COD</th>
              <th>MATERIA PRIMA</th>
              <th className="center" style={{ width: 60 }}>UM</th>
              <th className="num" style={{ width: 110 }}>UNIDADES</th>
              <th className="num" style={{ width: 90 }}>COSTO</th>
              <th className="num" style={{ width: 130 }}>$ STD</th>
              <th className="num" style={{ width: 130 }}>$ REAL (Vales)</th>
              <th className="num" style={{ width: 130 }}>VAR</th>
            </tr>
          </thead>
          <tbody>
            {sec3.map((r) => (
              <tr key={r.code}>
                <td className="mp-code">{r.code}</td>
                <td>{r.name}</td>
                <td className="center">{r.um}</td>
                <td className="num">{fmtUnits(r.units)}</td>
                <td className="cell-master num">{fmtMoney(r.costo)}</td>
                <td className="cell-formula num">${fmtMoneyNoDec(r.std)}</td>
                <td className="cell-input num">
                  <input
                    type="text"
                    value={fmtMoneyNoDec(r.real)}
                    onChange={(e) => updateRealMp(r.code, e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
                <td className="num" style={{ color: r.vari < 0 ? 'var(--neg)' : r.vari > 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
                  {r.vari < 0 ? `−$${fmtMoneyNoDec(Math.abs(r.vari))}` : r.vari > 0 ? `+$${fmtMoneyNoDec(r.vari)}` : '$0'}
                </td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={3} style={{ textAlign: 'right' }}><b>TOTAL · VARIACIÓN USO DE MP</b></td>
              <td className="num"><b>{fmtUnits(sec3Tot.units)}</b></td>
              <td></td>
              <td className="num"><b>${fmtMoneyNoDec(sec3Tot.std)}</b></td>
              <td className="num"><b>${fmtMoneyNoDec(sec3Tot.real)}</b></td>
              <td className="num" style={{ color: sec3Tot.vari < 0 ? 'var(--neg)' : sec3Tot.vari > 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
                <b>{sec3Tot.vari < 0 ? `−$${fmtMoneyNoDec(Math.abs(sec3Tot.vari))}` : sec3Tot.vari > 0 ? `+$${fmtMoneyNoDec(sec3Tot.vari)}` : '$0'}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {/* ========== SECCIÓN 4 — MANO DE OBRA ========== */}
      <AbsorptionPanel
        title="Mano de Obra · Absorción vs Real"
        period={period}
        rows={sec4}
        absTot={sec4AbsTot}
        real={sec4Real}
        vari={sec4Var}
        absFcst={sec4AbsFcst}
        onUpdateReal={(v) => updateReal('realMod', v)}
      />

      {/* ========== SECCIÓN 5 — VARIABLES ========== */}
      <AbsorptionPanel
        title="Gastos Variables · Absorción vs Real"
        period={period}
        rows={sec5}
        absTot={sec5AbsTot}
        real={sec5Real}
        vari={sec5Var}
        absFcst={sec5AbsFcst}
        onUpdateReal={(v) => updateReal('realGv', v)}
      />

      {/* ========== SECCIÓN 6 — FIJOS ========== */}
      <AbsorptionPanel
        title="Gastos Fijos · Absorción vs Real"
        period={period}
        rows={sec6}
        absTot={sec6AbsTot}
        real={sec6Real}
        vari={sec6Var}
        absFcst={sec6AbsFcst}
        onUpdateReal={(v) => updateReal('realGf', v)}
      />
    </>
  );
}

function SectionExplosion({ prod }) {
  return (
    <>
      <tr style={{ background: '#0a0a0a', color: '#fff' }}>
        <td className="num" style={{ color: '#fff' }}><b>{prod.code}</b></td>
        <td colSpan={5} style={{ color: '#fff', fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <b>{prod.name}</b> · KGS producidos: {fmtUnits(prod.kgs)}
        </td>
      </tr>
      {prod.mpRows.map((r) => (
        <tr key={`${prod.code}-${r.code}`}>
          <td className="mp-code">{r.code}</td>
          <td>{r.name}</td>
          <td className="center">{r.um}</td>
          <td className="cell-formula num">{fmtUnits(Math.round(r.consumo))}</td>
          <td className="cell-master num">{fmtMoney(r.costo)}</td>
          <td className="cell-formula num">${fmtMoneyNoDec(r.total)}</td>
        </tr>
      ))}
      {prod.wcRows.map((r) => (
        <tr key={`${prod.code}-${r.wc}`}>
          <td><span className="wc-code">{r.wc}</span></td>
          <td>{r.name}</td>
          <td className="center">{r.um}</td>
          <td className="cell-formula num">{fmtUnits(Math.round(r.tiempo))}</td>
          <td></td>
          <td></td>
        </tr>
      ))}
    </>
  );
}

function AbsorptionPanel({ title, period, rows, absTot, real, vari, absFcst, onUpdateReal }) {
  return (
    <Panel
      title={title}
      meta={`${period} · Real captura manual · Variación = Real − Absorción`}
      scrollX
    >
      <table className="cost-table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>COD</th>
            <th>{title.split(' · ')[0].toUpperCase()}</th>
            <th className="num" style={{ width: 150 }}>ABSORCIÓN</th>
            <th className="num" style={{ width: 150 }}>REAL</th>
            <th className="num" style={{ width: 150 }}>VARIACIÓN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className="num">{r.code}</td>
              <td>{r.name}</td>
              <td className="cell-formula num">${fmtMoney(r.abs)}</td>
              <td></td>
              <td></td>
            </tr>
          ))}
          <tr className="row-total">
            <td colSpan={2} style={{ textAlign: 'right' }}><b>TOTAL</b></td>
            <td className="num"><b>${fmtMoney(absTot)}</b></td>
            <td className="cell-input num">
              <input
                type="text"
                value={fmtMoneyNoDec(real)}
                onChange={(e) => onUpdateReal(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </td>
            <td className="num" style={{ color: vari < 0 ? 'var(--neg)' : vari > 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
              <b>{vari < 0 ? `−$${fmtMoney(Math.abs(vari))}` : vari > 0 ? `+$${fmtMoney(vari)}` : '$0'}</b>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>
              ABS FCST
            </td>
            <td className="num fcts-col">${fmtMoney(absFcst)}</td>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}
