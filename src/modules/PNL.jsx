import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { PNL, MONTHS, VENTA_REAL } from '../data/seed';
import { fmtMoneyNoDec, fmtMoneySigned, fmtPct } from '../utils/format';

const sum = (arr) => arr.reduce((s, n) => s + n, 0);
const compactM = (n) => `$${(n / 1_000_000).toFixed(1)}M`;

const csvEscape = (val) => {
  const s = String(val ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const PNL_ROWS = [
  { key: 'ventas',        label: 'Ventas',                section: 'INGRESOS' },
  { key: 'costoStd',      label: 'Costo Std de Ventas',   section: 'COSTO DE VENTAS' },
  { key: 'variaciones',   label: '(+/−) Variaciones',     signed: true },
  { key: 'totalCosto',    label: 'Total Costo',           subtotal: true },
  { key: 'utBruta',       label: 'Utilidad Bruta',        section: 'RESULTADO OPERATIVO', subtotal: true, positive: true },
  { key: 'margenBruto',   label: '% Margen Bruto',        pct: true },
  { key: 'gtosOperacion', label: 'Gastos de Operación' },
  { key: 'utOperacion',   label: 'UTILIDAD OPERACIÓN',    final: true },
  { key: 'margenOp',      label: '% Utilidad Op.',        pct: true },
];

export default function PNLView() {
  const [showCompare, setShowCompare] = useState(false);
  const [view, setView] = useState('mensual');
  const [exportFlash, setExportFlash] = useState(false);

  const totalVentas = sum(PNL.ventas);
  const totalCosto  = sum(PNL.totalCosto);
  const totalUB     = sum(PNL.utBruta);
  const totalGtos   = sum(PNL.gtosOperacion);
  const totalUO     = sum(PNL.utOperacion);

  const totalsByKey = {
    ventas:        totalVentas,
    costoStd:      sum(PNL.costoStd),
    variaciones:   sum(PNL.variaciones),
    totalCosto,
    utBruta:       totalUB,
    margenBruto:   totalUB / totalVentas,
    gtosOperacion: totalGtos,
    utOperacion:   totalUO,
    margenOp:      totalUO / totalVentas,
  };

  const isAnual = view === 'anual';
  const visibleMonths = isAnual ? [] : MONTHS;

  const exportPNL = () => {
    const header = ['CONCEPTO', ...MONTHS, 'TOTAL'];
    const lines = [header.map(csvEscape).join(',')];
    PNL_ROWS.forEach((row) => {
      const arr = PNL[row.key];
      const values = arr.map((v) => row.pct ? (v * 100).toFixed(2) + '%' : v);
      const total = row.pct ? (totalsByKey[row.key] * 100).toFixed(2) + '%' : totalsByKey[row.key];
      lines.push([row.label, ...values, total].map(csvEscape).join(','));
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(lines.join('\n'), `pnl-forecast-${stamp}.csv`, 'text/csv;charset=utf-8');
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 1500);
  };

  return (
    <>
      <PageHeader
        title="Estado de Resultados · Forecast 2026"
        subtitle={
          isAnual
            ? 'Vista anual · Totales 12 meses · Costo de ventas estándar + Variaciones'
            : 'Vista mensual · Costo de ventas estándar + Variaciones · Cierre de utilidad'
        }
        actions={
          <>
            <button className="btn" onClick={() => setShowCompare(true)}>Comparar Real</button>
            <button className="btn" onClick={() => setView(isAnual ? 'mensual' : 'anual')}>
              {isAnual ? '✓ Anual · Ver Mensual' : 'Mensual / Anual'}
            </button>
            <button className="btn btn-primary" onClick={exportPNL}>
              {exportFlash ? '✓ CSV Descargado' : 'Exportar P&L'}
            </button>
          </>
        }
      />

      <Panel
        title={isAnual ? 'P&L Forecast · Resumen Anual' : 'P&L Forecast Mensualizado'}
        meta={
          <>
            Cifras en MXN · Margen anual:{' '}
            <strong style={{ color: 'var(--pos)' }}>
              {fmtPct(totalUB / totalVentas)} UB · {fmtPct(totalUO / totalVentas)} UO
            </strong>
          </>
        }
        scrollX
      >
        <table className="pnl-table">
          <thead>
            <tr>
              <th className="label" style={{ textAlign: 'left' }}>CONCEPTO</th>
              {visibleMonths.map((m) => <th key={m}>{m}</th>)}
              <th style={{ background: '#0a0a0a', color: '#fff' }}>{isAnual ? 'TOTAL ANUAL' : 'TOTAL'}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section"><td colSpan={visibleMonths.length + 2}>INGRESOS</td></tr>
            <tr>
              <td className="label">Ventas</td>
              {!isAnual && PNL.ventas.map((v, i) => <td key={i}>{fmtMoneyNoDec(v)}</td>)}
              <td><b>{fmtMoneyNoDec(totalVentas)}</b></td>
            </tr>

            <tr className="section"><td colSpan={visibleMonths.length + 2}>COSTO DE VENTAS</td></tr>
            <tr>
              <td className="label">Costo Std de Ventas</td>
              {!isAnual && PNL.costoStd.map((v, i) => <td key={i}>{fmtMoneyNoDec(v)}</td>)}
              <td><b>{fmtMoneyNoDec(totalsByKey.costoStd)}</b></td>
            </tr>
            <tr>
              <td className="label">(+/−) Variaciones</td>
              {!isAnual && PNL.variaciones.map((v, i) => (
                <td key={i} className={v > 0 ? 'neg-num' : v < 0 ? 'pos-num' : ''}>
                  {fmtMoneySigned(v)}
                </td>
              ))}
              <td><b>{fmtMoneySigned(totalsByKey.variaciones)}</b></td>
            </tr>
            <tr className="subtotal">
              <td className="label">Total Costo</td>
              {!isAnual && PNL.totalCosto.map((v, i) => <td key={i}>{fmtMoneyNoDec(v)}</td>)}
              <td><b>{fmtMoneyNoDec(totalCosto)}</b></td>
            </tr>

            <tr className="section"><td colSpan={visibleMonths.length + 2}>RESULTADO OPERATIVO</td></tr>
            <tr className="subtotal">
              <td className="label">Utilidad Bruta</td>
              {!isAnual && PNL.utBruta.map((v, i) => (
                <td key={i} className="pos-num">{fmtMoneyNoDec(v)}</td>
              ))}
              <td className="pos-num"><b>{fmtMoneyNoDec(totalUB)}</b></td>
            </tr>
            <tr>
              <td className="label">% Margen Bruto</td>
              {!isAnual && PNL.margenBruto.map((v, i) => <td key={i}>{fmtPct(v)}</td>)}
              <td><b>{fmtPct(totalUB / totalVentas)}</b></td>
            </tr>
            <tr>
              <td className="label">Gastos de Operación</td>
              {!isAnual && PNL.gtosOperacion.map((v, i) => <td key={i}>{fmtMoneyNoDec(v)}</td>)}
              <td><b>{fmtMoneyNoDec(totalGtos)}</b></td>
            </tr>
            <tr className="final">
              <td className="label">UTILIDAD OPERACIÓN</td>
              {!isAnual && PNL.utOperacion.map((v, i) => <td key={i}>{fmtMoneyNoDec(v)}</td>)}
              <td><b>{fmtMoneyNoDec(totalUO)}</b></td>
            </tr>
            <tr>
              <td className="label">% Utilidad Op.</td>
              {!isAnual && PNL.margenOp.map((v, i) => <td key={i}>{fmtPct(v)}</td>)}
              <td><b>{fmtPct(totalUO / totalVentas)}</b></td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <div className="grid-3" style={{ marginTop: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Ventas Totales</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-3)' }}>{compactM(totalVentas)}</div>
          <div className="stat-card-foot">12 meses · Pico {MONTHS[PNL.ventas.indexOf(Math.max(...PNL.ventas))]} {compactM(Math.max(...PNL.ventas))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Utilidad Bruta</div>
          <div className="stat-card-value" style={{ color: 'var(--pos)' }}>{compactM(totalUB)}</div>
          <div className="stat-card-foot">{fmtPct(totalUB / totalVentas)} · Sobre venta neta</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Utilidad Operación</div>
          <div className="stat-card-value" style={{ color: 'var(--gold)' }}>{compactM(totalUO)}</div>
          <div className="stat-card-foot">{fmtPct(totalUO / totalVentas)} · Antes de financieros e ISR</div>
        </div>
      </div>

      {showCompare && (() => {
        const ventasFcst = PNL.ventas[0];
        const ventasReal = VENTA_REAL.totals.ventaNeta;
        const varVentas = ventasReal - ventasFcst;
        const ventasPct = varVentas / ventasFcst;

        const rows = [
          { label: 'Ventas Netas',       fcst: ventasFcst,             real: ventasReal,                 better: 'up' },
          { label: 'Volumen (Kgs)',      fcst: VENTA_REAL.totals.fctsKgs, real: VENTA_REAL.totals.kgs,    better: 'up', isInt: true },
          { label: 'Impacto Volumen',    fcst: 0, real: VENTA_REAL.impacto.volumen, better: 'up' },
          { label: 'Impacto Precio',     fcst: 0, real: VENTA_REAL.impacto.precio,  better: 'up' },
          { label: 'Impacto Neto Venta', fcst: 0, real: VENTA_REAL.impacto.neto,    better: 'up', strong: true },
        ];

        return (
          <div className="modal-overlay" onClick={() => setShowCompare(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Forecast vs Real · {VENTA_REAL.period}</h3>
                <span className={`modal-tag ${varVentas >= 0 ? 'favorable' : 'desfavorable'}`}>
                  {varVentas >= 0 ? 'FAVORABLE' : 'DESFAVORABLE'}
                </span>
                <button className="modal-close" onClick={() => setShowCompare(false)}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0 }}>
                  Comparativo de cifras de venta del mes contra el forecast del P&L.
                  Solo está disponible Real para <strong>{VENTA_REAL.period}</strong>;
                  los meses siguientes permanecen en modo forecast hasta su cierre.
                </p>

                <table>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th className="num">Forecast {MONTHS[0]}</th>
                      <th className="num">Real {MONTHS[0]}</th>
                      <th className="num">Variación $</th>
                      <th className="num">Variación %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const diff = r.real - r.fcst;
                      const pct = r.fcst !== 0 ? diff / Math.abs(r.fcst) : null;
                      const favorable = r.better === 'up' ? diff >= 0 : diff <= 0;
                      const fmt = r.isInt
                        ? (n) => Math.round(n).toLocaleString('es-MX')
                        : fmtMoneyNoDec;
                      return (
                        <tr key={r.label} style={{ fontWeight: r.strong ? 600 : 400, color: r.strong ? 'var(--ink)' : undefined }}>
                          <td>{r.label}</td>
                          <td className="num">{fmt(r.fcst)}</td>
                          <td className="num">{fmt(r.real)}</td>
                          <td className="num" style={{ color: favorable ? 'var(--pos)' : 'var(--neg)' }}>
                            {diff >= 0 ? '+' : ''}{fmt(diff)}
                          </td>
                          <td className="num" style={{ color: favorable ? 'var(--pos)' : 'var(--neg)' }}>
                            {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(1)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{
                  marginTop: 16,
                  padding: 12,
                  border: '1px solid var(--line)',
                  background: 'var(--panel-alt, #f6f3ea)',
                  fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Conclusión · {MONTHS[0]} 2026
                  </div>
                  <div>
                    Ventas reales <strong style={{ color: ventasPct >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                      {ventasPct >= 0 ? '+' : ''}{(ventasPct * 100).toFixed(1)}%
                    </strong> vs forecast
                    ({fmtMoneySigned(varVentas)}). Atribuible a:
                    Volumen <strong>{fmtMoneySigned(VENTA_REAL.impacto.volumen)}</strong> ·
                    Precio <strong>{fmtMoneySigned(VENTA_REAL.impacto.precio)}</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn" onClick={() => setShowCompare(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
