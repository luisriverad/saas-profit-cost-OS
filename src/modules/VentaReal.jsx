import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { VENTA_REAL } from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtMoneySigned, fmtUnits } from '../utils/format';

const fmtSignedM = (n) => {
  const m = Math.abs(n) / 1_000_000;
  const s = m >= 1 ? m.toFixed(2) : (Math.abs(n) / 1_000).toFixed(0) + 'K';
  if (n > 0) return `+$${m >= 1 ? s + 'M' : s}`;
  if (n < 0) return `−$${m >= 1 ? s + 'M' : s}`;
  return '$0';
};

function shiftSnapshot(base, label, scaleK, scaleP = 1) {
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
    return { code: r.code, name: r.name, kgs, precio, ventaBruta, descuentos, ventaNeta,
             fctsKgs, varKgs, fctsVentas, varVentas, xVolumen, xPrecio };
  });
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const totals = {
    kgs: sum('kgs'),
    ventaBruta: +sum('ventaBruta').toFixed(2),
    descuentos: +sum('descuentos').toFixed(2),
    ventaNeta: +sum('ventaNeta').toFixed(2),
    fctsKgs: sum('fctsKgs'),
    varKgs: sum('varKgs'),
    fctsVentas: +sum('fctsVentas').toFixed(2),
    varVentas: +sum('varVentas').toFixed(2),
    xVolumen: +sum('xVolumen').toFixed(2),
    xPrecio: +sum('xPrecio').toFixed(2),
  };
  const impacto = { volumen: totals.xVolumen, precio: totals.xPrecio, neto: totals.varVentas };
  return { period: label, rows, totals, impacto };
}

const PERIODS = [
  shiftSnapshot(VENTA_REAL, 'ENERO 2026',   0.92, 0.975),
  shiftSnapshot(VENTA_REAL, 'FEBRERO 2026', 0.96, 0.99),
  shiftSnapshot(VENTA_REAL, 'MARZO 2026',   1.02, 1.005),
  shiftSnapshot(VENTA_REAL, 'ABRIL 2026',   0.98, 1.015),
];
const ACUMULADO_IDX = 4;

function buildAcumuladoPeriod() {
  // Sum rows across all 4 periods by product code
  const map = new Map();
  PERIODS.forEach((p) => {
    p.rows.forEach((r) => {
      const cur = map.get(r.code);
      if (!cur) {
        map.set(r.code, { ...r });
      } else {
        cur.kgs         += r.kgs;
        cur.ventaBruta  += r.ventaBruta;
        cur.descuentos  += r.descuentos;
        cur.ventaNeta   += r.ventaNeta;
        cur.fctsKgs     += r.fctsKgs;
        cur.varKgs      += r.varKgs;
        cur.fctsVentas  += r.fctsVentas;
        cur.varVentas   += r.varVentas;
        cur.xVolumen    += r.xVolumen;
        cur.xPrecio     += r.xPrecio;
        // Recompute weighted average price
        cur.precio = cur.kgs > 0 ? +(cur.ventaBruta / cur.kgs).toFixed(4) : 0;
      }
    });
  });
  const rows = [...map.values()].map((r) => ({
    ...r,
    ventaBruta: +r.ventaBruta.toFixed(2),
    descuentos: +r.descuentos.toFixed(2),
    ventaNeta: +r.ventaNeta.toFixed(2),
    fctsVentas: +r.fctsVentas.toFixed(2),
    varVentas: +r.varVentas.toFixed(2),
    xVolumen: +r.xVolumen.toFixed(2),
    xPrecio: +r.xPrecio.toFixed(2),
  }));
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const totals = {
    kgs: sum('kgs'),
    ventaBruta: +sum('ventaBruta').toFixed(2),
    descuentos: +sum('descuentos').toFixed(2),
    ventaNeta: +sum('ventaNeta').toFixed(2),
    fctsKgs: sum('fctsKgs'),
    varKgs: sum('varKgs'),
    fctsVentas: +sum('fctsVentas').toFixed(2),
    varVentas: +sum('varVentas').toFixed(2),
    xVolumen: +sum('xVolumen').toFixed(2),
    xPrecio: +sum('xPrecio').toFixed(2),
  };
  const impacto = { volumen: totals.xVolumen, precio: totals.xPrecio, neto: totals.varVentas };
  return { period: 'ACUMULADO', rows, totals, impacto };
}

