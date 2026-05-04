import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { COST_CENTERS, ACCOUNTS, MONTHS } from '../data/seed';

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
