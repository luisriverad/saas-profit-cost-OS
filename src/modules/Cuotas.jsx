import { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { RATES_BY_CC } from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtUnits } from '../utils/format';

const FIELD_LABEL = { fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' };

const buildInitial = () =>
  RATES_BY_CC.map((r) => ({
    cc: r.cc,
    name: r.name,
    accent: r.accent,
    mod: r.mod,
    gv: r.gv,
    gf: r.gf,
    minutes: r.minutes,
  }));

const deriveCC = (row) => {
  const total = row.mod + row.gv + row.gf;
  const safeMin = row.minutes > 0 ? row.minutes : 1;
  return {
    ...row,
    total,
    modRate: row.mod / safeMin,
    gvRate: row.gv / safeMin,
    gfRate: row.gf / safeMin,
    totalRate: total / safeMin,
  };
};

const deriveConsolidated = (rows) => {
  const sum = rows.reduce(
    (acc, r) => ({
      mod: acc.mod + r.mod,
      gv: acc.gv + r.gv,
      gf: acc.gf + r.gf,
      minutes: acc.minutes + r.minutes,
    }),
    { mod: 0, gv: 0, gf: 0, minutes: 0 },
  );
  return deriveCC({ ...sum, accent: 'var(--ink)' });
};

function CCRateTable({ cc, editable, onChange }) {
  const cellInput = (val, field) => (
    <input
      type="text"
      inputMode="numeric"
      value={fmtMoneyNoDec(val ?? 0)}
      onChange={(e) => onChange(field, e.target.value.replace(/[^0-9.\-]/g, ''))}
      onFocus={(e) => e.target.select()}
      style={{
        background: 'transparent',
        border: 'none',
        width: '100%',
        font: 'inherit',
        color: 'inherit',
        textAlign: 'right',
        outline: 'none',
        padding: 0,
      }}
    />
  );

  return (
    <table className="cost-table">
      <thead>
        <tr>
          <th></th>
          <th className="num">MANO OBRA</th>
          <th className="num">GTOS VAR</th>
          <th className="num">GTOS FIJOS</th>
          <th className="num" style={{ background: '#0a0a0a', color: '#fff' }}>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>Gasto Anual</b></td>
          <td className={editable ? 'cell-input num' : 'cell-formula num'}>
            {editable ? cellInput(cc.mod, 'mod') : <>${fmtMoneyNoDec(cc.mod)}</>}
          </td>
          <td className={editable ? 'cell-input num' : 'cell-formula num'}>
            {editable ? cellInput(cc.gv, 'gv') : <>${fmtMoneyNoDec(cc.gv)}</>}
          </td>
          <td className={editable ? 'cell-input num' : 'cell-formula num'}>
            {editable ? cellInput(cc.gf, 'gf') : <>${fmtMoneyNoDec(cc.gf)}</>}
          </td>
          <td className="cell-formula num"><b>${fmtMoneyNoDec(cc.total)}</b></td>
        </tr>
        <tr>
          <td><b>Min. Producción</b></td>
          <td className={editable ? 'cell-input num' : 'cell-formula num'}>
            {editable ? cellInput(cc.minutes, 'minutes') : fmtUnits(cc.minutes)}
          </td>
          <td className="cell-formula num">{fmtUnits(cc.minutes)}</td>
          <td className="cell-formula num">{fmtUnits(cc.minutes)}</td>
          <td className="cell-formula num"><b>{fmtUnits(cc.minutes)}</b></td>
        </tr>
        <tr className="row-total">
          <td>Costo / Minuto</td>
          <td className="num">${fmtMoney(cc.modRate, 4)}</td>
          <td className="num">${fmtMoney(cc.gvRate, 4)}</td>
          <td className="num">${fmtMoney(cc.gfRate, 4)}</td>
          <td className="num" style={{ color: cc.accent || 'var(--ink)', fontSize: 13 }}>
            ${fmtMoney(cc.totalRate, 4)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default function Cuotas() {
  const [rows, setRows] = useState(buildInitial);
  const [showTraza, setShowTraza] = useState(false);
  const [recalcFlash, setRecalcFlash] = useState(false);
  const [lastRecalc, setLastRecalc] = useState(null);

  const derivedRows = useMemo(() => rows.map(deriveCC), [rows]);
  const consolidated = useMemo(() => deriveConsolidated(rows), [rows]);

  const updateField = (idx, field, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setRows((list) => list.map((r, i) => (i === idx ? { ...r, [field]: num } : r)));
  };

  const recalc = () => {
    setRows((list) => list.map((r) => ({ ...r })));
    setLastRecalc(new Date());
    setRecalcFlash(true);
    setTimeout(() => setRecalcFlash(false), 1500);
  };

  return (
    <>
      <PageHeader
        title="Cuotas por Minuto · Cálculo Automático"
        subtitle={
          lastRecalc
            ? `Gasto anual ÷ Minutos productivos = Costo/Min · Último recálculo: ${lastRecalc.toLocaleTimeString('es-MX')}`
            : 'Gasto anual del CC ÷ Minutos productivos disponibles = Costo / Minuto'
        }
        actions={
          <>
            <button className="btn" onClick={() => setShowTraza(true)}>Ver Trazabilidad</button>
            <button className="btn btn-primary" onClick={recalc}>
              {recalcFlash ? '✓ Cuotas Recalculadas' : 'Recalcular Cuotas'}
            </button>
          </>
        }
      />

      {derivedRows.map((cc, i) => (
        <Panel
          key={cc.cc}
          title={`CC${cc.cc} · ${cc.name}`}
          meta={
            <>
              Cuota total:{' '}
              <strong style={{ color: cc.accent }}>
                ${fmtMoney(cc.totalRate, 4)} / min
              </strong>
            </>
          }
        >
          <CCRateTable cc={cc} editable onChange={(field, v) => updateField(i, field, v)} />
        </Panel>
      ))}

      <Panel
        title="Consolidado Planta"
        meta={
          <>Cuota global: <strong style={{ color: 'var(--ink)' }}>${fmtMoney(consolidated.totalRate, 4)} / min</strong></>
        }
      >
        <CCRateTable cc={consolidated} editable={false} />
      </Panel>

      {showTraza && (
        <div className="modal-overlay" onClick={() => setShowTraza(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Trazabilidad de Cuotas · Desglose de Cálculo</h3>
              <button className="modal-close" onClick={() => setShowTraza(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                <strong>Fórmula:</strong> Costo/Min = Gasto Anual ÷ Minutos Productivos Disponibles.
                Cada concepto (MOD, Gtos Variables, Gtos Fijos) se prorratea sobre el mismo denominador.
              </p>

              <div style={{ display: 'grid', gap: 18, marginTop: 12 }}>
                {derivedRows.map((cc) => (
                  <div key={cc.cc}>
                    <div style={{
                      fontFamily: "'IBM Plex Serif'",
                      fontSize: 14,
                      fontWeight: 600,
                      color: cc.accent,
                      marginBottom: 6,
                    }}>
                      CC{cc.cc} · {cc.name}
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th className="num">Gasto Anual</th>
                          <th className="num">÷ Minutos</th>
                          <th className="num">= Costo/Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Mano de Obra Directa</td>
                          <td className="num">${fmtMoneyNoDec(cc.mod)}</td>
                          <td className="num">{fmtUnits(cc.minutes)}</td>
                          <td className="num">${fmtMoney(cc.modRate, 4)}</td>
                        </tr>
                        <tr>
                          <td>Gastos Variables</td>
                          <td className="num">${fmtMoneyNoDec(cc.gv)}</td>
                          <td className="num">{fmtUnits(cc.minutes)}</td>
                          <td className="num">${fmtMoney(cc.gvRate, 4)}</td>
                        </tr>
                        <tr>
                          <td>Gastos Fijos</td>
                          <td className="num">${fmtMoneyNoDec(cc.gf)}</td>
                          <td className="num">{fmtUnits(cc.minutes)}</td>
                          <td className="num">${fmtMoney(cc.gfRate, 4)}</td>
                        </tr>
                        <tr style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          <td>Total CC{cc.cc}</td>
                          <td className="num">${fmtMoneyNoDec(cc.total)}</td>
                          <td className="num">{fmtUnits(cc.minutes)}</td>
                          <td className="num" style={{ color: cc.accent }}>${fmtMoney(cc.totalRate, 4)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}

                <div>
                  <div style={{
                    fontFamily: "'IBM Plex Serif'",
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: 6,
                    paddingTop: 6,
                    borderTop: '1px solid var(--line)',
                  }}>
                    Consolidado Planta
                  </div>
                  <table>
                    <tbody>
                      <tr><td>Σ MOD</td><td className="num">${fmtMoneyNoDec(consolidated.mod)}</td></tr>
                      <tr><td>Σ GV</td><td className="num">${fmtMoneyNoDec(consolidated.gv)}</td></tr>
                      <tr><td>Σ GF</td><td className="num">${fmtMoneyNoDec(consolidated.gf)}</td></tr>
                      <tr style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        <td>Σ Total Anual</td>
                        <td className="num">${fmtMoneyNoDec(consolidated.total)}</td>
                      </tr>
                      <tr><td>Σ Minutos productivos</td><td className="num">{fmtUnits(consolidated.minutes)}</td></tr>
                      <tr style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        <td>Cuota global = Total ÷ Minutos</td>
                        <td className="num">${fmtMoney(consolidated.totalRate, 4)} / min</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-mute)' }}>
                <span style={FIELD_LABEL}>FUENTES:</span> MOD se alimenta de plantilla de RH × Sueldo Integrado.
                Gtos Variables (energía, agua, gas, refacciones) y Gtos Fijos (mantenimientos, indirectos, sueldos indirectos)
                se cargan desde el catálogo de cuentas en Contabilidad.
                Los minutos productivos provienen del calendario de capacidad por CC.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn" onClick={() => setShowTraza(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