const ALL_PERIODS_WITH_ACUM = [...PERIODS, buildAcumuladoPeriod()];

const csvEscape = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const PERIOD_KEY = 'ventaReal.periodIdx';
const PCTS_KEY = 'ventaReal.pcts.v1';

const readStoredPcts = () => {
  try {
    const raw = window.localStorage.getItem(PCTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};
const persistPcts = (data) => {
  try { window.localStorage.setItem(PCTS_KEY, JSON.stringify(data)); } catch {}
};

const fmtPctSigned = (n) => {
  if (n === 0 || n === null || n === undefined || Number.isNaN(n)) return '0.00%';
  const sign = n > 0 ? '+' : '−';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
};

const readStoredPeriodIdx = () => {
  try {
    const raw = window.localStorage.getItem(PERIOD_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n >= PERIODS.length) return 0;
    return n;
  } catch {
    return 0;
  }
};

export default function VentaReal() {
  const [periodIdx] = useState(readStoredPeriodIdx);
  const [showCompare, setShowCompare] = useState(false);
  const [status, setStatus] = useState(null);
  const [pcts, setPcts] = useState(readStoredPcts);
  const timerRef = useRef(null);

  const flash = (kind, text, ms = 2400) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => {
    if (!showCompare) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowCompare(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCompare]);

  const active = ALL_PERIODS_WITH_ACUM[periodIdx] ?? ALL_PERIODS_WITH_ACUM[0];
  const { rows, totals, impacto, period } = active;

  // Manual % per row+field. Default = calculated % of fctsVentas. User can override.
  const getCalcPct = (row, field) => {
    if (!row.fctsVentas || row.fctsVentas === 0) return 0;
    return (row[field] / row.fctsVentas) * 100;
  };
  const getPct = (productCode, field, calculated) => {
    const stored = pcts?.[periodIdx]?.[productCode]?.[field];
    return stored !== undefined && stored !== null ? stored : calculated;
  };
  const updatePct = (productCode, field, raw) => {
    const num = parseFloat(String(raw).replace(/[^\d.\-]/g, '')) || 0;
    setPcts((prev) => {
      const next = { ...prev };
      if (!next[periodIdx]) next[periodIdx] = {};
      if (!next[periodIdx][productCode]) next[periodIdx][productCode] = {};
      next[periodIdx][productCode] = { ...next[periodIdx][productCode], [field]: num };
      persistPcts(next);
      return next;
    });
  };
  const getTotalCalcPct = (field) => {
    if (!totals.fctsVentas || totals.fctsVentas === 0) return 0;
    return (totals[field] / totals.fctsVentas) * 100;
  };
  const getTotalPct = (field, calculated) => {
    const stored = pcts?.[periodIdx]?.['__TOTAL__']?.[field];
    return stored !== undefined && stored !== null ? stored : calculated;
  };
  const updateTotalPct = (field, raw) => {
    const num = parseFloat(String(raw).replace(/[^\d.\-]/g, '')) || 0;
    setPcts((prev) => {
      const next = { ...prev };
      if (!next[periodIdx]) next[periodIdx] = {};
      if (!next[periodIdx]['__TOTAL__']) next[periodIdx]['__TOTAL__'] = {};
      next[periodIdx]['__TOTAL__'] = { ...next[periodIdx]['__TOTAL__'], [field]: num };
      persistPcts(next);
      return next;
    });
  };

  const handleCompararForecast = () => setShowCompare(true);

  const handleExportar = () => {
    const slug = period.toLowerCase().replace(/\s+/g, '-');
    const header = ['COD','PRODUCTO','KGS','PRECIO','VENTA_BRUTA','DESCUENTOS','VENTA_NETA',
                    'FCTS_KGS','VAR_KGS','FCTS_VENTAS','VAR_VENTAS','X_VOLUMEN','X_PRECIO'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([r.code, r.name, r.kgs, r.precio, r.ventaBruta, r.descuentos, r.ventaNeta,
                  r.fctsKgs, r.varKgs, r.fctsVentas, r.varVentas, r.xVolumen, r.xPrecio]
                  .map(csvEscape).join(','));
    });
    lines.push(['', 'TOTAL', totals.kgs, '', totals.ventaBruta, totals.descuentos, totals.ventaNeta,
                totals.fctsKgs, totals.varKgs, totals.fctsVentas, totals.varVentas, totals.xVolumen, totals.xPrecio]
                .map(csvEscape).join(','));
    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venta-real-${slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash('ok', `Exportado · venta-real-${slug}.csv`);
  };

  return (
    <>
      <PageHeader
        title={`Venta Real · ${period}`}
        subtitle="Real vs Forecast · descomposición de variación por volumen y precio"
        actions={
          <>
            <span className="period-pill">
              <span className="period-pill-label">PERIODO</span>
              <span className="period-pill-value">{period}</span>
            </span>
            <button className="btn" onClick={handleCompararForecast}>Comparar Forecast</button>
            <button className="btn btn-primary" onClick={handleExportar}>Exportar</button>
            {status && (
              <span className={`status-pill dot ${status.kind}`}>{status.text}</span>
            )}
          </>
        }
      />

      <div className="kpi-strip">
        {[
          { label: 'Venta Bruta',     value: `$${fmtMoneyNoDec(totals.ventaBruta)}`, delta: `${fmtUnits(totals.kgs)} KGS`, cls: '' },
          { label: 'Descuentos',      value: `$${fmtMoneyNoDec(totals.descuentos)}`,
            delta: `${(totals.ventaBruta > 0 ? (totals.descuentos / totals.ventaBruta * 100) : 0).toFixed(2)}% s/bruta`,
            cls: '' },
          { label: 'Venta Neta',      value: `$${fmtMoneyNoDec(totals.ventaNeta)}`,
            delta: `vs Fcts ${fmtSignedM(totals.varVentas)}`,
            cls: totals.varVentas < 0 ? 'down' : '' },
          { label: 'Variación · Volumen / vs. PTO 2026', value: fmtSignedM(impacto.volumen), delta: `${fmtMoneySigned(totals.varKgs)} KGS`,
            cls: totals.varKgs < 0 ? 'down' : '',
            valColor: impacto.volumen < 0 ? 'var(--neg)' : undefined },
          { label: 'Variación · Precio / vs. PTO 2026', value: fmtSignedM(impacto.precio), delta: 'Mix de precio · descuentos',
            cls: '',
            valColor: impacto.precio < 0 ? 'var(--neg)' : undefined },
          { label: 'Neto vs Forecast',   value: fmtSignedM(impacto.neto),
            delta: `${(totals.fctsVentas > 0 ? (impacto.neto / totals.fctsVentas * 100) : 0).toFixed(2)}%`,
            cls: impacto.neto < 0 ? 'down' : '',
            valColor: impacto.neto < 0 ? 'var(--neg)' : undefined },
        ].map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={k.valColor ? { color: k.valColor } : {}}>{k.value}</div>
            <div className={`kpi-delta ${k.cls}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <Panel
        title="Valuación de la Venta · Detalle por Producto"
        meta={`${period} · Real vs Forecast`}
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th>COD</th>
              <th style={{ textAlign: 'left' }}>PRODUCTO</th>
              <th>KGS</th>
              <th>PRECIO</th>
              <th>VENTA BRUTA</th>
              <th>DESCUENTOS</th>
              <th>VENTA NETA</th>
              <th className="fcts-col">FCTS KGS</th>
              <th>VAR KGS</th>
              <th className="fcts-col">FCTS VENTAS</th>
              <th>VAR VENTAS</th>
              <th>X VOLUMEN</th>
              <th>X PRECIO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="num">{r.code}</td>
                <td>{r.name}</td>
                <td className="num">{fmtUnits(r.kgs)}</td>
                <td className="num">${fmtMoney(r.precio, 4)}</td>
                <td className="num">${fmtMoneyNoDec(r.ventaBruta)}</td>
                <td className="num" style={{ color: r.descuentos > 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
                  {r.descuentos > 0 ? `$${fmtMoneyNoDec(r.descuentos)}` : '—'}
                </td>
                <td className="num"><b>${fmtMoneyNoDec(r.ventaNeta)}</b></td>
                <td className="num fcts-col">{fmtUnits(r.fctsKgs)}</td>
                <td className="num" style={{ color: r.varKgs > 0 ? 'var(--pos)' : r.varKgs < 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
                  {fmtMoneySigned(r.varKgs)}
                </td>
                <td className="num fcts-col">${fmtMoneyNoDec(r.fctsVentas)}</td>
                <td className="cell-input num">
                  <input
                    type="text"
                    value={fmtPctSigned(getPct(r.code, 'varVentas', getCalcPct(r, 'varVentas')))}
                    onChange={(e) => updatePct(r.code, 'varVentas', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
                <td className="cell-input num">
                  <input
                    type="text"
                    value={fmtPctSigned(getPct(r.code, 'xVolumen', getCalcPct(r, 'xVolumen')))}
                    onChange={(e) => updatePct(r.code, 'xVolumen', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
                <td className="cell-input num">
                  <input
                    type="text"
                    value={fmtPctSigned(getPct(r.code, 'xPrecio', getCalcPct(r, 'xPrecio')))}
                    onChange={(e) => updatePct(r.code, 'xPrecio', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
              </tr>
            ))}
            <tr className="row-total">
              <td className="num"></td>
              <td><b>TOTAL</b></td>
              <td className="num"><b>{fmtUnits(totals.kgs)}</b></td>
              <td className="num"></td>
              <td className="num"><b>${fmtMoneyNoDec(totals.ventaBruta)}</b></td>
              <td className="num"><b>${fmtMoneyNoDec(totals.descuentos)}</b></td>
              <td className="num"><b>${fmtMoneyNoDec(totals.ventaNeta)}</b></td>
              <td className="num fcts-col"><b>{fmtUnits(totals.fctsKgs)}</b></td>
              <td className="num" style={{ color: totals.varKgs >= 0 ? 'var(--pos)' : 'var(--neg)' }}><b>{fmtMoneySigned(totals.varKgs)}</b></td>
              <td className="num fcts-col"><b>${fmtMoneyNoDec(totals.fctsVentas)}</b></td>
              <td className="cell-input num">
                <input
                  type="text"
                  value={fmtPctSigned(getTotalPct('varVentas', getTotalCalcPct('varVentas')))}
                  onChange={(e) => updateTotalPct('varVentas', e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </td>
              <td className="cell-input num">
                <input
                  type="text"
                  value={fmtPctSigned(getTotalPct('xVolumen', getTotalCalcPct('xVolumen')))}
                  onChange={(e) => updateTotalPct('xVolumen', e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </td>
              <td className="cell-input num">
                <input
                  type="text"
                  value={fmtPctSigned(getTotalPct('xPrecio', getTotalCalcPct('xPrecio')))}
                  onChange={(e) => updateTotalPct('xPrecio', e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Descomposición de Variación · Real vs Forecast"
        meta="Suma de impactos por producto"
      >
        <div style={{ padding: 20 }}>
          <div className="process-grid">
            <div className="process-card">
              <div className="process-card-title">Impacto · Volumen</div>
              {rows.map((r) => (
                <div className="process-row" key={`v${r.code}`}>
                  <span className="label">{r.name}</span>
                  <span className="val" style={{ color: r.xVolumen > 0 ? 'var(--pos)' : r.xVolumen < 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
                    {fmtMoneySigned(r.xVolumen)}
                  </span>
                </div>
              ))}
              <div className="process-row"><span className="label">SUBTOTAL</span><span className="val" style={{ color: impacto.volumen >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmtMoneySigned(impacto.volumen)}</span></div>
            </div>
            <div className="process-card cc-conv2">
              <div className="process-card-title">Impacto · Precio</div>
              {rows.map((r) => (
                <div className="process-row" key={`p${r.code}`}>
                  <span className="label">{r.name}</span>
                  <span className="val" style={{ color: r.xPrecio > 0 ? 'var(--pos)' : r.xPrecio < 0 ? 'var(--neg)' : 'var(--ink-mute)' }}>
                    {fmtMoneySigned(r.xPrecio)}
                  </span>
                </div>
              ))}
              <div className="process-row"><span className="label">SUBTOTAL</span><span className="val" style={{ color: impacto.precio >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmtMoneySigned(impacto.precio)}</span></div>
            </div>
            <div className="process-card cc-total">
              <div className="process-card-title">Neto vs Forecast</div>
              <div className="process-row"><span className="label">Volumen</span><span className="val" style={{ color: impacto.volumen >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmtMoneySigned(impacto.volumen)}</span></div>
              <div className="process-row"><span className="label">Precio</span><span className="val" style={{ color: impacto.precio >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmtMoneySigned(impacto.precio)}</span></div>
              <div className="process-row"><span className="label">TOTAL</span><span className="val" style={{ color: impacto.neto >= 0 ? 'var(--pos)' : 'var(--neg)' }}><b>{fmtMoneySigned(impacto.neto)}</b></span></div>
            </div>
          </div>
        </div>
      </Panel>

      <AIAnalysis data={active} />

      {showCompare && <CompareForecastModal data={active} onClose={() => setShowCompare(false)} />}
    </>
  );
}

function CompareForecastModal({ data, onClose }) {
  const { rows, totals, period } = data;
  const cls = (n) => n > 0 ? 'var-pos' : n < 0 ? 'var-neg' : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(960px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3>Comparar Real vs Forecast</h3>
            <span className="modal-tag" style={{ color: 'var(--ink-soft)' }}>{period}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
            color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 8,
          }}>Volumen · Kilogramos</div>
          <table>
            <thead>
              <tr>
                <th>Cód.</th>
                <th>Producto</th>
                <th>Forecast</th>
                <th>Real</th>
                <th>Var.</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.fctsKgs ? (r.varKgs / r.fctsKgs) * 100 : 0;
                return (
                  <tr key={r.code}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{fmtUnits(r.fctsKgs)}</td>
                    <td>{fmtUnits(r.kgs)}</td>
                    <td className={cls(r.varKgs)}>{fmtMoneySigned(r.varKgs)}</td>
                    <td className={cls(r.varKgs)}>{pct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOTAL</td>
                <td>{fmtUnits(totals.fctsKgs)}</td>
                <td>{fmtUnits(totals.kgs)}</td>
                <td className={cls(totals.varKgs)}>{fmtMoneySigned(totals.varKgs)}</td>
                <td className={cls(totals.varKgs)}>
                  {totals.fctsKgs ? ((totals.varKgs / totals.fctsKgs) * 100).toFixed(2) : '0.00'}%
                </td>
              </tr>
            </tfoot>
          </table>

          <div style={{
            fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
            color: 'var(--ink-mute)', textTransform: 'uppercase', margin: '20px 0 8px',
          }}>Ventas · MXN</div>
          <table>
            <thead>
              <tr>
                <th>Cód.</th>
                <th>Producto</th>
                <th>Forecast</th>
                <th>Real (Neta)</th>
                <th>Var.</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.fctsVentas ? (r.varVentas / r.fctsVentas) * 100 : 0;
                return (
                  <tr key={r.code}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>${fmtMoneyNoDec(r.fctsVentas)}</td>
                    <td>${fmtMoneyNoDec(r.ventaNeta)}</td>
                    <td className={cls(r.varVentas)}>${fmtMoneySigned(r.varVentas)}</td>
                    <td className={cls(r.varVentas)}>{pct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOTAL</td>
                <td>${fmtMoneyNoDec(totals.fctsVentas)}</td>
                <td>${fmtMoneyNoDec(totals.ventaNeta)}</td>
                <td className={cls(totals.varVentas)}>${fmtMoneySigned(totals.varVentas)}</td>
                <td className={cls(totals.varVentas)}>
                  {totals.fctsVentas ? ((totals.varVentas / totals.fctsVentas) * 100).toFixed(2) : '0.00'}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildAnalysis({ rows, totals, impacto, period }) {
  const sortedByNet = [...rows].sort((a, b) => a.varVentas - b.varVentas);
  const worst = sortedByNet[0];
  const best = sortedByNet[sortedByNet.length - 1];

  const absVol = Math.abs(impacto.volumen);
  const absPrice = Math.abs(impacto.precio);
  const totalAbs = absVol + absPrice || 1;
  const volWeight = absVol / totalAbs;
  const driver = volWeight > 0.65 ? 'volumen' : volWeight < 0.35 ? 'precio' : 'mixto';

  const netPct = totals.fctsVentas > 0 ? (impacto.neto / totals.fctsVentas) * 100 : 0;
  const priceErosionPct = totals.ventaBruta > 0 ? (totals.descuentos / totals.ventaBruta) * 100 : 0;
  const productWithDiscount = rows.find((r) => r.descuentos > 0);

  const diagnostico = [];
  diagnostico.push(
    `El cierre de ${period} arroja una desviación neta de ${fmtSignedM(impacto.neto)} contra forecast (${netPct >= 0 ? '+' : ''}${netPct.toFixed(2)}%).`
  );
  if (driver === 'volumen') {
    diagnostico.push(
      `El driver dominante es VOLUMEN (${(volWeight * 100).toFixed(0)}% del peso de variación): ${fmtSignedM(impacto.volumen)} vs ${fmtSignedM(impacto.precio)} de precio.`
    );
  } else if (driver === 'precio') {
    diagnostico.push(
      `El driver dominante es PRECIO (${((1 - volWeight) * 100).toFixed(0)}% del peso de variación): ${fmtSignedM(impacto.precio)} vs ${fmtSignedM(impacto.volumen)} de volumen.`
    );
  } else {
    diagnostico.push(
      `Variación equilibrada entre volumen (${fmtSignedM(impacto.volumen)}) y precio (${fmtSignedM(impacto.precio)}).`
    );
  }
  if (worst.varVentas < 0 && impacto.neto !== 0) {
    const concPct = Math.abs((worst.varVentas / impacto.neto) * 100);
    diagnostico.push(
      `${worst.name} concentra ${concPct.toFixed(0)}% del faltante (${fmtSignedM(worst.varVentas)}); ${best.name} compensa parcialmente con ${fmtSignedM(best.varVentas)}.`
    );
  }
  if (priceErosionPct > 0.5 && productWithDiscount) {
    diagnostico.push(
      `Disciplina de precio bajo presión: descuentos ${priceErosionPct.toFixed(2)}% sobre venta bruta, concentrados en ${productWithDiscount.name}.`
    );
  }

  const riesgos = [];
  const fctsRatio = totals.fctsVentas > 0 ? worst.fctsVentas / totals.fctsVentas : 0;
  if (worst.varVentas < 0 && fctsRatio > 0.25) {
    riesgos.push({
      sev: 'alto',
      title: `Concentración de ingresos en ${worst.name}`,
      detail: `Representa ${(fctsRatio * 100).toFixed(0)}% del forecast y aporta ${fmtSignedM(worst.varVentas)} este mes. Si el patrón se sostuviera 12 meses: ${fmtSignedM(worst.varVentas * 12)} de ingresos comprometidos.`,
    });
  }
  if (priceErosionPct > 0.5 && productWithDiscount) {
    riesgos.push({
      sev: priceErosionPct > 1.5 ? 'alto' : 'medio',
      title: 'Erosión sostenida de precio',
      detail: `Descuentos en ${productWithDiscount.name} con tasa ${priceErosionPct.toFixed(2)}% s/bruta. Anualizado: ${fmtSignedM(-totals.descuentos * 12)} en venta neta.`,
    });
  }
  rows
    .filter((r) => r.varKgs > 0 && r.fctsKgs > 0 && r.varKgs / r.fctsKgs > 0.2)
    .forEach((r) => {
      riesgos.push({
        sev: 'medio',
        title: `Sobrecumplimiento en ${r.name}`,
        detail: `+${fmtUnits(r.varKgs)} KGS (${((r.varKgs / r.fctsKgs) * 100).toFixed(0)}% sobre forecast). Validar capacidad en CC100/110/120, abasto de MP y cobertura de mano de obra.`,
      });
    });
  rows
    .filter((r) => r.varKgs < 0 && r.fctsKgs > 0 && r.varKgs / r.fctsKgs < -0.2)
    .forEach((r) => {
      riesgos.push({
        sev: 'alto',
        title: `Caída de demanda en ${r.name}`,
        detail: `${fmtMoneySigned(r.varKgs)} KGS (${((r.varKgs / r.fctsKgs) * 100).toFixed(0)}%). Investigar causa raíz: pérdida de cuenta, calidad, competencia o estacionalidad atípica.`,
      });
    });
  const totalKgsErr = totals.fctsKgs > 0 ? Math.abs(totals.varKgs / totals.fctsKgs) : 0;
  if (totalKgsErr > 0.05) {
    riesgos.push({
      sev: totalKgsErr > 0.1 ? 'medio' : 'bajo',
      title: 'Precisión de planeación comercial',
      detail: `Desviación absoluta total ${(totalKgsErr * 100).toFixed(1)}% en KGS. Revisar metodología S&OP y ciclo de actualización de forecast.`,
    });
  }
  if (riesgos.length === 0) {
    riesgos.push({
      sev: 'bajo',
      title: 'Operación dentro de tolerancia',
      detail: 'No se detectan desviaciones materiales en este corte. Mantener monitoreo de drivers para anticipar cambios en próximos cierres.',
    });
  }

  const acciones = [];
  if (worst.varVentas < 0) {
    acciones.push(
      `COMERCIAL · Diagnóstico de ${worst.name}: revisión de pipeline, churn de cuentas clave y share regional. Plan de recuperación a 30 días con dueño asignado.`
    );
  }
  if (priceErosionPct > 0.5 && productWithDiscount) {
    acciones.push(
      `PRECIO · Auditoría de descuentos en ${productWithDiscount.name}: matriz precio-volumen, niveles de autorización y vigencias. Definir piso de margen.`
    );
  }
  rows
    .filter((r) => r.varKgs > 0 && r.fctsKgs > 0 && r.varKgs / r.fctsKgs > 0.2)
    .forEach((r) => {
      acciones.push(
        `OPERACIONES · Capacidad para ${r.name}: replanificar minutos productivos y abasto de MP para sostener +${((r.varKgs / r.fctsKgs) * 100).toFixed(0)}% sin comprometer estándar.`
      );
    });
  acciones.push(
    `PLANEACIÓN · Actualizar rolling forecast con datos de ${period}; cerrar gap entre comercial y operaciones en próximo ciclo S&OP.`
  );

  return { diagnostico, riesgos, acciones };
}

function fmtStamp(d) {
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function AIAnalysis({ data }) {
  const [generated, setGenerated] = useState(() => ({
    period: data.period,
    stamp: fmtStamp(new Date()),
    analysis: buildAnalysis(data),
  }));
  const [generating, setGenerating] = useState(false);

  const stale = generated.period !== data.period;

  const handleGenerate = () => {
    if (generating) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerated({
        period: data.period,
        stamp: fmtStamp(new Date()),
        analysis: buildAnalysis(data),
      });
      setGenerating(false);
    }, 500);
  };

  const { diagnostico, riesgos, acciones } = generated.analysis;

  return (
    <Panel
      title="Análisis"
      meta={`Generado · ${generated.stamp}${stale ? ' · datos previos' : ''}`}
      actions={
        <button className="btn-ai" onClick={handleGenerate} disabled={generating}>
          <span className="ai-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6L12 3z" />
              <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
            </svg>
          </span>
          {generating ? 'Generando…' : 'Generar Análisis'}
        </button>
      }
    >
      <div className="ai-block">
        <div className="ai-banner">
          <span className="ai-badge">GEN</span>
          <span>
            Síntesis automática a partir de los datos de <b>{generated.period}</b>. Las recomendaciones son orientativas y deben validarse con el equipo responsable antes de ejecutarlas.
          </span>
        </div>

        <section className="ai-section">
          <header className="ai-tag">DIAGNÓSTICO</header>
          <div className="ai-prose">
            {diagnostico.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>

        <section className="ai-section">
          <header className="ai-tag ai-tag-risk">ANÁLISIS DE RIESGOS</header>
          <ul className="ai-risks">
            {riesgos.map((r, i) => (
              <li key={i} className={`ai-risk ai-risk-${r.sev}`}>
                <span className={`ai-sev ai-sev-${r.sev}`}>{r.sev.toUpperCase()}</span>
                <div>
                  <strong>{r.title}.</strong> <span className="ai-risk-detail">{r.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="ai-section">
          <header className="ai-tag ai-tag-action">ACCIONES SUGERIDAS</header>
          <ol className="ai-actions">
            {acciones.map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </section>
      </div>
    </Panel>
  );
}
