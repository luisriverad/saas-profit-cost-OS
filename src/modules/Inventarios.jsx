import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { fmtMoney, fmtMoneyNoDec, fmtUnits } from '../utils/format';
import {
  PRODUCT_A_BOM, PRODUCT_B_BOM, PRODUCT_C_BOM, PRODUCTION_SCHEDULE,
} from '../data/seed';

const STORAGE_KEY  = 'inventarios.workspace.v1';
const COMPRAS_KEY  = 'compras.workspace.v1';
const PR_KEY       = 'prodReal.workspace.v2';
const VR_PERIOD_KEY = 'ventaReal.periodIdx';

const readPeriodIdx = () => {
  try {
    const raw = window.localStorage.getItem(VR_PERIOD_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n > 11) return 0;
    return n;
  } catch { return 0; }
};

const MP_CODES = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];
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
const FALLBACK_COSTS = {
  1001: 100, 1002: 55, 1003: 20, 1004: 34, 1005: 15,
  1006: 67,  1007: 22, 1008: 35, 1009: 15, 1010: 10,
};
const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const YEAR = 2026;

const readJson = (key) => {
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const persist = (data) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('app:data:changed', { detail: { key: STORAGE_KEY } }));
  } catch {}
};

// --- SEED de inventario simulado ---
// Para cada MP genera:
//   - inventario inicial (10% del consumo anual estimado)
//   - 1 entrada y 1 salida por mes, ligeramente desbalanceadas para mostrar variaciones
function buildDefaultData() {
  const compras = readJson(COMPRAS_KEY);
  const stdCosts = {};
  const realCosts = {};
  MP_CODES.forEach((c) => { stdCosts[c] = FALLBACK_COSTS[c]; realCosts[c] = FALLBACK_COSTS[c]; });
  if (compras?.mps) {
    compras.mps.forEach((m) => {
      const c = parseInt(m.code, 10);
      if (m.costStd  > 0) stdCosts[c]  = parseFloat(m.costStd);
      if (m.costReal > 0) realCosts[c] = parseFloat(m.costReal);
    });
  }

  // Volúmenes mensuales aproximados (alineados con la planta)
  const baseConsumo = {
    1001: 67000, 1002: 33500, 1003: 21500, 1004: 134000, 1005: 45000,
    1006: 13400, 1007: 6700,  1008: 53700, 1009: 67000,  1010: 67000,
  };
  // Multiplicadores por mes — todos distintos para garantizar variaciones ≠ 0
  // (separan entrada vs salida con patrones senoidales desfasados)
  const entradaMult = (i) => 1 + Math.sin((i + 1) * 0.7) * 0.08 + (i * 0.005);
  const salidaMult  = (i) => 1 + Math.cos((i + 1) * 0.55) * 0.07 - (i * 0.004);

  const result = {};
  MP_CODES.forEach((code) => {
    const baseMo = baseConsumo[code] ?? 0;
    const movs = [];
    // Inv inicial: ~10% del mes base, valuado a costStd
    movs.push({
      id: `${code}-INI`,
      tipo: 'entrada',
      fecha: `${YEAR - 1}-12-31`,
      kgs: Math.round(baseMo * 0.10),
      costoUnit: stdCosts[code],
      ref: 'INVENTARIO INICIAL',
    });
    // 12 meses: 1 compra + 1 consumo, ambos siempre distintos
    for (let i = 0; i < 12; i++) {
      const mo = String(i + 1).padStart(2, '0');
      const codeOffset = (code % 7) * 0.01; // pequeña variación por MP
      const entradaQty = Math.max(1, Math.round(baseMo * (entradaMult(i) + codeOffset)));
      const salidaQty  = Math.max(1, Math.round(baseMo * (salidaMult(i)  - codeOffset)));
      const costoEntrada = +(realCosts[code] * (1 + (((i + code) % 5) - 2) * 0.01)).toFixed(2);
      movs.push({
        id: `${code}-${i}-E`,
        tipo: 'entrada',
        fecha: `${YEAR}-${mo}-05`,
        kgs: entradaQty,
        costoUnit: costoEntrada,
        ref: `OC-${YEAR}-${(i + 1) * 10 + (code % 10)}`,
      });
      movs.push({
        id: `${code}-${i}-S`,
        tipo: 'salida',
        fecha: `${YEAR}-${mo}-22`,
        kgs: salidaQty,
        ref: `PROD-${MONTHS[i]}-${code}`,
      });
    }
    result[code] = movs;
  });
  return { movements: result, materials: [], invFinalTargets: {} };
}

