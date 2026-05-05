import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { STAFF, BENEFITS, INTEGRATION_FACTOR, COST_CENTERS } from '../data/seed';
import { fmtMoney } from '../utils/format';
import { logTraza } from '../utils/trazabilidad';

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

  const [showAddBenefit, setShowAddBenefit] = useState(false);
  const emptyBenefitDraft = { name: '', value: '', unit: 'pct' };
  const [draftBenefit, setDraftBenefit] = useState(emptyBenefitDraft);

  const [authorized, setAuthorized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activePassword, setActivePassword] = useState(null);
  const editingRef = useRef(null);

  const guardProps = authorized
    ? {}
    : {
        onMouseDownCapture: (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.currentTarget.blur === 'function') e.currentTarget.blur();
          setShowAuthModal(true);
        },
        onFocusCapture: (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.target.blur === 'function') e.target.blur();
          setShowAuthModal(true);
        },
      };

  const handleAuthorize = (password) => {
    setAuthorized(true);
    setActivePassword(password);
    setShowAuthModal(false);
    logTraza({ password, module: 'Recursos Humanos', action: 'Autorización concedida' });
  };

  const traza = (action) => {
    logTraza({ password: activePassword ?? '—', module: 'Recursos Humanos', action });
  };

  const focusCell = (oldValue, action) => {
    editingRef.current = { value: oldValue, action };
  };
  const blurCell = (newValue) => {
    const e = editingRef.current;
    editingRef.current = null;
    if (!e) return;
    if (String(e.value) !== String(newValue)) {
      traza(`${e.action}: ${e.value} → ${newValue}`);
    }
  };

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
    const cc = parseInt(draftEmployee.cc, 10) || PRODUCTIVE_CCS[0]?.cc || 100;
    const puesto = (draftEmployee.puesto || 'MECANICO').toUpperCase();
    const sueldo = parseFloat(draftEmployee.sueldo) || 0;
    setStaff((s) => [...s, { cc, name: name.toUpperCase(), puesto, sueldo }]);
    setShowAddEmployee(false);
    traza(`Empleado agregado · ${name.toUpperCase()} · ${puesto} · CC${cc} · $${sueldo}/día`);
  };

  const removeEmployee = (i) => {
    const target = staff[i];
    setStaff((s) => s.filter((_, idx) => idx !== i));
    if (target) traza(`Empleado eliminado · ${target.name} · ${target.puesto}`);
  };

  const openAddBenefit = () => {
    setDraftBenefit(emptyBenefitDraft);
    setShowAddBenefit(true);
  };

  const submitNewBenefit = () => {
    const name = draftBenefit.name.trim();
    if (!name) return;
    if (benefits.some((b) => b.name.toLowerCase() === name.toLowerCase())) return;
    const raw = parseFloat(String(draftBenefit.value).replace(',', '.')) || 0;
    const value = draftBenefit.unit === 'pct' ? raw / 100 : raw;
    setBenefits((list) => [...list, { name, value, unit: draftBenefit.unit }]);
    setShowAddBenefit(false);
    const display = draftBenefit.unit === 'pct' ? `${raw.toFixed(2)}%` : `${raw} ${draftBenefit.unit}`;
    traza(`Prestación agregada · ${name} · ${display}`);
  };

  const removeBenefit = (i) => {
    const target = benefits[i];
    setBenefits((list) => list.filter((_, idx) => idx !== i));
    if (target) traza(`Prestación eliminada · ${target.name}`);
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
            <span className={`auth-pill ${authorized ? 'auth-pill-on' : 'auth-pill-off'}`}>
              {authorized ? '● AUTORIZADO' : '○ SOLO LECTURA'}
            </span>
            <button className="btn" onClick={openAddEmployee}>+ Empleado</button>
            <button className="btn" onClick={openAddBenefit}>+ Prestación</button>
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
                  <td className="cell-input" {...guardProps}>
                    <select
                      value={s.cc}
                      onChange={(e) => updateStaffField(i, 'cc', e.target.value)}
                      onFocus={() => focusCell(s.cc, `CC de ${s.name}`)}
                      onBlur={(e) => blurCell(e.target.value)}
                      style={{ width: '100%', background: 'transparent', border: 'none', font: 'inherit', color: 'inherit' }}
                    >
                      {PRODUCTIVE_CCS.map((c) => (
                        <option key={c.cc} value={c.cc}>{c.cc}</option>
                      ))}
                    </select>
                  </td>
                  <td className="cell-input" {...guardProps}>
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => updateStaffField(i, 'name', e.target.value)}
                      onFocus={(e) => { e.target.select(); focusCell(s.name, `Nombre empleado fila ${i + 1}`); }}
                      onBlur={(e) => blurCell(e.target.value)}
                    />
                  </td>
                  <td className="cell-input" {...guardProps}>
                    <input
                      type="text"
                      value={s.puesto}
                      onChange={(e) => updateStaffField(i, 'puesto', e.target.value)}
                      onFocus={(e) => { e.target.select(); focusCell(s.puesto, `Puesto de ${s.name}`); }}
                      onBlur={(e) => blurCell(e.target.value)}
                    />
                  </td>
                  <td className="cell-input num" {...guardProps}>
                    <input
                      type="number"
                      step="1"
                      value={s.sueldo}
                      onChange={(e) => updateSueldo(i, e.target.value)}
                      onFocus={(e) => { e.target.select(); focusCell(s.sueldo, `Sueldo de ${s.name}`); }}
                      onBlur={(e) => blurCell(parseFloat(e.target.value) || 0)}
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
                    <td className="cell-input num" {...guardProps}>
                      <input
                        type="text"
                        defaultValue={b.unit === 'pct' ? `${(b.value * 100).toFixed(2)}%` : b.value}
                        onChange={(e) => updateBenefit(i, e.target.value.replace('%', ''))}
                        onFocus={(e) => { e.target.select(); focusCell(b.unit === 'pct' ? `${(b.value * 100).toFixed(2)}%` : b.value, `Prestación ${b.name}`); }}
                        onBlur={(e) => blurCell(e.target.value)}
                      />
                    </td>
                    <td>{b.unit === 'pct' ? '—' : b.unit}</td>
                    <td style={{ width: 32 }}>
                      <button
                        type="button"
                        onClick={() => removeBenefit(i)}
                        aria-label="Eliminar prestación"
                        title="Eliminar prestación"
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

      {showAddBenefit && (
        <div className="modal-overlay" onClick={() => setShowAddBenefit(false)}>
          <div className="modal" style={{ width: 'min(440px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Prestación</h3>
              <button className="modal-close" onClick={() => setShowAddBenefit(false)}>×</button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => { e.preventDefault(); submitNewBenefit(); }}
                style={{ display: 'grid', gap: 14 }}
              >
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>NOMBRE</span>
                  <input
                    type="text"
                    autoFocus
                    value={draftBenefit.name}
                    onChange={(e) => setDraftBenefit({ ...draftBenefit, name: e.target.value })}
                    placeholder="Ej. Despensa, Vales, Bono Productividad"
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>UNIDAD</span>
                  <select
                    value={draftBenefit.unit}
                    onChange={(e) => setDraftBenefit({ ...draftBenefit, unit: e.target.value })}
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit' }}
                  >
                    <option value="pct">Porcentaje (%)</option>
                    <option value="días">Días</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-mute)' }}>
                    VALOR {draftBenefit.unit === 'pct' ? '(%)' : `(${draftBenefit.unit})`}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftBenefit.value}
                    onChange={(e) => setDraftBenefit({ ...draftBenefit, value: e.target.value })}
                    placeholder={draftBenefit.unit === 'pct' ? 'Ej. 25 (= 25%)' : 'Ej. 15'}
                    style={{ padding: '6px 8px', border: '1px solid var(--line)', background: 'var(--panel)', font: 'inherit', textAlign: 'right' }}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn" onClick={() => setShowAddBenefit(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Agregar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onAuthorize={handleAuthorize}
          onClose={() => setShowAuthModal(false)}
        />
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

function AuthModal({ onAuthorize, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === '12345') {
      onAuthorize(password);
      return;
    }
    setError('Password incorrecto');
    setPassword('');
    inputRef.current?.focus();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 100%)' }}>
        <div className="modal-header">
          <h3>Autorización requerida</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px 22px' }}>
            <div className="auth-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <p style={{ fontFamily: "'IBM Plex Serif'", fontSize: 14, lineHeight: 1.5, margin: '14px 0 6px', color: 'var(--ink)' }}>
              Estás por alterar los <strong>estándares autorizados</strong>. Revisa tus permisos.
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.05em', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>
              Solo personal con permiso de Recursos Humanos puede modificar plantilla, sueldos y prestaciones.
            </p>
            <label className="form-field auth-password" style={{ marginTop: 18, textAlign: 'left' }}>
              <span>INGRESA TU PASSWORD</span>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                placeholder="••••••"
                autoComplete="off"
              />
            </label>
            {error && (
              <div style={{
                color: 'var(--neg)', fontFamily: "'IBM Plex Mono'", fontSize: 11,
                textAlign: 'left', marginTop: 8,
              }}>
                {error}
              </div>
            )}
          </div>
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            background: 'var(--panel-alt)',
          }}>
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Autorizado</button>
          </div>
        </form>
      </div>
    </div>
  );
}
