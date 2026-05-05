import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { COST_CENTERS, ACCOUNTS, MONTHS } from '../data/seed';
import { COSTOS_CALC_ROWS } from '../data/costosCalc';
import { fmtMoney } from '../utils/format';

const CAT_CLASS = {
  PRODUCTIVOS:    'productivos',
  SERVICIOS:      'servicios',
  ADMINISTRACION: 'administracion',
  VENTAS:         'ventas',
};

const CATEGORIES = ['PRODUCTIVOS', 'SERVICIOS', 'ADMINISTRACION', 'VENTAS'];
const FULL_MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const FIELD_LABEL = { fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' };
const FIELD_INPUT = { padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit' };

export default function Contabilidad() {
  const today = new Date();
  const [costCenters, setCostCenters] = useState(COST_CENTERS);
  const [accounts, setAccounts] = useState(ACCOUNTS);
  const [period, setPeriod] = useState({ monthIdx: today.getMonth(), year: today.getFullYear() });
  const [closedPeriods, setClosedPeriods] = useState([]);

  const [showAddCC, setShowAddCC] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showCloseMonth, setShowCloseMonth] = useState(false);
  const [closeFlash, setCloseFlash] = useState(false);

  const [draftCC, setDraftCC] = useState({ category: 'PRODUCTIVOS', cc: '', name: '' });
  const [draftAccount, setDraftAccount] = useState({ code: '', name: '' });
  const [closeMemo, setCloseMemo] = useState('');

  const ccCodeExists = (code) => costCenters.some((c) => c.cc === code);
  const accountCodeExists = (code) => accounts.some((a) => a.code === code);

  const openAddCC = () => {
    setDraftCC({ category: 'PRODUCTIVOS', cc: '', name: '' });
    setShowAddCC(true);
  };

  const submitNewCC = () => {
    const code = parseInt(draftCC.cc, 10);
    if (!code || ccCodeExists(code) || !draftCC.name.trim()) return;
    const next = [...costCenters, { category: draftCC.category, cc: code, name: draftCC.name.trim().toUpperCase() }];
    next.sort((a, b) => a.cc - b.cc);
    setCostCenters(next);
    setShowAddCC(false);
  };

  const removeCC = (cc) => setCostCenters((list) => list.filter((c) => c.cc !== cc));

  const openAddAccount = () => {
    setDraftAccount({ code: '', name: '' });
    setShowAddAccount(true);
  };

  const submitNewAccount = () => {
    const code = parseInt(draftAccount.code, 10);
    if (!code || accountCodeExists(code) || !draftAccount.name.trim()) return;
    const next = [...accounts, { code, name: draftAccount.name.trim() }];
    next.sort((a, b) => a.code - b.code);
    setAccounts(next);
    setShowAddAccount(false);
  };

  const removeAccount = (code) => setAccounts((list) => list.filter((a) => a.code !== code));

  const openCloseMonth = () => {
    setCloseMemo('');
    setShowCloseMonth(true);
  };

  const submitCloseMonth = () => {
    const label = `${FULL_MONTHS[period.monthIdx]} ${period.year}`;
    setClosedPeriods((list) => [
      ...list,
      {
        label,
        monthIdx: period.monthIdx,
        year: period.year,
        closedAt: new Date().toISOString(),
        ccCount: costCenters.length,
        accountCount: accounts.length,
        memo: closeMemo.trim(),
      },
    ]);
    const nextMonth = (period.monthIdx + 1) % 12;
    const nextYear = period.monthIdx === 11 ? period.year + 1 : period.year;
    setPeriod({ monthIdx: nextMonth, year: nextYear });
    setShowCloseMonth(false);
    setCloseFlash(true);
    setTimeout(() => setCloseFlash(false), 1500);
  };

  const currentLabel = `${FULL_MONTHS[period.monthIdx]} ${period.year}`;
  const lastClosed = closedPeriods[closedPeriods.length - 1];

  return (
    <>
      <PageHeader
        title="Contabilidad & Costos"
        subtitle={`Período abierto: ${currentLabel}${lastClosed ? ` · Último cierre: ${lastClosed.label}` : ''}`}
        actions={
          <>
            <button className="btn" onClick={openAddCC}>+ Centro Costo</button>
            <button className="btn" onClick={openAddAccount}>+ Cuenta</button>
            <button className="btn btn-primary" onClick={openCloseMonth}>
              {closeFlash ? `✓ ${lastClosed?.label} cerrado` : 'Cerrar Mes'}
            </button>
          </>
        }
      />

      <div className="grid-2">
        <Panel
          title="Centros de Costo"
          meta={`${[...new Set(costCenters.map(c => c.category))].length} categorías · ${costCenters.length} CC activos`}
          scrollX
        >
          <table className="cost-table">
            <thead>
              <tr>
                <th style={{ width: 120 }}>CATEGORÍA</th>
                <th className="num" style={{ width: 60 }}>CC</th>
                <th>DESCRIPCIÓN</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {costCenters.map((c) => (
                <tr key={c.cc}>
                  <td>
                    <span className={`cat-tag ${CAT_CLASS[c.category]}`}>{c.category}</span>
                  </td>
                  <td className="cell-master num">{c.cc}</td>
                  <td>{c.name}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeCC(c.cc)}
                      aria-label="Eliminar centro de costo"
                      title="Eliminar"
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer', fontFamily: "'IBM Plex Mono'", fontSize: 14, padding: '2px 6px' }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Catálogo de Cuentas"
          meta={`${accounts.length} cuentas · MOD · Gtos · Sueldos Indir.`}
          scrollX
        >
          <table className="cost-table">
            <thead>
              <tr>
                <th className="num" style={{ width: 90 }}>CUENTA</th>
                <th>NOMBRE</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.code}>
                  <td className="cell-master num">{a.code}</td>
                  <td>{a.name}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeAccount(a.code)}
                      aria-label="Eliminar cuenta"
                      title="Eliminar"
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer', fontFamily: "'IBM Plex Mono'", fontSize: 14, padding: '2px 6px' }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {closedPeriods.length > 0 && (
        <Panel
          title="Períodos Cerrados"
          meta={`${closedPeriods.length} cierre${closedPeriods.length === 1 ? '' : 's'} en sesión`}
        >
          <table className="cost-table">
            <thead>
              <tr>
                <th>PERÍODO</th>
                <th>FECHA DE CIERRE</th>
                <th className="num">CC</th>
                <th className="num">CUENTAS</th>
                <th>NOTA</th>
              </tr>
            </thead>
            <tbody>
              {[...closedPeriods].reverse().map((p) => (
                <tr key={`${p.year}-${p.monthIdx}-${p.closedAt}`}>
                  <td><strong>{p.label}</strong></td>
                  <td>{new Date(p.closedAt).toLocaleString('es-MX')}</td>
                  <td className="num">{p.ccCount}</td>
                  <td className="num">{p.accountCount}</td>
                  <td>{p.memo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <CostosCalcPanel />

      {showAddCC && (
        <div className="modal-overlay" onClick={() => setShowAddCC(false)}>
          <div className="modal" style={{ width: 'min(480px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nuevo Centro de Costo</h3>
              <button className="modal-close" onClick={() => setShowAddCC(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); submitNewCC(); }} style={{ display: 'grid', gap: 14 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={FIELD_LABEL}>CATEGORÍA</span>
                  <select
                    value={draftCC.category}
                    onChange={(e) => setDraftCC({ ...draftCC, category: e.target.value })}
                    style={FIELD_INPUT}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={FIELD_LABEL}>CÓDIGO CC</span>
                  <input
                    type="number"
                    autoFocus
                    value={draftCC.cc}
                    onChange={(e) => setDraftCC({ ...draftCC, cc: e.target.value })}
                    placeholder="Ej. 130"
                    style={{ ...FIELD_INPUT, textAlign: 'right' }}
                  />
                  {draftCC.cc && ccCodeExists(parseInt(draftCC.cc, 10)) && (
                    <span style={{ fontSize: 11, color: 'var(--neg)' }}>El código ya existe</span>
                  )}
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={FIELD_LABEL}>DESCRIPCIÓN</span>
                  <input
                    type="text"
                    value={draftCC.name}
                    onChange={(e) => setDraftCC({ ...draftCC, name: e.target.value })}
                    placeholder="Ej. PROCESO CONVERSION 4"
                    style={FIELD_INPUT}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn" onClick={() => setShowAddCC(false)}>Cancelar</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!draftCC.cc || ccCodeExists(parseInt(draftCC.cc, 10)) || !draftCC.name.trim()}
                  >Agregar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAddAccount && (
        <div className="modal-overlay" onClick={() => setShowAddAccount(false)}>
          <div className="modal" style={{ width: 'min(480px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Cuenta Contable</h3>
              <button className="modal-close" onClick={() => setShowAddAccount(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); submitNewAccount(); }} style={{ display: 'grid', gap: 14 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={FIELD_LABEL}>CÓDIGO DE CUENTA</span>
                  <input
                    type="number"
                    autoFocus
                    value={draftAccount.code}
                    onChange={(e) => setDraftAccount({ ...draftAccount, code: e.target.value })}
                    placeholder="Ej. 1002007"
                    style={{ ...FIELD_INPUT, textAlign: 'right' }}
                  />
                  {draftAccount.code && accountCodeExists(parseInt(draftAccount.code, 10)) && (
                    <span style={{ fontSize: 11, color: 'var(--neg)' }}>El código ya existe</span>
                  )}
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={FIELD_LABEL}>NOMBRE</span>
                  <input
                    type="text"
                    value={draftAccount.name}
                    onChange={(e) => setDraftAccount({ ...draftAccount, name: e.target.value })}
                    placeholder="Ej. Combustibles"
                    style={FIELD_INPUT}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn" onClick={() => setShowAddAccount(false)}>Cancelar</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!draftAccount.code || accountCodeExists(parseInt(draftAccount.code, 10)) || !draftAccount.name.trim()}
                  >Agregar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCloseMonth && (
        <div className="modal-overlay" onClick={() => setShowCloseMonth(false)}>
          <div className="modal" style={{ width: 'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cierre de Mes · {currentLabel}</h3>
              <button className="modal-close" onClick={() => setShowCloseMonth(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Vas a cerrar el período <strong style={{ color: 'var(--ink)' }}>{currentLabel}</strong>.
                Esto bloquea modificaciones del período y abre <strong>{FULL_MONTHS[(period.monthIdx + 1) % 12]} {period.monthIdx === 11 ? period.year + 1 : period.year}</strong>.
              </p>

              <table style={{ marginBottom: 12 }}>
                <tbody>
                  <tr><td>Centros de costo activos</td><td className="num"><strong>{costCenters.length}</strong></td></tr>
                  <tr><td>Cuentas en catálogo</td><td className="num"><strong>{accounts.length}</strong></td></tr>
                  <tr><td>Fecha de cierre</td><td className="num"><strong>{new Date().toLocaleString('es-MX')}</strong></td></tr>
                </tbody>
              </table>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={FIELD_LABEL}>NOTA DE CIERRE (OPCIONAL)</span>
                <textarea
                  value={closeMemo}
                  onChange={(e) => setCloseMemo(e.target.value)}
                  rows={2}
                  placeholder="Ej. Cierre revisado por contraloría"
                  style={{ ...FIELD_INPUT, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn" onClick={() => setShowCloseMonth(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={submitCloseMonth}>Cerrar {MONTHS[period.monthIdx]}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// COSTOS (Cálculo) — réplica íntegra de la pestaña del Excel
// ============================================================
const CC_MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function fmtCell(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    if (v === 0) return '—';
    return fmtMoney(v, Math.abs(v) < 10 ? 4 : 2);
  }
  return String(v);
}

function classifyRow(r) {
  // Section header: descCc null, no cuenta, has clas like 'GASTO TOTAL PLANTA', 'PRORRATEO...', etc.
  // Subtotal: descCc === 'TOTALES'
  // Total summary: clas in special words (e.g., 'ABSORCIONES POR PRODUCCION', 'GASTO PROYECTADO', 'VARIACIONES', 'MOD REAL', 'GTOS V', 'GTOS F', 'ABSORCION', 'VAR', 'MANO DE OBRA DIRECTA', 'GASTOS VARIABLES', 'GASTOS FIJOS', 'TOTALES')
  if (r.descCc === 'TOTALES') return 'subtotal';
  const sectionHeaders = ['GASTO TOTAL PLANTA', 'PRORRATEO DE CENTRO DE COSTOS DE SERVICIOS A PRODUCTIVOS'];
  if (r.clas && sectionHeaders.includes(r.clas) && !r.cuenta) return 'section';
  const summaryWords = ['ABSORCIONES POR PRODUCCION', 'GASTO PROYECTADO', 'VARIACIONES', 'MOD REAL', 'GTOS V', 'GTOS F', 'ABSORCION', 'VAR'];
  if (!r.cc && r.clas && summaryWords.includes(r.clas) && !r.cuenta) return 'summary';
  if (!r.cc && !r.cuenta && r.clas && ['MANO DE OBRA DIRECTA','GASTOS VARIABLES','GASTOS FIJOS','TOTALES'].includes(r.clas)) {
    return 'plantSubtotal';
  }
  if (!r.cc && r.descCuenta === 'TOTAL GASTO') return 'plantSubtotal';
  return 'detail';
}

// Cuentas que en el Excel vienen en amarillo (captura manual): todas las GASTOS VARIABLES
const MANUAL_CUENTA_PREFIXES = ['1002'];
const isManualCuenta = (cuenta) => {
  if (!cuenta) return false;
  const s = String(cuenta);
  return MANUAL_CUENTA_PREFIXES.some((p) => s.startsWith(p));
};

// Renglones del PRORRATEO de CCs servicios → productivos (porcentajes manuales)
const isProrrateoRow = (r) => {
  if (r.cc) return false;
  if (!r.clas || !/^\d+$/.test(String(r.clas))) return false;
  if (!r.cuenta) return false;
  return String(r.cuenta).startsWith('PROCESO CONVERSION');
};

const fmtPct = (v) => {
  if (v === null || v === undefined || v === '' || Number.isNaN(v)) return '';
  return `${(Number(v) * 100).toFixed(2)}%`;
};
const parsePct = (raw) => {
  const cleaned = String(raw).replace(/[^\d.\-]/g, '');
  if (!cleaned) return 0;
  return parseFloat(cleaned) / 100;
};

const CC_MANUAL_KEY = 'contabilidad.costosCalcManual.v1';
const readManualVals = () => {
  try { return JSON.parse(window.localStorage.getItem(CC_MANUAL_KEY) || '{}'); }
  catch { return {}; }
};
const persistManualVals = (data) => {
  try { window.localStorage.setItem(CC_MANUAL_KEY, JSON.stringify(data)); } catch {}
};

function CostosCalcPanel() {
  const [filterCc, setFilterCc] = useState('todos');
  const [hideZeros, setHideZeros] = useState(false);
  const [manualVals, setManualVals] = useState(readManualVals);

  const visibleRows = COSTOS_CALC_ROWS.filter((r) => {
    if (filterCc !== 'todos' && r.cc && String(r.cc) !== filterCc) {
      return false;
    }
    if (hideZeros) {
      const allZeroOrEmpty = r.months.every((m) => m === null || m === 0 || m === '') && (r.total === null || r.total === 0);
      if (allZeroOrEmpty && classifyRow(r) === 'detail') return false;
    }
    return true;
  });

  const ccs = [...new Set(COSTOS_CALC_ROWS.map((r) => r.cc).filter((c) => c && /^\d+$/.test(String(c))))];

  const cellKey = (rowR, monthIdx) => `${rowR}_${monthIdx}`;
  const getCellValue = (r, monthIdx) => {
    const stored = manualVals[cellKey(r.r, monthIdx)];
    if (stored !== undefined && stored !== null) return stored;
    return r.months[monthIdx];
  };
  const updateCell = (r, monthIdx, raw, asPct = false) => {
    const num = asPct ? parsePct(raw) : (parseFloat(String(raw).replace(/[^\d.\-]/g, '')) || 0);
    setManualVals((prev) => {
      const next = { ...prev, [cellKey(r.r, monthIdx)]: num };
      persistManualVals(next);
      return next;
    });
  };
  const getRowTotal = (r) => {
    if (!isManualCuenta(r.cuenta) && !isProrrateoRow(r)) return r.total;
    let s = 0;
    for (let i = 0; i < 12; i++) {
      const v = getCellValue(r, i);
      if (typeof v === 'number') s += v;
    }
    if (isProrrateoRow(r)) return s / 12; // average across months for prorrateo display
    return s;
  };

  return (
    <Panel
      title="COSTOS (Cálculo) · Replica íntegra del Excel"
      meta={`${COSTOS_CALC_ROWS.length} renglones · Renglones azules = captura manual (Gastos Variables)`}
      scrollX
      actions={
        <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
          <select
            value={filterCc}
            onChange={(e) => setFilterCc(e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid var(--line)', background: '#fff',
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.06em',
            }}
          >
            <option value="todos">TODOS LOS CC</option>
            {ccs.map((c) => <option key={c} value={c}>CC {c}</option>)}
          </select>
          <label style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.06em', color: 'var(--ink-mute)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={hideZeros} onChange={(e) => setHideZeros(e.target.checked)} />
            OCULTAR CEROS
          </label>
        </span>
      }
    >
      <div className="scroll-x">
        <table className="cost-table cc-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>CC</th>
              <th style={{ width: 180 }}>DESCRIPCIÓN CC</th>
              <th style={{ width: 170 }}>CLASIFICACIÓN</th>
              <th style={{ width: 80 }}>CUENTA</th>
              <th style={{ width: 170 }}>DESCRIPCIÓN CUENTA</th>
              {CC_MONTHS.map((m) => (
                <th key={m} className="num" style={{ width: 90 }}>{m}</th>
              ))}
              <th className="num" style={{ width: 110, background: '#0a0a0a', color: '#fff' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const type = classifyRow(r);
              const rowClass = `cc-row-${type}`;
              const manual = type === 'detail' && isManualCuenta(r.cuenta);
              const prorrateo = isProrrateoRow(r);
              const total = getRowTotal(r);
              return (
                <tr key={r.r} className={rowClass}>
                  <td className="num">{r.cc ?? ''}</td>
                  <td>{r.descCc ?? ''}</td>
                  <td>{r.clas ?? ''}</td>
                  <td className="num">{r.cuenta ?? ''}</td>
                  <td>{r.descCuenta ?? ''}</td>
                  {r.months.map((_, i) => {
                    const v = getCellValue(r, i);
                    if (manual) {
                      return (
                        <td key={i} className="cell-input num">
                          <input
                            type="text"
                            value={typeof v === 'number' ? fmtMoney(v, Math.abs(v) < 10 ? 4 : 2) : ''}
                            onChange={(e) => updateCell(r, i, e.target.value)}
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                      );
                    }
                    if (prorrateo) {
                      return (
                        <td key={i} className="cell-input num">
                          <input
                            type="text"
                            value={typeof v === 'number' ? fmtPct(v) : ''}
                            onChange={(e) => updateCell(r, i, e.target.value, true)}
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                      );
                    }
                    return <td key={i} className="num">{fmtCell(v)}</td>;
                  })}
                  <td className="num cc-total-cell">
                    {prorrateo ? fmtPct(total) : fmtCell(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
