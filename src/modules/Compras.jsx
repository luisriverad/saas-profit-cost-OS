import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import {
  RAW_MATERIALS, VARIATIONS,
  PRODUCT_A_BOM, PRODUCT_A_ROUTING,
  PRODUCT_B_BOM, PRODUCT_B_ROUTING,
  PRODUCT_C_BOM, PRODUCT_C_ROUTING,
  PRODUCTION_SCHEDULE, MONTHS,
} from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtUnits } from '../utils/format';
import { logTraza } from '../utils/trazabilidad';

const STORAGE_KEY = 'compras.workspace.v1';
const ING_STORAGE_KEY = 'ingenieria.workspace.v2';
const VR_PERIOD_KEY = 'ventaReal.periodIdx';
const VR_PERIODS = ['ENERO 2026', 'FEBRERO 2026', 'MARZO 2026', 'ABRIL 2026'];
const PR_STORAGE_KEY = 'prodReal.workspace.v2';

const readVrPeriodIdx = () => {
  try {
    const raw = window.localStorage.getItem(VR_PERIOD_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n >= VR_PERIODS.length) return 0;
    return n;
  } catch { return 0; }
};
const readPrSnapshot = (idx) => {
  try {
    const raw = window.localStorage.getItem(PR_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.matrix?.[idx] ?? null;
  } catch { return null; }
};

// Default real MP values for Jan, scaled per month for non-stored data
const PR_DEFAULT_REAL_MP_JAN = {
  1001: 7313250, 1002: 1896221.25, 1003: 383353.6, 1004: 5020372,
  1005: 636984.075, 1006: 895977.6, 1007: 144036.2, 1008: 1813686,
  1009: 966000, 1010: 679000,
};
const PR_FACTORS = [0.94, 0.98, 1.04, 0.99];
const buildDefaultRealMp = (idx) => {
  const f = PR_FACTORS[idx] ?? 1;
  const out = {};
  Object.entries(PR_DEFAULT_REAL_MP_JAN).forEach(([k, v]) => { out[k] = Math.round(v * f); });
  return out;
};
const buildDefaultKgs = (idx, products, schedule) => {
  const f = PR_FACTORS[idx] ?? 1;
  const out = {};
  products.forEach((p) => {
    const sch = schedule.find((s) => s.code === p.code);
    out[p.code] = Math.round((sch?.months[idx] ?? 0) * f);
  });
  return out;
};

const MP_COSTS = {
  1001: 100, 1002: 55, 1003: 20, 1004: 34, 1005: 15,
  1006: 67,  1007: 22, 1008: 35, 1009: 15, 1010: 10,
};
const mpCost = (code) => MP_COSTS[code] ?? 0;

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

const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const readStored = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const persist = (data) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('app:data:changed', { detail: { key: STORAGE_KEY } }));
  } catch {}
};