// --- Lógica FIFO ---
// Devuelve para cada movimiento de salida: cuáles lotes (entradas) consumió y a qué costo.
function computeFIFO(movs) {
  const ordered = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const lots = []; // {qtyRest, costoUnit, fecha, fromId}
  const enriched = [];
  for (const m of ordered) {
    if (m.tipo === 'entrada') {
      lots.push({ qtyRest: m.kgs, costoUnit: m.costoUnit, fecha: m.fecha, fromId: m.id });
      enriched.push({ ...m, valor: m.kgs * m.costoUnit });
    } else {
      // salida: consumir FIFO
      let remain = m.kgs;
      const consumes = [];
      let valor = 0;
      while (remain > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(lot.qtyRest, remain);
        consumes.push({ fromId: lot.fromId, fecha: lot.fecha, kgs: take, costoUnit: lot.costoUnit });
        valor += take * lot.costoUnit;
        lot.qtyRest -= take;
        remain -= take;
        if (lot.qtyRest <= 0.0001) lots.shift();
      }
      enriched.push({ ...m, valor: -valor, consumes, deficit: remain > 0 ? remain : 0 });
    }
  }
  // Stock final
  const stockFinal = lots.reduce((s, l) => s + l.qtyRest, 0);
  const stockValor = lots.reduce((s, l) => s + l.qtyRest * l.costoUnit, 0);
  return { enriched, lots, stockFinal, stockValor };
}

// Stock al inicio de un mes: suma neta de movimientos con fecha estrictamente anterior
function stockAtStartOfMonth(movs, monthIdx) {
  const cutoff = `${YEAR}-${String(monthIdx + 1).padStart(2, '0')}-01`;
  let stock = 0;
  for (const m of movs) {
    if (m.fecha < cutoff) {
      stock += m.tipo === 'entrada' ? m.kgs : -m.kgs;
    }
  }
  return stock;
}

// BOM consolidado por código de MP — consumo unitario (kgs MP / kgs producto)
const BOM_BY_PRODUCT = [
  { code: 9001, bom: PRODUCT_A_BOM },
  { code: 9002, bom: PRODUCT_B_BOM },
  { code: 9003, bom: PRODUCT_C_BOM },
];

// Ventas previstas (consumo teórico) por MP para un mes específico:
// suma sobre productos de (kgs planeados del producto × ratio bom de la MP)
function ventasPrevistasMes(monthIdx) {
  const out = {};
  MP_CODES.forEach((c) => { out[c] = 0; });
  BOM_BY_PRODUCT.forEach((p) => {
    const sched = PRODUCTION_SCHEDULE.find((s) => s.code === p.code);
    const kgsProd = sched?.months[monthIdx] ?? 0;
    p.bom.forEach((row) => {
      out[row.code] = (out[row.code] ?? 0) + kgsProd * row.consumo;
    });
  });
  return out;
}

