import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { RAW_MATERIALS, VARIATIONS } from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtUnits } from '../utils/format';

const STORAGE_KEY = 'compras.workspace.v1';

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
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

export default function Compras() {
  const stored = readStored();
  const [mps, setMps] = useState(() => stored?.mps ?? RAW_MATERIALS);
  const [history, setHistory] = useState(() => stored?.history ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [status, setStatus] = useState(null);
  const timerRef = useRef(null);

  const flash = (kind, text, ms = 2800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const update = (i, field, v) => {
    const next = [...mps];
    next[i] = { ...next[i], [field]: parseFloat(v) || 0 };
    setMps(next);
    persist({ mps: next, history });
  };

  const handleAddMp = ({ code, name, um, costStd, costReal }) => {
    const next = [...mps, { code, name, um, costStd, costReal }];
    setMps(next);
    persist({ mps: next, history });
    flash('ok', `Materia prima ${code} · ${name} agregada`);
    setShowAdd(false);
  };

  const handleRemoveMp = (code) => {
    const next = mps.filter((m) => m.code !== code);
    setMps(next);
    persist({ mps: next, history });
    flash('ok', `MP ${code} eliminada`);
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
    persist({ mps, history: newHistory });
    flash('ok', `Mes cerrado · ${period}`);
  };

  const handleDeleteHistory = (period) => {
    const ok = window.confirm(`¿Eliminar el cierre de ${period}? No se puede deshacer.`);
    if (!ok) return;
    const newHistory = history.filter((h) => h.period !== period);
    setHistory(newHistory);
    persist({ mps, history: newHistory });
    flash('ok', `Cierre ${period} eliminado`);
  };

  return (
    <>
      <PageHeader
        title="Compras · Maestro de Materias Primas"
        subtitle="Costo estándar & comparativo Std vs Real · Variaciones de precio"
        actions={
          <>
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
                  <td className="cell-input num">
                    <input
                      type="number"
                      step="0.01"
                      value={m.costStd}
                      onChange={(e) => update(i, 'costStd', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="cell-input num">
                    <input
                      type="number"
                      step="0.01"
                      value={m.costReal}
                      onChange={(e) => update(i, 'costReal', e.target.value)}
                      onFocus={(e) => e.target.select()}
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
        title="Variaciones Mensuales · Std vs Real"
        meta="Impacto monetario sobre el costo de ventas"
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th>MP</th>
              <th>DESCRIPCIÓN</th>
              <th className="num">CONSUMO REAL</th>
              <th className="num">$ STD</th>
              <th className="num">$ REAL</th>
              <th className="num">VAR PRECIO</th>
              <th className="num">VAR $ TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {VARIATIONS.map((v) => {
              const cls = v.varT > 0 ? 'neg-num' : v.varT < 0 ? 'pos-num' : '';
              const sign = v.varT > 0 ? '+' : v.varT < 0 ? '−' : '';
              return (
                <tr key={v.code}>
                  <td className="mp-code">{v.code}</td>
                  <td>{v.name}</td>
                  <td className="cell-master num">{fmtUnits(v.consumo)}</td>
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
    </>
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