export default function Compras() {
  const stored = readStored();
  const ingStored = readIngStored();
  const [mps, setMps] = useState(() => stored?.mps ?? RAW_MATERIALS);
  const [history, setHistory] = useState(() => stored?.history ?? []);
  const [comprados, setComprados] = useState(() => stored?.comprados ?? {});
  const [showAdd, setShowAdd] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [status, setStatus] = useState(null);
  const [mpBreakdown, setMpBreakdown] = useState(null); // { productCode, monthIdx }
  const [authorized, setAuthorized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activePassword, setActivePassword] = useState(null);
  const timerRef = useRef(null);
  const editingRef = useRef(null);

  const ingProducts = ingStored?.products ?? ING_BASE_PRODUCTS;
  const ingSchedule = ingStored?.schedule ?? PRODUCTION_SCHEDULE;
  const vrPeriodIdx = readVrPeriodIdx();
  const vrPeriod = VR_PERIODS[vrPeriodIdx];

  // Compute month-specific MP variations from ProdReal storage (or defaults)
  const monthSnapshot = readPrSnapshot(vrPeriodIdx) ?? {
    kgs: buildDefaultKgs(vrPeriodIdx, ingProducts, ingSchedule),
    realMp: buildDefaultRealMp(vrPeriodIdx),
  };
  const monthVariations = Object.keys(MP_COSTS).map((codeStr) => {
    const code = parseInt(codeStr, 10);
    const masterMp = mps.find((m) => m.code === code);
    const stdPrice  = masterMp?.costStd  ?? MP_COSTS[code] ?? 0;
    const realPrice = masterMp?.costReal ?? MP_COSTS[code] ?? 0;
    let consumoCalc = 0;
    ingProducts.forEach((p) => {
      const kgs = monthSnapshot.kgs?.[p.code] ?? 0;
      const bomRow = p.bom.find((b) => b.code === code);
      if (bomRow) consumoCalc += kgs * bomRow.consumo;
    });
    const override = comprados?.[vrPeriodIdx]?.[code];
    const consumo = (override !== undefined && override !== null)
      ? override
      : consumoCalc;
    const std  = consumo * stdPrice;
    const real = consumo * realPrice;
    const varT = real - std;
    const name = ingProducts[0]?.bom?.find((b) => b.code === code)?.name ?? `MP ${code}`;
    const um = ingProducts[0]?.bom?.find((b) => b.code === code)?.um ?? 'KGS';
    return { code, name, um, consumo, std, real, varT, varU: realPrice - stdPrice };
  });

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

  const flash = (kind, text, ms = 2800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };

  const handleAuthorize = (password) => {
    setAuthorized(true);
    setActivePassword(password);
    setShowAuthModal(false);
    flash('ok', 'Autorización concedida · puedes editar');
    logTraza({ password, module: 'Compras', action: 'Autorización concedida' });
  };

  const traza = (action) => {
    logTraza({ password: activePassword ?? '—', module: 'Compras', action });
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

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const update = (i, field, v) => {
    const next = [...mps];
    next[i] = { ...next[i], [field]: parseFloat(v) || 0 };
    setMps(next);
    persist({ mps: next, history, comprados });
  };

  const updateComprados = (pIdx, mpCode, value) => {
    const num = parseFloat(String(value).replace(/[^\d.\-]/g, '')) || 0;
    const next = {
      ...comprados,
      [pIdx]: { ...(comprados[pIdx] ?? {}), [mpCode]: Math.max(0, num) },
    };
    setComprados(next);
    persist({ mps, history, comprados: next });
  };

  const handleAddMp = ({ code, name, um, costStd, costReal }) => {
    const next = [...mps, { code, name, um, costStd, costReal }];
    setMps(next);
    persist({ mps: next, history, comprados });
    flash('ok', `Materia prima ${code} · ${name} agregada`);
    setShowAdd(false);
    traza(`MP ${code} · ${name} agregada (Std $${costStd} · Real $${costReal})`);
  };

  const handleRemoveMp = (code) => {
    const target = mps.find((m) => m.code === code);
    const next = mps.filter((m) => m.code !== code);
    setMps(next);
    persist({ mps: next, history, comprados });
    flash('ok', `MP ${code} eliminada`);
    traza(`MP ${code} · ${target?.name ?? ''} eliminada`);
  };

  const handleCerrarMes = () => {
    const now = new Date();
    const defaultPeriod = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    const periodName = window.prompt(
      'Cerrar mes · Etiqueta del periodo a cerrar:',
      defaultPeriod
    );
    if (!periodName || !periodName.trim()) return;
    const period = periodName.trim().toUpperCase();
    if (history.some((h) => h.period === period)) {
      flash('busy', `El periodo ${period} ya está cerrado`, 4000);
      return;
    }
    const ok = window.confirm(
      `Vas a cerrar ${period}. Se guardará el snapshot del maestro de materias primas y las variaciones del mes. ¿Continuar?`
    );
    if (!ok) return;

    const snapshot = {
      period,
      closedAt: new Date().toISOString(),
      mps: mps.map((m) => {
        const varU = +(m.costReal - m.costStd).toFixed(4);
        return { ...m, varU };
      }),
      variations: VARIATIONS.map((v) => ({ ...v })),
      totalVar: VARIATIONS.reduce((s, v) => s + v.varT, 0),
    };
    const newHistory = [snapshot, ...history];
    setHistory(newHistory);
    persist({ mps, history: newHistory, comprados });
    flash('ok', `Mes cerrado · ${period}`);
    traza(`Cerró mes ${period} (Var Total: $${fmtMoneyNoDec(snapshot.totalVar)})`);
  };

  const handleDeleteHistory = (period) => {
    const ok = window.confirm(`¿Eliminar el cierre de ${period}? No se puede deshacer.`);
    if (!ok) return;
    const newHistory = history.filter((h) => h.period !== period);
    setHistory(newHistory);
    persist({ mps, history: newHistory, comprados });
    flash('ok', `Cierre ${period} eliminado`);
    traza(`Eliminó cierre histórico ${period}`);
  };

  return (
    <>
      <PageHeader
        title="Compras · Maestro de Materias Primas"
        subtitle="Costo estándar & comparativo Std vs Real · Variaciones de precio"
        actions={
          <>
            <span className={`auth-pill ${authorized ? 'auth-pill-on' : 'auth-pill-off'}`}>
              {authorized ? '● AUTORIZADO' : '○ SOLO LECTURA'}
            </span>
            <button className="btn" onClick={() => setShowAdd(true)}>+ Materia Prima</button>
            <button className="btn" onClick={() => setShowHist(true)}>
              Histórico {history.length > 0 ? `(${history.length})` : ''}
            </button>
            <button className="btn btn-primary" onClick={handleCerrarMes}>Cerrar Mes</button>
            {status && (
              <span className={`status-pill dot ${status.kind}`}>{status.text}</span>
            )}
          </>
        }
      />

      <Panel
        title="Explosionado de MP con base en Programa de Producción"
        meta="Datos de Ingeniería · Click en celda para ver desglose de compra"
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>CÓD</th>
              <th>PRODUCTO</th>
              <th className="num" style={{ width: 110 }}>$ MP / U</th>
              {MONTHS.map((m) => <th key={m} className="num">{m}</th>)}
              <th className="num" style={{ background: '#0a0a0a', color: '#fff' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {ingSchedule.map((p) => {
              const product = ingProducts.find((x) => x.code === p.code);
              const mpUnit = product
                ? product.bom.reduce((s, r) => s + r.consumo * mpCost(r.code), 0)
                : 0;
              const monthly = p.months.map((n) => n * mpUnit);
              const total = monthly.reduce((s, n) => s + n, 0);
              return (
                <tr key={p.code}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td className="cell-master num">${fmtMoney(mpUnit)}</td>
                  {monthly.map((v, i) => (
                    <td
                      key={i}
                      className={`cell-formula num${v > 0 ? ' cell-clickable' : ''}`}
                      onClick={v > 0 ? () => setMpBreakdown({ productCode: p.code, monthIdx: i }) : undefined}
                    >
                      {v > 0 ? `$${fmtMoneyNoDec(v)}` : '—'}
                    </td>
                  ))}
                  <td className="cell-formula num"><b>{total > 0 ? `$${fmtMoneyNoDec(total)}` : '—'}</b></td>
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
                TOTAL MP / MES
              </td>
              {MONTHS.map((_, i) => {
                const sum = ingSchedule.reduce((s, p) => {
                  const product = ingProducts.find((x) => x.code === p.code);
                  const mpUnit = product
                    ? product.bom.reduce((a, r) => a + r.consumo * mpCost(r.code), 0)
                    : 0;
                  return s + p.months[i] * mpUnit;
                }, 0);
                return <td key={i} className="num">{sum > 0 ? `$${fmtMoneyNoDec(sum)}` : '—'}</td>;
              })}
              <td className="num" style={{ background: '#0a0a0a', color: '#fff' }}>
                ${fmtMoneyNoDec(
                  ingSchedule.reduce((s, p) => {
                    const product = ingProducts.find((x) => x.code === p.code);
                    const mpUnit = product
                      ? product.bom.reduce((a, r) => a + r.consumo * mpCost(r.code), 0)
                      : 0;
                    return s + p.months.reduce((a, n) => a + n * mpUnit, 0);
                  }, 0)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Costo Estándar de Materias Primas · Puesto en Planta"
        meta="Maestro alimentado por Compras · vigente para todo el ejercicio"
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>CÓD MP</th>
              <th>DESCRIPCIÓN</th>
              <th className="center" style={{ width: 60 }}>UM</th>
              <th className="num" style={{ width: 120 }}>COSTO STD</th>
              <th className="num" style={{ width: 120 }}>COSTO REAL</th>
              <th className="num" style={{ width: 120 }}>VAR / UM</th>
              <th className="num" style={{ width: 120 }}>VAR %</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {mps.map((m, i) => {
              const varU = m.costReal - m.costStd;
              const varP = m.costStd ? varU / m.costStd : 0;
              const cls = varU > 0 ? 'neg-num' : varU < 0 ? 'pos-num' : '';
              const sign = varU > 0 ? '+' : varU < 0 ? '−' : '';
              return (
                <tr key={m.code}>
                  <td className="mp-code">{m.code}</td>
                  <td>{m.name}</td>
                  <td className="center">{m.um}</td>
                  <td className="cell-input num" {...guardProps}>
                    <input
                      type="number"
                      step="0.01"
                      value={m.costStd}
                      onChange={(e) => update(i, 'costStd', e.target.value)}
                      onFocus={(e) => { e.target.select(); focusCell(m.costStd, `Costo Std ${m.name}`); }}
                      onBlur={(e) => blurCell(parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="cell-input num" {...guardProps}>
                    <input
                      type="number"
                      step="0.01"
                      value={m.costReal}
                      onChange={(e) => update(i, 'costReal', e.target.value)}
                      onFocus={(e) => { e.target.select(); focusCell(m.costReal, `Costo Real ${m.name}`); }}
                      onBlur={(e) => blurCell(parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className={`cell-formula num ${cls}`}>
                    {sign}{fmtMoney(Math.abs(varU))}
                  </td>
                  <td className={`cell-formula num ${cls}`}>
                    {sign}{(Math.abs(varP) * 100).toFixed(2)}%
                  </td>
                  <td className="center">
                    <button className="btn"
                            style={{ padding: '4px 8px', fontSize: 10 }}
                            onClick={() => handleRemoveMp(m.code)}
                            title="Eliminar materia prima">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel
        title={`Variaciones Mensuales · Std vs Real · ${vrPeriod}`}
        meta={`Impacto monetario sobre el costo de ventas · Periodo activo: ${vrPeriod}`}
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th>MP</th>
              <th>DESCRIPCIÓN</th>
              <th className="num">COMPRADOS</th>
              <th className="num">$ STD</th>
              <th className="num">$ REAL</th>
              <th className="num">VAR PRECIO</th>
              <th className="num">VAR $ TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {monthVariations.map((v) => {
              const cls = v.varT > 0 ? 'neg-num' : v.varT < 0 ? 'pos-num' : '';
              const sign = v.varT > 0 ? '+' : v.varT < 0 ? '−' : '';
              return (
                <tr key={v.code}>
                  <td className="mp-code">{v.code}</td>
                  <td>{v.name}</td>
                  <td className="cell-input num">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fmtUnits(Math.round(v.consumo))}
                      onChange={(e) => updateComprados(vrPeriodIdx, v.code, e.target.value)}
                      onFocus={(e) => { e.target.select(); focusCell(v.consumo, `Comprados ${v.name} · ${vrPeriod}`); }}
                      onBlur={(e) => blurCell(parseFloat(String(e.target.value).replace(/[^\d.\-]/g, '')) || 0)}
                    />
                  </td>
                  <td className="cell-formula num">${fmtMoneyNoDec(v.std)}</td>
                  <td className="cell-formula num">${fmtMoneyNoDec(v.real)}</td>
                  <td className={`cell-formula num ${cls}`}>
                    {sign}${Math.abs(v.varU).toFixed(2)}
                  </td>
                  <td className={`cell-formula num ${cls}`}>
                    {sign}${fmtMoneyNoDec(Math.abs(v.varT))}
                  </td>
                </tr>
              );
            })}
            {(() => {
              const totalVar = monthVariations.reduce((s, v) => s + v.varT, 0);
              const totalSign = totalVar > 0 ? '+' : totalVar < 0 ? '−' : '';
              return (
                <tr className="row-total">
                  <td colSpan={6} style={{
                    textAlign: 'right',
                    fontFamily: "'IBM Plex Sans'",
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                  }}>
                    TOTAL
                  </td>
                  <td className="num" style={{ background: '#0a0a0a', color: '#fff' }}>
                    {totalSign}${fmtMoneyNoDec(Math.abs(totalVar))}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </Panel>

      {showAdd && (
        <AddMpModal
          existing={mps.map((m) => m.code)}
          onAdd={handleAddMp}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showHist && (
        <HistoryModal
          history={history}
          onClose={() => setShowHist(false)}
          onDelete={handleDeleteHistory}
        />
      )}

      {mpBreakdown && (() => {
        const prod = ingProducts.find((p) => p.code === mpBreakdown.productCode);
        const sched = ingSchedule.find((s) => s.code === mpBreakdown.productCode);
        if (!prod || !sched) return null;
        const volume = sched.months[mpBreakdown.monthIdx] || 0;
        return (
          <MpBreakdownModal
            product={prod}
            volume={volume}
            month={MONTHS[mpBreakdown.monthIdx]}
            onClose={() => setMpBreakdown(null)}
          />
        );
      })()}

      {showAuthModal && (
        <AuthModal
          onAuthorize={handleAuthorize}
          onClose={() => setShowAuthModal(false)}
        />
      )}
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
              Solo personal con permiso de Compras puede modificar costos estándar y reales del maestro de materias primas.
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

function MpBreakdownModal({ product, volume, month, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = product.bom.map((mp) => {
    const costo = mpCost(mp.code);
    const unidades = mp.consumo * volume;
    const total = unidades * costo;
    return { ...mp, costo, unidades, total };
  });
  const totalUnidades = rows.reduce((s, r) => s + r.unidades, 0);
  const totalMonto = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '92vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3>Compra de Materia Prima</h3>
            <span className="explosionado-tag">
              {product.name} · {month} · {fmtUnits(volume)} U
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          <div className="scroll-x">
            <table className="cost-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>CÓD</th>
                  <th>MATERIA PRIMA</th>
                  <th className="center" style={{ width: 60 }}>UM</th>
                  <th className="num" style={{ width: 100 }}>CONSUMO / U</th>
                  <th className="num" style={{ width: 110 }}>UNIDADES</th>
                  <th className="num" style={{ width: 90 }}>COSTO</th>
                  <th className="num" style={{ width: 130 }}>TOTAL $</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td className="mp-code">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="center">{r.um}</td>
                    <td className="num">{fmtMoney(r.consumo, 4)}</td>
                    <td className="cell-formula num">{fmtMoneyNoDec(r.unidades)}</td>
                    <td className="cell-master num">{fmtMoney(r.costo)}</td>
                    <td className="cell-formula num">${fmtMoneyNoDec(r.total)}</td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td colSpan={4} style={{
                    textAlign: 'right',
                    fontFamily: "'IBM Plex Sans'",
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                  }}>
                    TOTAL COMPRA
                  </td>
                  <td className="num"><b>{fmtMoneyNoDec(totalUnidades)}</b></td>
                  <td></td>
                  <td className="num" style={{
                    fontFamily: "'IBM Plex Mono'",
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--gold)',
                  }}>
                    ${fmtMoneyNoDec(totalMonto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{
            margin: '14px 20px 0', padding: '12px 14px',
            background: 'var(--panel-alt)', border: '1px solid var(--line)',
            fontFamily: "'IBM Plex Serif'", fontSize: 12,
            color: 'var(--ink-soft)', fontStyle: 'italic',
          }}>
            <strong style={{
              color: 'var(--accent)', fontStyle: 'normal',
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
            }}>LECTURA</strong>
            &nbsp; Para producir {fmtUnits(volume)} unidades de {product.name} en {month} se requiere comprar el material listado arriba.
          </div>
        </div>
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: 'var(--panel-alt)',
        }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function AddMpModal({ existing, onAdd, onClose }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [um, setUm] = useState('KGS');
  const [costStd, setCostStd] = useState('');
  const [costReal, setCostReal] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const codeNum = parseInt(code, 10);
    if (!code || Number.isNaN(codeNum) || codeNum <= 0) {
      setError('Código inválido (numérico y positivo)');
      return;
    }
    if (existing.includes(codeNum)) {
      setError(`El código ${codeNum} ya existe`);
      return;
    }
    if (!name.trim()) { setError('Nombre requerido'); return; }
    const std = parseFloat(costStd);
    const real = parseFloat(costReal);
    if (Number.isNaN(std) || std < 0) { setError('Costo Std inválido'); return; }
    if (Number.isNaN(real) || real < 0) { setError('Costo Real inválido'); return; }
    onAdd({
      code: codeNum,
      name: name.trim().toUpperCase(),
      um: um.trim().toUpperCase() || 'KGS',
      costStd: std,
      costReal: real,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100%)' }}>
        <div className="modal-header">
          <h3>Nueva Materia Prima</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className="form-field">
                <span>CÓDIGO</span>
                <input type="number" value={code} onChange={(e) => setCode(e.target.value)}
                       placeholder="1011" autoFocus />
              </label>
              <label className="form-field">
                <span>DESCRIPCIÓN</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                       placeholder="MATERIA PRIMA K" />
              </label>
              <label className="form-field">
                <span>UNIDAD DE MEDIDA</span>
                <input type="text" value={um} onChange={(e) => setUm(e.target.value)}
                       placeholder="KGS / PZA / LTS" />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label className="form-field" style={{ flex: 1 }}>
                  <span>COSTO STD</span>
                  <input type="number" step="0.01" value={costStd}
                         onChange={(e) => setCostStd(e.target.value)} placeholder="0.00" />
                </label>
                <label className="form-field" style={{ flex: 1 }}>
                  <span>COSTO REAL</span>
                  <input type="number" step="0.01" value={costReal}
                         onChange={(e) => setCostReal(e.target.value)} placeholder="0.00" />
                </label>
              </div>
              {error && (
                <div style={{ color: 'var(--neg)', fontFamily: "'IBM Plex Mono'", fontSize: 11 }}>
                  {error}
                </div>
              )}
            </div>
          </div>
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            background: 'var(--panel-alt)',
          }}>
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Agregar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ history, onClose, onDelete }) {
  const [openPeriod, setOpenPeriod] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(960px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3>Histórico de Cierres</h3>
            <span className="modal-tag" style={{ color: 'var(--ink-soft)' }}>
              {history.length} {history.length === 1 ? 'cierre' : 'cierres'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          {history.length === 0 ? (
            <p style={{
              color: 'var(--ink-mute)',
              textAlign: 'center',
              padding: '32px 0',
              fontFamily: "'IBM Plex Serif'",
              fontStyle: 'italic',
            }}>
              No hay cierres registrados. Usa <b>Cerrar Mes</b> para guardar un snapshot del maestro y las variaciones del periodo activo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((h) => {
                const isOpen = openPeriod === h.period;
                const totalVarSign = h.totalVar > 0 ? '+' : h.totalVar < 0 ? '−' : '';
                const totalVarCls = h.totalVar > 0 ? 'var-neg' : h.totalVar < 0 ? 'var-pos' : '';
                const closedDate = new Date(h.closedAt).toLocaleString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={h.period} style={{ border: '1px solid var(--line)' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: 'var(--panel-alt)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <strong style={{ fontFamily: "'IBM Plex Serif'", fontSize: 14 }}>{h.period}</strong>
                        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: 'var(--ink-mute)' }}>
                          Cerrado · {closedDate} · {h.mps.length} MP
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={totalVarCls} style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 600, fontSize: 12 }}>
                          Var Total: {totalVarSign}${fmtMoneyNoDec(Math.abs(h.totalVar))}
                        </span>
                        <button className="btn" style={{ padding: '5px 10px', fontSize: 10 }}
                                onClick={() => setOpenPeriod(isOpen ? null : h.period)}>
                          {isOpen ? 'Ocultar' : 'Ver'}
                        </button>
                        <button className="btn" style={{ padding: '5px 10px', fontSize: 10 }}
                                onClick={() => onDelete(h.period)}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: 12 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Cód.</th>
                              <th>MP</th>
                              <th>UM</th>
                              <th>Costo Std</th>
                              <th>Costo Real</th>
                              <th>Var / U</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.mps.map((m) => {
                              const cls = m.varU > 0 ? 'var-neg' : m.varU < 0 ? 'var-pos' : '';
                              const sign = m.varU > 0 ? '+' : m.varU < 0 ? '−' : '';
                              return (
                                <tr key={m.code}>
                                  <td>{m.code}</td>
                                  <td>{m.name}</td>
                                  <td>{m.um}</td>
                                  <td>${fmtMoney(m.costStd)}</td>
                                  <td>${fmtMoney(m.costReal)}</td>
                                  <td className={cls}>{sign}${fmtMoney(Math.abs(m.varU))}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