// Por mes: variaciones (entradas - salidas) y stock cierre
function buildMonthlySummary(movs) {
  const fifo = computeFIFO(movs);
  const monthly = MONTHS.map(() => ({ entradasKgs: 0, salidasKgs: 0, entradas$: 0, salidas$: 0 }));
  let invInicialKgs = 0, invInicial$ = 0;
  // Items con fecha previa al año actual = inv inicial
  fifo.enriched.forEach((m) => {
    const year = parseInt(m.fecha.slice(0, 4), 10);
    const mo   = parseInt(m.fecha.slice(5, 7), 10) - 1;
    if (year < YEAR) {
      if (m.tipo === 'entrada') {
        invInicialKgs += m.kgs;
        invInicial$   += m.valor;
      }
      return;
    }
    if (mo < 0 || mo > 11) return;
    if (m.tipo === 'entrada') {
      monthly[mo].entradasKgs += m.kgs;
      monthly[mo].entradas$   += m.valor;
    } else {
      monthly[mo].salidasKgs += m.kgs;
      monthly[mo].salidas$   += -m.valor; // valor de salida es negativo
    }
  });
  // Stock acumulado por mes
  let stockKgs = invInicialKgs, stock$ = invInicial$;
  monthly.forEach((row) => {
    stockKgs += row.entradasKgs - row.salidasKgs;
    stock$   += row.entradas$  - row.salidas$;
    row.stockKgs = stockKgs;
    row.stock$   = stock$;
    row.varKgs   = row.entradasKgs - row.salidasKgs;
  });
  return { invInicialKgs, invInicial$, monthly, stockFinalKgs: stockKgs, stockFinal$: stock$ };
}

