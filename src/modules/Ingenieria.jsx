import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import {
  PRODUCT_A_BOM, PRODUCT_A_ROUTING,
  PRODUCT_B_BOM, PRODUCT_B_ROUTING,
  PRODUCT_C_BOM, PRODUCT_C_ROUTING,
  PRODUCTION_SCHEDULE, MONTHS,
} from '../data/seed';
import { fmtMoney, fmtUnits } from '../utils/format';

const STORAGE_KEY = 'ingenieria.workspace.v2';

const MP_COSTS = {
  1001: 100, 1002: 55, 1003: 20, 1004: 34, 1005: 15,
  1006: 67,  1007: 22, 1008: 35, 1009: 15, 1010: 10,
};
const mpCost = (code) => MP_COSTS[code] ?? 0;

const BASE_PRODUCTS = [
  { code: 9001, name: 'PRODUCTO A', bom: PRODUCT_A_BOM, routing: PRODUCT_A_ROUTING },
  { code: 9002, name: 'PRODUCTO B', bom: PRODUCT_B_BOM, routing: PRODUCT_B_ROUTING },
  { code: 9003, name: 'PRODUCTO C', bom: PRODUCT_C_BOM, routing: PRODUCT_C_ROUTING },
];

const readStored = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

function parseCsv(text) {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        fields.push(field);
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field);
    return fields.map((f) => f.trim());
  });
}

