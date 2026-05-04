import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { TrendChart, VarianceBars, ChartLegend } from '../components/Charts';
import { RATES_BY_CC, RATES_TOTAL, PNL, VARIATIONS } from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtMoneySigned } from '../utils/format';

export default function Dashboard() {
  const [status, setStatus] = useState(null);     // { kind, text }
  const [busy, setBusy] = useState(false);
  const [varSide, setVarSide] = useState(null);   // 'favorable' | 'desfavorable' | null
  const timerRef = useRef(null);

  useEffect(() => {
    if (!varSide) return;
    const onKey = (e) => { if (e.key === 'Escape') setVarSide(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [varSide]);

  const flash = (kind, text, ms = 2800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleExportPdf = () => {
    flash('busy', 'Abriendo cuadro de impresión… elige "Guardar como PDF"', 2200);
    setTimeout(() => window.print(), 200);
  };

  const handleRecalcular = () => {
    if (busy) return;
    const ok = window.confirm(
      'Esto restablecerá toda la información capturada en todos los módulos a los valores originales. ¿Continuar?'
    );
    if (!ok) return;
    setBusy(true);
    flash('busy', 'Restableciendo información…', 4000);
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <>
      <PageHeader
        title="Cost Intelligence Dashboard"
        subtitle="Visión integral · Forecast vs Real · Ejercicio 2026"
        actions={
          <>
            <button className="btn" onClick={handleExportPdf} disabled={busy}>Exportar PDF</button>
            <button className="btn btn-primary" onClick={handleRecalcular} disabled={busy}>
              {busy ? 'Restableciendo…' : 'Recalcular'}
            </button>
            {status && (
              <span className={`status-pill dot ${status.kind}`}>{status.text}</span>
            )}
          </>
        }
      />

      <div className="kpi-strip">
        {[
          { label: 'Ventas YTD',         value: '$333.5M', delta: '▲ 4.2% vs PY', cls: 'up'   },
          { label: 'Costo de Ventas',    value: '$238.2M', delta: '▲ 3.8% vs PY', cls: 'down' },
          { label: 'Margen Bruto',       value: '28.6%',   delta: '▲ 40 bps',     cls: 'up'   },
          { label: 'Util. Operación',    value: '$66.7M',  delta: '20.0%',        cls: 'up'   },
          { label: 'Cuota Global / Min', value: '$1.509',  delta: '14.0M min/año', cls: ''    },
          { label: 'Variación MP',       value: '+$348K',  delta: 'Materia Prima A', cls: 'down', valColor: 'var(--neg)' },
        ].map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={k.valColor ? { color: k.valColor } : {}}>{k.value}</div>
            <div className={`kpi-delta ${k.cls}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <Panel
          title="Estructura del Costo Estándar · 2026"
          meta="$238,204,318 · 100%"
        >
          <div style={{ padding: '18px 20px' }}>
            {[
              { id: '01', name: 'MATERIA PRIMA',         val: '$231,517,015', pct: '97.19%', w: 97.2,  color: 'var(--accent-3)' },
              { id: '02', name: 'MANO DE OBRA DIRECTA',  val: '$3,201,806',   pct: '1.34%',  w: 1.34,  color: 'var(--accent)'   },
              { id: '03', name: 'GASTOS VARIABLES',      val: '$1,082,400',   pct: '0.45%',  w: 0.45,  color: 'var(--gold)'     },
              { id: '04', name: 'GASTOS FIJOS',          val: '$2,403,097',   pct: '1.01%',  w: 1.01,  color: 'var(--accent-2)' },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: "'IBM Plex Mono'", fontSize: 11, marginBottom: 5,
                }}>
                  <span><span style={{ color: 'var(--ink-mute)' }}>[{r.id}]</span> &nbsp; {r.name}</span>
                  <span><b>{r.val}</b> &nbsp; <span style={{ color: 'var(--ink-mute)' }}>{r.pct}</span></span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${r.w}%`, background: r.color }}></div>
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 24, paddingTop: 16,
              borderTop: '1px solid var(--line)',
              fontFamily: "'IBM Plex Serif'", fontSize: 13,
              color: 'var(--ink-soft)', fontStyle: 'italic',
            }}>
              <strong style={{
                color: 'var(--accent)', fontStyle: 'normal',
                fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
              }}>DIAGNÓSTICO</strong>
              &nbsp; La rentabilidad de esta operación se decide en compras y consumos de MP. El 97% del costo está ahí.
            </div>
          </div>
        </Panel>

        <div>
          <div className="stat-card" style={{ marginBottom: 18 }}>
            <div className="stat-card-label">Margen Bruto Anual</div>
            <div className="stat-card-value" style={{ color: 'var(--pos)' }}>$95.28M</div>
            <div className="stat-card-foot">28.57% de las ventas · Forecast 2026</div>
          </div>
          <div className="stat-card" style={{ marginBottom: 18 }}>
            <div className="stat-card-label">Productos Activos</div>
            <div className="stat-card-value">3</div>
            <div className="stat-card-foot">A · B · C &nbsp;|&nbsp; 10 SKU de MP &nbsp;|&nbsp; 3 Centros de Conv.</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Min. Productivos / Año</div>
            <div className="stat-card-value">14.03M</div>
            <div className="stat-card-foot">CC100: 4.4M · CC110: 6.1M · CC120: 3.5M</div>
          </div>
        </div>
      </div>

      <Panel
        title="Cuotas por Centro de Costo · Costo / Minuto Productivo"
        meta="Base: gasto anual ÷ minutos productivos disponibles"
      >
        <div style={{ padding: 20 }}>
          <div className="process-grid">
            {RATES_BY_CC.map((cc, i) => (
              <div key={cc.cc} className={`process-card${i === 1 ? ' cc-conv2' : i === 2 ? ' cc-conv3' : ''}`}>
                <div className="process-card-title">CC{cc.cc} · CONVERSIÓN {i + 1}</div>
                <div className="process-row"><span className="label">Mano de Obra</span><span className="val">${fmtMoney(cc.modRate, 4)}</span></div>
                <div className="process-row"><span className="label">Gastos Variables</span><span className="val">${fmtMoney(cc.gvRate, 4)}</span></div>
                <div className="process-row"><span className="label">Gastos Fijos</span><span className="val">${fmtMoney(cc.gfRate, 4)}</span></div>
                <div className="process-row"><span className="label">TOTAL / MIN</span><span className="val" style={{ color: cc.accent }}>${fmtMoney(cc.totalRate, 4)}</span></div>
              </div>
            ))}
            <div className="process-card cc-total">
              <div className="process-card-title">CONSOLIDADO PLANTA</div>
              <div className="process-row"><span className="label">Mano de Obra</span><span className="val">${fmtMoney(RATES_TOTAL.modRate, 4)}</span></div>
              <div className="process-row"><span className="label">Gastos Variables</span><span className="val">${fmtMoney(RATES_TOTAL.gvRate, 4)}</span></div>
              <div className="process-row"><span className="label">Gastos Fijos</span><span className="val">${fmtMoney(RATES_TOTAL.gfRate, 4)}</span></div>
              <div className="process-row"><span className="label">TOTAL / MIN</span><span className="val" style={{ color: 'var(--ink)' }}>${fmtMoney(RATES_TOTAL.totalRate, 4)}</span></div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Desempeño Mensual · Ventas vs Costo Total"
        meta="Forecast 2026 · cifras en MXN"
      >
        <div style={{ padding: '14px 20px 18px' }}>
          <TrendChart ventas={PNL.ventas} costo={PNL.totalCosto} />
          <ChartLegend items={[
            { label: 'Ventas',       color: 'var(--accent-3)' },
            { label: 'Costo Total',  color: 'var(--accent)'   },
          ]} />
        </div>
      </Panel>

      <Panel
        title="Variaciones de Materia Prima · YTD"
        meta="Real vs Estándar · efecto sobre costo"
      >
        <div style={{ padding: '6px 18px 14px' }}>
          <VarianceBars data={VARIATIONS} width={1180} onSelect={setVarSide} />
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

      {varSide && (
        <VariationModal side={varSide} onClose={() => setVarSide(null)} />
      )}
    </>
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