export default function Inventarios() {
  const [data, setData] = useState(() => readJson(STORAGE_KEY) ?? buildDefaultData());
  const [detail, setDetail] = useState(null); // { code }
  const [showAdd, setShowAdd] = useState(false);
  const [status, setStatus] = useState(null);
  const [planMonthIdx, setPlanMonthIdx] = useState(readPeriodIdx);
  // Inv final objetivo por MP por mes — capturable. Si no hay valor, usa Inv Inicial (política de stock constante)
  const [invFinalTargets, setInvFinalTargets] = useState(() => {
    return readJson(STORAGE_KEY)?.invFinalTargets ?? {};
  });
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Sincroniza el mes con el selector del Dashboard General
  useEffect(() => {
    const onChange = () => setPlanMonthIdx(readPeriodIdx());
    window.addEventListener('app:data:changed', onChange);
    window.addEventListener('storage', onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener('app:data:changed', onChange);
      window.removeEventListener('storage', onChange);
      window.removeEventListener('focus', onChange);
    };
  }, []);

  const flash = (kind, text, ms = 2400) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };

  const compras = readJson(COMPRAS_KEY);
  const realCostByCode = useMemo(() => {
    const out = {};
    MP_CODES.forEach((c) => { out[c] = FALLBACK_COSTS[c]; });
    if (compras?.mps) {
      compras.mps.forEach((m) => {
        const c = parseInt(m.code, 10);
        if (m.costReal > 0) out[c] = parseFloat(m.costReal);
      });
    }
    return out;
  }, [compras]);

  const summaries = useMemo(() => {
    const out = {};
    MP_CODES.forEach((code) => {
      const movs = data.movements[code] ?? [];
      out[code] = buildMonthlySummary(movs);
    });
    return out;
  }, [data]);

  const handleAdd = (mov) => {
    const code = parseInt(mov.code, 10);
    const next = {
      ...data,
      invFinalTargets,
      movements: {
        ...data.movements,
        [code]: [
          ...(data.movements[code] ?? []),
          {
            id: `${code}-MAN-${Date.now()}`,
            tipo: mov.tipo,
            fecha: mov.fecha,
            kgs: parseFloat(mov.kgs) || 0,
            costoUnit: mov.tipo === 'entrada' ? (parseFloat(mov.costoUnit) || 0) : undefined,
            ref: mov.ref || 'CAPTURA MANUAL',
          },
        ],
      },
    };
    setData(next);
    persist(next);
    setShowAdd(false);
    flash('ok', `${mov.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${MP_NAMES[code]} registrada`);
  };

  const updateInvFinalTarget = (code, monthIdx, value) => {
    const num = parseFloat(String(value).replace(/[^\d.\-]/g, ''));
    const key = `${code}_${monthIdx}`;
    const nextTargets = { ...invFinalTargets };
    if (Number.isFinite(num) && num >= 0) nextTargets[key] = num;
    else delete nextTargets[key];
    setInvFinalTargets(nextTargets);
    persist({ ...data, invFinalTargets: nextTargets });
  };

  const handleResetSeed = () => {
    if (!window.confirm('Esto va a regenerar todos los movimientos simulados. ¿Continuar?')) return;
    const fresh = buildDefaultData();
    setData(fresh);
    persist(fresh);
    flash('ok', 'Inventarios regenerados');
  };

  return (
    <>
      <PageHeader
        title="Inventarios · Materias Primas"
        subtitle="Movimientos mensuales · Valuación FIFO · Click en una MP para ver entradas y salidas"
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Materiales</button>
            <button className="btn" onClick={handleResetSeed}>Regenerar simulación</button>
            {status && (
              <span className={`status-pill dot ${status.kind}`}>{status.text}</span>
            )}
          </>
        }
      />

      <Panel
        title="Variaciones mensuales por Materia Prima"
        meta={`${MP_CODES.length} materiales · stock final = stock inicial + Σ entradas − Σ salidas`}
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>COD</th>
              <th>MATERIA PRIMA</th>
              <th className="center" style={{ width: 50 }}>UM</th>
              <th className="num" style={{ width: 110 }}>INV INICIAL</th>
              {MONTHS.map((m) => (
                <th key={m} className="num" style={{ width: 80 }}>{m}</th>
              ))}
              <th className="num" style={{ width: 110, background: '#0a0a0a', color: '#fff' }}>INV FINAL</th>
            </tr>
          </thead>
          <tbody>
            {MP_CODES.map((code) => {
              const s = summaries[code];
              return (
                <tr
                  key={code}
                  onClick={() => setDetail({ code })}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="mp-code">{code}</td>
                  <td>{MP_NAMES[code]}</td>
                  <td className="center">{MP_UM[code]}</td>
                  <td className="cell-formula num">{fmtUnits(s.invInicialKgs)}</td>
                  {s.monthly.map((m, i) => {
                    const v = m.varKgs;
                    const cls = v > 0 ? 'pos-num' : v < 0 ? 'neg-num' : '';
                    const sign = v > 0 ? '+' : v < 0 ? '−' : '';
                    return (
                      <td key={i} className={`cell-formula num ${cls}`}>
                        {v === 0 ? '—' : `${sign}${fmtUnits(Math.abs(v))}`}
                      </td>
                    );
                  })}
                  <td className="num" style={{ background: '#0a0a0a', color: '#fff', fontWeight: 600 }}>
                    {fmtUnits(s.stockFinalKgs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Valuación FIFO al cierre · YTD"
        meta="Valor del inventario calculado consumiendo lotes más antiguos primero"
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>COD</th>
              <th>MATERIA PRIMA</th>
              <th className="num" style={{ width: 110 }}>STOCK FINAL</th>
              <th className="num" style={{ width: 130 }}>$ FIFO</th>
              <th className="num" style={{ width: 130 }}>$ COSTO REAL</th>
              <th className="num" style={{ width: 130 }}>VAR FIFO vs REAL</th>
            </tr>
          </thead>
          <tbody>
            {MP_CODES.map((code) => {
              const s = summaries[code];
              const fifoVal = s.stockFinal$;
              const realVal = s.stockFinalKgs * (realCostByCode[code] ?? 0);
              const diff = fifoVal - realVal;
              const cls = diff > 0 ? 'neg-num' : diff < 0 ? 'pos-num' : '';
              const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
              return (
                <tr key={code}>
                  <td className="mp-code">{code}</td>
                  <td>{MP_NAMES[code]}</td>
                  <td className="cell-formula num">{fmtUnits(s.stockFinalKgs)}</td>
                  <td className="cell-formula num">${fmtMoneyNoDec(fifoVal)}</td>
                  <td className="cell-formula num">${fmtMoneyNoDec(realVal)}</td>
                  <td className={`cell-formula num ${cls}`}>
                    {diff === 0 ? '$0' : `${sign}$${fmtMoneyNoDec(Math.abs(diff))}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel
        title={`Plan de Compras · ${MONTHS[planMonthIdx]} ${YEAR}`}
        meta={`Compras = Ventas previstas + Inventario final − Inventario inicial · ${MONTHS[planMonthIdx]} ${YEAR}`}
        scrollX
      >
        {(() => {
          const ventas = ventasPrevistasMes(planMonthIdx);
          const totals = { invIni: 0, ventas: 0, invFin: 0, compras: 0 };
          return (
            <table className="cost-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>COD</th>
                  <th>MATERIA PRIMA</th>
                  <th className="center" style={{ width: 50 }}>UM</th>
                  <th className="num" style={{ width: 130 }}>INV INICIAL</th>
                  <th className="num" style={{ width: 130 }}>VENTAS PREVISTAS</th>
                  <th className="num" style={{ width: 130 }}>INV FINAL OBJETIVO</th>
                  <th className="num" style={{ width: 140, background: '#0a0a0a', color: '#fff' }}>COMPRAS</th>
                </tr>
              </thead>
              <tbody>
                {MP_CODES.map((code) => {
                  const movs = data.movements[code] ?? [];
                  const invIni = stockAtStartOfMonth(movs, planMonthIdx);
                  const ventasMP = Math.round(ventas[code] ?? 0);
                  const targetKey = `${code}_${planMonthIdx}`;
                  const invFin = invFinalTargets[targetKey] !== undefined
                    ? invFinalTargets[targetKey]
                    : invIni; // política por defecto: stock constante
                  const compras = Math.round(ventasMP + invFin - invIni);
                  totals.invIni  += invIni;
                  totals.ventas  += ventasMP;
                  totals.invFin  += invFin;
                  totals.compras += compras;
                  return (
                    <tr key={code}>
                      <td className="mp-code">{code}</td>
                      <td>{MP_NAMES[code]}</td>
                      <td className="center">{MP_UM[code]}</td>
                      <td className="cell-formula num">{fmtUnits(Math.round(invIni))}</td>
                      <td className="cell-formula num">{fmtUnits(ventasMP)}</td>
                      <td className="cell-input num">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={fmtUnits(Math.round(invFin))}
                          onChange={(e) => updateInvFinalTarget(code, planMonthIdx, e.target.value)}
                          onFocus={(e) => e.target.select()}
                        />
                      </td>
                      <td className="num" style={{ background: '#fff7e0', fontWeight: 600 }}>
                        {fmtUnits(compras)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="row-total">
                  <td colSpan={3} style={{
                    textAlign: 'right',
                    fontFamily: "'IBM Plex Sans'",
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                  }}>
                    TOTAL
                  </td>
                  <td className="num"><b>{fmtUnits(Math.round(totals.invIni))}</b></td>
                  <td className="num"><b>{fmtUnits(totals.ventas)}</b></td>
                  <td className="num"><b>{fmtUnits(Math.round(totals.invFin))}</b></td>
                  <td className="num" style={{ background: '#0a0a0a', color: '#fff' }}>
                    <b>{fmtUnits(totals.compras)}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          );
        })()}
      </Panel>

      {detail && (
        <FifoDetailModal
          code={detail.code}
          movs={data.movements[detail.code] ?? []}
          onClose={() => setDetail(null)}
        />
      )}

      {showAdd && (
        <AddMovimientoModal
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
}

function FifoDetailModal({ code, movs, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fifo = useMemo(() => computeFIFO(movs), [movs]);

  const entradaCount = fifo.enriched.filter((m) => m.tipo === 'entrada').length;
  const salidaCount  = fifo.enriched.filter((m) => m.tipo === 'salida').length;
  const totalEntrada$ = fifo.enriched
    .filter((m) => m.tipo === 'entrada')
    .reduce((s, m) => s + m.valor, 0);
  const totalSalida$ = fifo.enriched
    .filter((m) => m.tipo === 'salida')
    .reduce((s, m) => s + (-m.valor), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 920 }}>
        <div className="modal-header">
          <h3>Inventario · {MP_NAMES[code]} <span style={{ color: 'var(--ink-mute)', fontWeight: 400 }}>({code} · {MP_UM[code]})</span></h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
            marginBottom: 18,
          }}>
            <KpiCell label="Entradas" value={`${entradaCount} mov.`} sub={`$${fmtMoneyNoDec(totalEntrada$)}`} accent="var(--pos)" />
            <KpiCell label="Salidas"  value={`${salidaCount} mov.`}  sub={`$${fmtMoneyNoDec(totalSalida$)}`} accent="var(--neg)" />
            <KpiCell label="Stock final" value={`${fmtUnits(fifo.stockFinal)} ${MP_UM[code]}`} sub={`$${fmtMoneyNoDec(fifo.stockValor)} FIFO`} />
            <KpiCell label="Costo prom. inv." value={fifo.stockFinal > 0 ? `$${fmtMoney(fifo.stockValor / fifo.stockFinal)}` : '—'} />
          </div>

          <h4 style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-mute)', marginBottom: 8 }}>
            MOVIMIENTOS CRONOLÓGICOS · FIFO
          </h4>
          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--line)' }}>
            <table className="cost-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 85 }}>FECHA</th>
                  <th style={{ width: 70 }}>TIPO</th>
                  <th>REFERENCIA</th>
                  <th className="num" style={{ width: 90 }}>{MP_UM[code]}</th>
                  <th className="num" style={{ width: 80 }}>$/U</th>
                  <th className="num" style={{ width: 110 }}>VALOR</th>
                  <th style={{ width: 220 }}>DETALLE FIFO</th>
                </tr>
              </thead>
              <tbody>
                {fifo.enriched.map((m) => {
                  const isEntrada = m.tipo === 'entrada';
                  return (
                    <tr key={m.id} style={{ background: isEntrada ? 'rgba(95,191,128,0.08)' : 'rgba(255,124,90,0.08)' }}>
                      <td>{m.fecha}</td>
                      <td>
                        <span style={{
                          fontFamily: "'IBM Plex Mono'", fontSize: 9, fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: isEntrada ? 'var(--pos)' : 'var(--neg)',
                        }}>
                          {isEntrada ? 'ENT' : 'SAL'}
                        </span>
                      </td>
                      <td>{m.ref}</td>
                      <td className="num">{fmtUnits(m.kgs)}</td>
                      <td className="num">{m.costoUnit !== undefined ? fmtMoney(m.costoUnit) : '—'}</td>
                      <td className="num" style={{ color: isEntrada ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
                        {isEntrada ? '+' : '−'}${fmtMoneyNoDec(Math.abs(m.valor))}
                      </td>
                      <td style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                        {isEntrada
                          ? <em>nuevo lote</em>
                          : (m.consumes && m.consumes.length > 0
                              ? m.consumes.map((c, idx) => (
                                  <div key={idx}>
                                    {fmtUnits(c.kgs)} de lote {c.fecha} @ ${fmtMoney(c.costoUnit)}
                                  </div>
                                ))
                              : <em>sin lotes</em>
                            )}
                        {m.deficit > 0 && (
                          <div style={{ color: 'var(--neg)', fontWeight: 600 }}>
                            ▲ déficit: {fmtUnits(m.deficit)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {fifo.lots.length > 0 && (
            <>
              <h4 style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-mute)', marginTop: 18, marginBottom: 8 }}>
                LOTES VIGENTES (FIFO)
              </h4>
              <table className="cost-table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>FECHA INGRESO</th>
                    <th className="num" style={{ width: 110 }}>{MP_UM[code]} RESTANTE</th>
                    <th className="num" style={{ width: 110 }}>$/U</th>
                    <th className="num" style={{ width: 130 }}>VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  {fifo.lots.map((lot, idx) => (
                    <tr key={idx}>
                      <td>{lot.fecha}</td>
                      <td className="num">{fmtUnits(lot.qtyRest)}</td>
                      <td className="num">${fmtMoney(lot.costoUnit)}</td>
                      <td className="num">${fmtMoneyNoDec(lot.qtyRest * lot.costoUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCell({ label, value, sub, accent }) {
  return (
    <div style={{
      border: '1px solid var(--line)',
      background: 'var(--panel)',
      borderTop: accent ? `3px solid ${accent}` : '1px solid var(--line)',
      padding: '10px 14px',
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: '0.1em',
        color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: "'IBM Plex Serif'", fontSize: 20, fontWeight: 700,
        color: 'var(--ink)', lineHeight: 1.1,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: "'IBM Plex Mono'", fontSize: 10,
          color: 'var(--ink-soft)', marginTop: 2,
        }}>{sub}</div>
      )}
    </div>
  );
}

function AddMovimientoModal({ onAdd, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    code: 1001,
    tipo: 'entrada',
    fecha: today,
    kgs: '',
    costoUnit: '',
    ref: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const kgs = parseFloat(form.kgs);
    if (!kgs || kgs <= 0) { setError('Cantidad inválida'); return; }
    if (form.tipo === 'entrada') {
      const cu = parseFloat(form.costoUnit);
      if (!cu || cu <= 0) { setError('Costo unitario inválido para entrada'); return; }
    }
    onAdd({
      code: form.code,
      tipo: form.tipo,
      fecha: form.fecha,
      kgs,
      costoUnit: form.tipo === 'entrada' ? parseFloat(form.costoUnit) : undefined,
      ref: form.ref.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>+ Materiales · Nuevo movimiento</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <Field label="Materia Prima">
            <select
              value={form.code}
              onChange={(e) => setForm({ ...form, code: parseInt(e.target.value, 10) })}
            >
              {MP_CODES.map((c) => (
                <option key={c} value={c}>{c} · {MP_NAMES[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value, costoUnit: e.target.value === 'salida' ? '' : form.costoUnit })}
            >
              <option value="entrada">ENTRADA (compra / ajuste +)</option>
              <option value="salida">SALIDA (consumo / ajuste −)</option>
            </select>
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </Field>
          <Field label={`Cantidad (${MP_UM[form.code]})`}>
            <input
              type="number"
              step="any"
              value={form.kgs}
              onChange={(e) => setForm({ ...form, kgs: e.target.value })}
              placeholder="ej. 5000"
            />
          </Field>
          {form.tipo === 'entrada' && (
            <Field label="Costo unitario ($/U)">
              <input
                type="number"
                step="0.01"
                value={form.costoUnit}
                onChange={(e) => setForm({ ...form, costoUnit: e.target.value })}
                placeholder="ej. 105.00"
              />
            </Field>
          )}
          <Field label="Referencia (opcional)">
            <input
              type="text"
              value={form.ref}
              onChange={(e) => setForm({ ...form, ref: e.target.value })}
              placeholder="ej. OC-2026-045 o PROD-FEB-001"
            />
          </Field>
          {error && (
            <div style={{ color: 'var(--neg)', fontSize: 11, fontFamily: "'IBM Plex Mono'" }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar movimiento</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{
        fontFamily: "'IBM Plex Mono'", fontSize: 9, letterSpacing: '0.1em',
        color: 'var(--ink-mute)', textTransform: 'uppercase',
      }}>{label}</span>
      {children}
    </label>
  );
}
