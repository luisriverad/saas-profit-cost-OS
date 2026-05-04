import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { STAFF, BENEFITS, INTEGRATION_FACTOR, COST_CENTERS } from '../data/seed';
import { fmtMoney } from '../utils/format';

const PRODUCTIVE_CCS = COST_CENTERS.filter((c) => c.category === 'PRODUCTIVOS');

const computeFactorFromBenefits = (benefits) => {
  const get = (n) => benefits.find((b) => b.name === n)?.value ?? 0;
  const aguinaldo = get('Aguinaldo');
  const vacaciones = get('Vacaciones');
  const primaVac = get('Prima Vacacional');
  const dias = 365 + aguinaldo + vacaciones * primaVac;
  return Math.round((dias / 365) * 10000) / 10000;
};

export default function RH() {
  const [staff, setStaff] = useState(STAFF);
  const [benefits, setBenefits] = useState(BENEFITS);
  const [factor, setFactor] = useState(INTEGRATION_FACTOR);
  const [showPolicy, setShowPolicy] = useState(false);
  const [recalcFlash, setRecalcFlash] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const emptyDraft = { cc: PRODUCTIVE_CCS[0]?.cc ?? 100, name: '', puesto: 'MECANICO', sueldo: 315 };
  const [draftEmployee, setDraftEmployee] = useState(emptyDraft);

  const adjustFactor = (delta) => {
    setFactor((f) => {
      const next = Math.round((f + delta) * 10000) / 10000;
      return next < 0 ? 0 : next;
    });
  };

  const onFactorInput = (v) => {
    const cleaned = v.replace(',', '.').replace(/[^0-9.]/g, '');
    if (cleaned === '' || cleaned === '.') {
      setFactor(0);
      return;
    }
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) setFactor(Math.round(parsed * 10000) / 10000);
  };

  const updateSueldo = (i, v) => {
    const next = [...staff];
    next[i] = { ...next[i], sueldo: parseFloat(v) || 0 };
    setStaff(next);
  };

  const updateStaffField = (i, field, v) => {
    const next = [...staff];
    next[i] = { ...next[i], [field]: field === 'cc' ? parseInt(v, 10) || 0 : v };
    setStaff(next);
  };

  const openAddEmployee = () => {
    setDraftEmployee(emptyDraft);
    setShowAddEmployee(true);
  };

  const submitNewEmployee = () => {
    const name = draftEmployee.name.trim() || 'NUEVO EMPLEADO';
    setStaff((s) => [
      ...s,
      {
        cc: parseInt(draftEmployee.cc, 10) || PRODUCTIVE_CCS[0]?.cc || 100,
        name: name.toUpperCase(),
        puesto: (draftEmployee.puesto || 'MECANICO').toUpperCase(),
        sueldo: parseFloat(draftEmployee.sueldo) || 0,
      },
    ]);
    setShowAddEmployee(false);
  };

  const removeEmployee = (i) => {
    setStaff((s) => s.filter((_, idx) => idx !== i));
  };

  const recalcIntegrado = () => {
    setFactor(computeFactorFromBenefits(benefits));
    setRecalcFlash(true);
    setTimeout(() => setRecalcFlash(false), 1200);
  };

  const updateBenefit = (i, v) => {
    const next = [...benefits];
    const parsed = next[i].unit === 'pct' ? parseFloat(v) / 100 : parseFloat(v);
    next[i] = { ...next[i], value: isNaN(parsed) ? 0 : parsed };
    setBenefits(next);
  };

  return (
    <>
      <PageHeader
        title="Recursos Humanos · Estructura de Personal"
        subtitle="Plantilla productiva · Sueldo integrado · Factor de prestaciones"
        actions={
          <>
            <button className="btn" onClick={openAddEmployee}>+ Empleado</button>
            <button className="btn" onClick={() => setShowPolicy(true)}>Política RH</button>
            <button className="btn btn-primary" onClick={recalcIntegrado}>
              {recalcFlash ? '✓ Recalculado' : 'Recalcular Integrado'}
            </button>
          </>
        }
      />

      <div className="grid-2">
        <Panel
          title="Plantilla por Centro de Costo"
          meta={`${staff.length} personas directas · 3 CC productivos`}
          scrollX
        >
          <table className="cost-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>CC</th>
                <th>NOMBRE</th>
                <th>PUESTO</th>
                <th className="num" style={{ width: 90 }}>SUELDO DIARIO</th>
                <th className="num" style={{ width: 110 }}>INTEGRADO</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={i}>
                  <td className="cell-input">
                    <select
                      value={s.cc}
                      onChange={(e) => updateStaffField(i, 'cc', e.target.value)}
                      style={{ width: '100%', background: 'transparent', border: 'none', font: 'inherit', color: 'inherit' }}
                    >
                      {PRODUCTIVE_CCS.map((c) => (
                        <option key={c.cc} value={c.cc}>{c.cc}</option>
                      ))}
                    </select>
                  </td>
                  <td className="cell-input">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => updateStaffField(i, 'name', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="cell-input">
                    <input
                      type="text"
                      value={s.puesto}
                      onChange={(e) => updateStaffField(i, 'puesto', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="cell-input num">
                    <input
                      type="number"
                      step="1"
                      value={s.sueldo}
                      onChange={(e) => updateSueldo(i, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="cell-formula num">
                    {fmtMoney(s.sueldo * factor)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeEmployee(i)}
                      aria-label="Eliminar empleado"
                      title="Eliminar empleado"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ink-mute)',
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Mono'",
                        fontSize: 14,
                        padding: '2px 6px',
                      }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div>
          <div className="panel">
            <div className="panel-header">
              <h3>Factor de Integración</h3>
            </div>
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono'",
                fontSize: 10,
                color: 'var(--ink-mute)',
                letterSpacing: '0.08em',
              }}>
                FACTOR APLICADO
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                margin: '6px 0',
              }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={factor.toFixed(4)}
                  onChange={(e) => onFactorInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp')   { e.preventDefault(); adjustFactor(0.001); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); adjustFactor(-0.001); }
                  }}
                  style={{
                    fontFamily: "'IBM Plex Serif'",
                    fontSize: 48,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    textAlign: 'center',
                    width: 180,
                    padding: 0,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => adjustFactor(0.001)}
                    aria-label="Aumentar factor"
                    style={{
                      fontFamily: "'IBM Plex Mono'",
                      fontSize: 12,
                      lineHeight: 1,
                      padding: '4px 6px',
                      border: '1px solid var(--line)',
                      background: 'var(--bg-soft, transparent)',
                      color: 'var(--ink-soft)',
                      cursor: 'pointer',
                      borderRadius: 3,
                    }}
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => adjustFactor(-0.001)}
                    aria-label="Disminuir factor"
                    style={{
                      fontFamily: "'IBM Plex Mono'",
                      fontSize: 12,
                      lineHeight: 1,
                      padding: '4px 6px',
                      border: '1px solid var(--line)',
                      background: 'var(--bg-soft, transparent)',
                      color: 'var(--ink-soft)',
                      cursor: 'pointer',
                      borderRadius: 3,
                    }}
                  >▼</button>
                </div>
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono'",
                fontSize: 10,
                color: 'var(--ink-soft)',
              }}>
                Integrado = Diario × Factor
              </div>
            </div>
          </div>

          <Panel title="Prestaciones · Conforme a Ley">
            <table className="cost-table">
              <tbody>
                {benefits.map((b, i) => (
                  <tr key={b.name}>
                    <td>{b.name}</td>
                    <td className="cell-input num">
                      <input
                        type="text"
                        defaultValue={b.unit === 'pct' ? `${(b.value * 100).toFixed(2)}%` : b.value}
                        onChange={(e) => updateBenefit(i, e.target.value.replace('%', ''))}
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td>{b.unit === 'pct' ? '—' : b.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>

      {showAddEmployee && (
        <div className="modal-overlay" onClick={() => setShowAddEmployee(false)}>
          <div className="modal" style={{ width: 'min(480px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nuevo Empleado</h3>
              <button className="modal-close" onClick={() => setShowAddEmployee(false)}>×</button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => { e.preventDefault(); submitNewEmployee(); }}
                style={{ display: 'grid', gap: 14 }}
              >
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>CENTRO DE COSTO</span>
                  <select
                    value={draftEmployee.cc}
                    onChange={(e) => setDraftEmployee({ ...draftEmployee, cc: e.target.value })}
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit' }}
                  >
                    {PRODUCTIVE_CCS.map((c) => (
                      <option key={c.cc} value={c.cc}>{c.cc} · {c.name}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>NOMBRE COMPLETO</span>
                  <input
                    type="text"
                    autoFocus
                    value={draftEmployee.name}
                    onChange={(e) => setDraftEmployee({ ...draftEmployee, name: e.target.value })}
                    placeholder="Ej. JUAN PEREZ GARCIA"
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>PUESTO</span>
                  <input
                    type="text"
                    value={draftEmployee.puesto}
                    onChange={(e) => setDraftEmployee({ ...draftEmployee, puesto: e.target.value })}
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>SUELDO DIARIO</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={draftEmployee.sueldo}
                    onChange={(e) => setDraftEmployee({ ...draftEmployee, sueldo: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit', textAlign: 'right' }}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                    Integrado estimado: <strong style={{ color: 'var(--accent)' }}>{fmtMoney((parseFloat(draftEmployee.sueldo) || 0) * factor)}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn" onClick={() => setShowAddEmployee(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Agregar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPolicy && (() => {
        const get = (n) => benefits.find((b) => b.name === n)?.value ?? 0;
        const aguinaldo = get('Aguinaldo');
        const vacaciones = get('Vacaciones');
        const primaVac = get('Prima Vacacional');
        const diasPrima = vacaciones * primaVac;
        const totalDias = 365 + aguinaldo + diasPrima;
        const factorCalc = totalDias / 365;
        const diff = Math.round((factor - factorCalc) * 10000) / 10000;
        return (
          <div className="modal-overlay" onClick={() => setShowPolicy(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Política de RH · Cálculo del Factor de Integración</h3>
                <button className="modal-close" onClick={() => setShowPolicy(false)}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ marginTop: 0 }}>
                  Conforme a LFT/LSS: Sueldo Diario Integrado (SDI) = Sueldo Diario × Factor.
                  El factor refleja días remunerados al año / 365.
                </p>

                <table>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Valor</th>
                      <th>Días equivalentes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Días naturales del año</td>
                      <td>—</td>
                      <td>365.00</td>
                    </tr>
                    <tr>
                      <td>Aguinaldo</td>
                      <td>{aguinaldo} días</td>
                      <td>{aguinaldo.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Prima Vacacional ({vacaciones} días × {(primaVac * 100).toFixed(0)}%)</td>
                      <td>{(primaVac * 100).toFixed(2)}%</td>
                      <td>{diasPrima.toFixed(2)}</td>
                    </tr>
                    <tr style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      <td>Total días pagados</td>
                      <td>—</td>
                      <td>{totalDias.toFixed(2)}</td>
                    </tr>
                    <tr style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      <td>Factor calculado = {totalDias.toFixed(2)} ÷ 365</td>
                      <td>—</td>
                      <td>{factorCalc.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td>Factor aplicado actualmente</td>
                      <td>—</td>
                      <td>{factor.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td>Diferencia</td>
                      <td>—</td>
                      <td style={{ color: diff === 0 ? 'var(--pos)' : 'var(--neg)' }}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(4)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-mute)' }}>
                  Nota: IMSS, SAR, INFONAVIT e Imp. Estatal son aportaciones patronales sobre el SDI,
                  no entran en el factor de integración del trabajador.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button className="btn" onClick={() => setShowPolicy(false)}>Cerrar</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => { recalcIntegrado(); setShowPolicy(false); }}
                  >
                    Aplicar factor calculado
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