export default function Ingenieria() {
  const stored = readStored();
  const [products, setProducts] = useState(() => stored?.products ?? BASE_PRODUCTS);
  const [schedule, setSchedule] = useState(() => stored?.schedule ?? PRODUCTION_SCHEDULE);
  const [extraProducts, setExtraProducts] = useState(() => stored?.extraProducts ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [importTarget, setImportTarget] = useState(null); // product code being imported into
  const [status, setStatus] = useState(null);

  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const flash = (kind, text, ms = 2800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus({ kind, text });
    timerRef.current = setTimeout(() => setStatus(null), ms);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const updateProductBom = (productCode, rowIdx, field, value) => {
    setProducts((prev) => prev.map((p) => {
      if (p.code !== productCode) return p;
      const newBom = p.bom.map((r, i) => i === rowIdx
        ? { ...r, [field]: field === 'consumo' ? (parseFloat(value) || 0) : value }
        : r
      );
      return { ...p, bom: newBom };
    }));
  };

  const updateProductRouting = (productCode, rowIdx, field, value) => {
    setProducts((prev) => prev.map((p) => {
      if (p.code !== productCode) return p;
      const newR = p.routing.map((r, i) => i === rowIdx
        ? { ...r, [field]: field === 'tiempo' ? (parseFloat(value) || 0) : value }
        : r
      );
      return { ...p, routing: newR };
    }));
  };

  const updateScheduleMonth = (productCode, monthIdx, value) => {
    const num = parseInt(String(value).replace(/[^\d-]/g, ''), 10) || 0;
    setSchedule((prev) =>
      prev.map((p) => p.code === productCode
        ? { ...p, months: p.months.map((m, i) => i === monthIdx ? num : m) }
        : p
      )
    );
  };

  const handleAddProduct = ({ code, name }) => {
    setExtraProducts((prev) => [...prev, { code, name }]);
    setSchedule((prev) => [...prev, { code, name, months: Array(12).fill(0) }]);
    flash('ok', `Producto ${code} · ${name} agregado`);
    setShowAdd(false);
  };

  const handleRemoveExtra = (code) => {
    setExtraProducts((prev) => prev.filter((p) => p.code !== code));
    setSchedule((prev) => prev.filter((p) => p.code !== code));
    flash('ok', `Producto ${code} eliminado`);
  };

  const handleImportClick = (productCode) => {
    setImportTarget(productCode);
    fileInputRef.current?.click();
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = importTarget;
    setImportTarget(null);
    if (!file || target == null) return;
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) { flash('busy', 'CSV vacío'); return; }
      const header = rows.shift().map((h) => h.toLowerCase());
      const need = ['code', 'name', 'um', 'consumo'];
      const idx = Object.fromEntries(need.map((k) => [k, header.indexOf(k)]));
      if (need.some((k) => idx[k] === -1)) {
        flash('busy', 'CSV inválido · encabezados esperados: code,name,um,consumo', 4000);
        return;
      }
      const newBom = rows.map((r) => ({
        code: parseInt(r[idx.code], 10) || 0,
        name: r[idx.name] || '',
        um: r[idx.um] || '',
        consumo: parseFloat(r[idx.consumo]) || 0,
      })).filter((r) => r.code > 0 && r.name);
      if (newBom.length === 0) {
        flash('busy', 'No se encontraron renglones válidos en el CSV', 4000);
        return;
      }
      setProducts((prev) => prev.map((p) => p.code === target ? { ...p, bom: newBom } : p));
      const targetName = products.find((p) => p.code === target)?.name ?? target;
      flash('ok', `BOM importada en ${targetName} · ${newBom.length} renglones`);
    } catch (err) {
      flash('busy', `Error al leer CSV: ${err.message}`, 4000);
    }
  };

  const handleSaveBom = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ products, schedule, extraProducts })
      );
      const t = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      flash('ok', `BOM guardada · ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`);
    } catch (err) {
      flash('busy', `No se pudo guardar: ${err.message}`, 4000);
    }
  };

  const existingCodes = [...products.map((p) => p.code), ...extraProducts.map((p) => p.code)];

  return (
    <>
      <PageHeader
        title="Ingeniería · BOM & Rutas"
        subtitle="Lista de materiales · Tiempos de proceso · Rutas de producción"
        actions={
          <>
            <button className="btn" onClick={() => setShowAdd(true)}>+ Producto</button>
            <input
              type="file"
              accept=".csv,text/csv"
              ref={fileInputRef}
              onChange={handleImportCsv}
              style={{ display: 'none' }}
            />
            <button className="btn btn-primary" onClick={handleSaveBom}>Guardar BOM</button>
            {status && (
              <span className={`status-pill dot ${status.kind}`}>{status.text}</span>
            )}
          </>
        }
      />

      {products.map((p) => (
        <ProductPanel
          key={p.code}
          product={p}
          onUpdateBom={(i, field, val) => updateProductBom(p.code, i, field, val)}
          onUpdateRouting={(i, field, val) => updateProductRouting(p.code, i, field, val)}
          onImport={() => handleImportClick(p.code)}
        />
      ))}

      {extraProducts.map((p) => (
        <Panel
          key={p.code}
          title={`Producto ${p.code} · ${p.name}`}
          meta={
            <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
              <span>Producto agregado · BOM pendiente</span>
              <button className="btn" style={{ padding: '4px 10px', fontSize: 10 }}
                      onClick={() => handleRemoveExtra(p.code)}>
                Eliminar
              </button>
            </span>
          }
        >
          <div style={{
            padding: '14px 16px',
            fontFamily: "'IBM Plex Mono'",
            fontSize: 11,
            color: 'var(--ink-mute)',
          }}>
            Captura BOM y rutas para este producto desde el módulo de carga · Programa de producción ya disponible abajo.
          </div>
        </Panel>
      ))}

      <Panel
        title="Programa de Producción · Volumen Mensual"
        meta="Captura de unidades a producir por mes · Alimenta valuación y P&L"
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>CÓD</th>
              <th>PRODUCTO</th>
              {MONTHS.map((m) => <th key={m} className="num">{m}</th>)}
              <th className="num" style={{ background: '#0a0a0a', color: '#fff' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((p) => {
              const total = p.months.reduce((s, n) => s + n, 0);
              return (
                <tr key={p.code}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  {p.months.map((n, i) => (
                    <td key={i} className="cell-input num">
                      <input
                        type="text"
                        value={fmtUnits(n)}
                        onChange={(e) => updateScheduleMonth(p.code, i, e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                  ))}
                  <td className="cell-formula num"><b>{fmtUnits(total)}</b></td>
                </tr>
              );
            })}
            <tr className="row-total">
              <td colSpan={2} style={{
                fontFamily: "'IBM Plex Sans'",
                textTransform: 'uppercase',
                fontSize: 10,
                letterSpacing: '0.08em',
              }}>
                TOTAL UNIDADES
              </td>
              {MONTHS.map((_, i) => {
                const sum = schedule.reduce((s, p) => s + p.months[i], 0);
                return <td key={i} className="num">{fmtUnits(sum)}</td>;
              })}
              <td className="num" style={{ background: '#0a0a0a', color: '#fff' }}>
                {fmtUnits(schedule.reduce((s, p) => s + p.months.reduce((a, b) => a + b, 0), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {showAdd && (
        <AddProductModal
          existing={existingCodes}
          onAdd={handleAddProduct}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
}

function ProductPanel({ product, onUpdateBom, onUpdateRouting, onImport }) {
  const mpRows = product.bom.map((mp) => {
    const costo = mpCost(mp.code);
    return { ...mp, costo, totalMp: mp.consumo * costo };
  });
  const mpTotal = mpRows.reduce((s, r) => s + r.totalMp, 0);

  const convRows = product.routing.map((r) => ({ ...r, costo: r.tiempo * r.cuota }));
  const convTotal = convRows.reduce((s, r) => s + r.costo, 0);

  const grandTotal = mpTotal + convTotal;

  return (
    <Panel
      title={`Producto ${product.code} · ${product.name}`}
      meta={
        <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
          <span>{product.bom.length} MP · {product.routing.length} Procesos · Costo Std: <strong style={{ color: 'var(--ink)' }}>${fmtMoney(grandTotal)}</strong></span>
          <button className="btn" style={{ padding: '4px 10px', fontSize: 10 }} onClick={onImport}>
            Importar CSV
          </button>
        </span>
      }
    >
      <div className="section-tag tag-mp">A) Lista de Materiales</div>
      <div className="scroll-x">
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>CÓD</th>
              <th>DESCRIPCIÓN</th>
              <th className="center" style={{ width: 60 }}>UM</th>
              <th className="num" style={{ width: 90 }}>CONSUMO</th>
              <th className="num" style={{ width: 90 }}>COSTO</th>
              <th className="num" style={{ width: 110 }}>TOTAL MP</th>
            </tr>
          </thead>
          <tbody>
            {mpRows.map((r, i) => (
              <tr key={`${r.code}-${i}`}>
                <td className="mp-code">{r.code}</td>
                <td>{r.name}</td>
                <td className="center">{r.um}</td>
                <td className="cell-input num">
                  <input
                    type="number"
                    step="0.0001"
                    value={r.consumo}
                    onChange={(e) => onUpdateBom(i, 'consumo', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
                <td className="cell-master num">{fmtMoney(r.costo)}</td>
                <td className="cell-formula num">{fmtMoney(r.totalMp)}</td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={5} style={{
                textAlign: 'right',
                fontFamily: "'IBM Plex Sans'",
                textTransform: 'uppercase',
                fontSize: 10,
                letterSpacing: '0.08em',
              }}>
                SUBTOTAL MATERIA PRIMA
              </td>
              <td className="num">${fmtMoney(mpTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section-tag tag-rt">B) Tiempos &amp; Rutas de Producción</div>
      <div className="scroll-x">
        <table className="cost-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>WC</th>
              <th>PROCESO</th>
              <th className="center" style={{ width: 60 }}>UM</th>
              <th className="num" style={{ width: 90 }}>TIEMPO</th>
              <th className="num" style={{ width: 90 }}>CUOTA/MIN</th>
              <th className="num" style={{ width: 110 }}>COSTO CONV</th>
            </tr>
          </thead>
          <tbody>
            {convRows.map((r, i) => (
              <tr key={`${r.wc}-${i}`}>
                <td><span className="wc-code">{r.wc}</span></td>
                <td>{r.name}</td>
                <td className="center">{r.um}</td>
                <td className="cell-input num">
                  <input
                    type="number"
                    step="0.001"
                    value={r.tiempo}
                    onChange={(e) => onUpdateRouting(i, 'tiempo', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </td>
                <td className="cell-formula num">{fmtMoney(r.cuota, 4)}</td>
                <td className="cell-formula num">{fmtMoney(r.costo)}</td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={5} style={{
                textAlign: 'right',
                fontFamily: "'IBM Plex Sans'",
                textTransform: 'uppercase',
                fontSize: 10,
                letterSpacing: '0.08em',
              }}>
                SUBTOTAL CONVERSIÓN
              </td>
              <td className="num">${fmtMoney(convTotal)}</td>
            </tr>
            <tr className="row-total" style={{ background: '#fffae8' }}>
              <td colSpan={5} style={{
                textAlign: 'right',
                fontFamily: "'IBM Plex Serif'",
                fontSize: 13,
                fontWeight: 700,
                padding: '11px 10px',
              }}>
                COSTO ESTÁNDAR {product.name}
              </td>
              <td className="num" style={{
                fontFamily: "'IBM Plex Mono'",
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--gold)',
              }}>
                ${fmtMoney(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AddProductModal({ existing, onAdd, onClose }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
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
      setError('Código inválido (debe ser numérico y positivo)');
      return;
    }
    if (existing.includes(codeNum)) {
      setError(`El código ${codeNum} ya existe`);
      return;
    }
    if (!name.trim()) {
      setError('Nombre requerido');
      return;
    }
    onAdd({ code: codeNum, name: name.trim().toUpperCase() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)' }}>
        <div className="modal-header">
          <h3>Nuevo Producto</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className="form-field">
                <span>CÓDIGO</span>
                <input
                  type="number"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="9004"
                  autoFocus
                />
              </label>
              <label className="form-field">
                <span>NOMBRE</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="PRODUCTO D"
                />
              </label>
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
