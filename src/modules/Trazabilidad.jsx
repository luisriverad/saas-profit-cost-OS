import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { getTrazas, clearTrazas } from '../utils/trazabilidad';

const fmtTs = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const maskPwd = (pwd) => {
  if (!pwd || pwd === '—') return '—';
  return '•'.repeat(pwd.length) + ` (${pwd})`;
};

export default function Trazabilidad() {
  const [filter, setFilter] = useState('todos');
  const [refreshTick, setRefreshTick] = useState(0);
  const trazas = getTrazas();

  const filtered = filter === 'todos'
    ? trazas
    : trazas.filter((t) => t.module === filter);

  const handleRefresh = () => setRefreshTick((n) => n + 1);

  const handleClear = () => {
    const ok = window.confirm('¿Borrar todo el log de trazabilidad? No se puede deshacer.');
    if (!ok) return;
    clearTrazas();
    setRefreshTick((n) => n + 1);
  };

  const handleExport = () => {
    const header = ['TIMESTAMP', 'PASSWORD', 'MODULO', 'ACCION'];
    const rows = trazas.map((t) => [
      t.ts,
      t.password,
      t.module,
      t.action,
    ]);
    const escape = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trazabilidad-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Trazabilidad · Bitácora de Movimientos"
        subtitle="Registro auditable de cambios autorizados por password"
        actions={
          <>
            <select
              className="month-picker-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '8px 28px 8px 12px',
                border: '1px solid var(--line)',
                fontFamily: "'IBM Plex Mono'",
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <option value="todos">TODOS LOS MÓDULOS</option>
              <option value="Ingeniería">INGENIERÍA</option>
              <option value="Compras">COMPRAS</option>
            </select>
            <button className="btn" onClick={handleRefresh}>Refrescar</button>
            <button className="btn" onClick={handleExport}>Exportar CSV</button>
            <button className="btn" onClick={handleClear}>Limpiar log</button>
          </>
        }
      />

      <Panel
        title={`Movimientos registrados · ${filtered.length} ${filtered.length === 1 ? 'evento' : 'eventos'}`}
        meta={`Tick ${refreshTick} · Cap. máx 500 entradas · Persiste en este equipo`}
        scrollX
      >
        {filtered.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            fontFamily: "'IBM Plex Serif'",
            fontStyle: 'italic',
            color: 'var(--ink-mute)',
          }}>
            No hay movimientos registrados todavía. Cuando autorices o edites algo en Ingeniería o Compras aparecerá aquí.
          </div>
        ) : (
          <table className="cost-table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>FECHA / HORA</th>
                <th style={{ width: 120 }}>MÓDULO</th>
                <th style={{ width: 160 }}>PASSWORD</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11 }}>{fmtTs(t.ts)}</td>
                  <td>
                    <span className={`traza-mod traza-mod-${t.module === 'Ingeniería' ? 'ing' : 'comp'}`}>
                      {t.module}
                    </span>
                  </td>
                  <td style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11 }}>{maskPwd(t.password)}</td>
                  <td>{t.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
