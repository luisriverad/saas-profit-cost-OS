import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import {
  PRODUCT_A_BOM, PRODUCT_A_ROUTING,
  PRODUCT_B_BOM, PRODUCT_B_ROUTING,
  PRODUCT_C_BOM, PRODUCT_C_ROUTING,
  RAW_MATERIALS,
} from '../data/seed';
import { fmtMoney } from '../utils/format';

const CUOTAS_BY_CC = {
  100: { mod: 0.2922, gv: 0.1651, gf: 0.2228 },
  110: { mod: 0.1565, gv: 0.0312, gf: 0.1162 },
  120: { mod: 0.2739, gv: 0.0477, gf: 0.2034 },
};
const wcToCC = (wc) => {
  if (wc.endsWith('1P')) return 100;
  if (wc.endsWith('2P')) return 110;
  return 120;
};

const PRODUCTS = [
  { code: 9001, name: 'PRODUCTO A', color: 'var(--accent)',   bom: PRODUCT_A_BOM, routing: PRODUCT_A_ROUTING },
  { code: 9002, name: 'PRODUCTO B', color: 'var(--accent-3)', bom: PRODUCT_B_BOM, routing: PRODUCT_B_ROUTING },
  { code: 9003, name: 'PRODUCTO C', color: 'var(--gold)',     bom: PRODUCT_C_BOM, routing: PRODUCT_C_ROUTING },
];

const computeHoja = (bom, routing) => {
  const mpRows = bom.map((b) => {
    const mp = RAW_MATERIALS.find((r) => r.code === b.code);
    const costo = mp?.costStd ?? 0;
    const totalMp = b.consumo * costo;
    return { ...b, costo, totalMp, total: totalMp };
  });
  const convRows = routing.map((r) => {
    const cuotas = CUOTAS_BY_CC[wcToCC(r.wc)];
    const mod = r.tiempo * cuotas.mod;
    const gv  = r.tiempo * cuotas.gv;
    const gf  = r.tiempo * cuotas.gf;
    return { ...r, mod, gv, gf, total: mod + gv + gf };
  });
  const mpSum  = mpRows.reduce((s, r) => s + r.totalMp, 0);
  const modSum = convRows.reduce((s, r) => s + r.mod, 0);
  const gvSum  = convRows.reduce((s, r) => s + r.gv, 0);
  const gfSum  = convRows.reduce((s, r) => s + r.gf, 0);
  const grandT = mpSum + modSum + gvSum + gfSum;
  return { mpRows, convRows, mpSum, modSum, gvSum, gfSum, grandT };
};

const csvEscape = (val) => {
  const s = String(val ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const buildCSV = (productSheets) => {
  const header = [
    'PRODUCTO_COD', 'PRODUCTO_NOMBRE', 'TIPO', 'COD_LINEA', 'DESCRIPCION', 'UM',
    'CONSUMO_O_TIEMPO', 'COSTO_O_CUOTA', 'MP', 'MOD', 'GV', 'GF', 'TOTAL_LINEA',
    'COSTO_ESTANDAR_UNITARIO',
  ];
  const lines = [header.join(',')];
  productSheets.forEach(({ product, hoja }) => {
    hoja.mpRows.forEach((r) => {
      lines.push([
        product.code, product.name, 'MP', r.code, r.name, r.um,
        r.consumo, r.costo.toFixed(4), r.totalMp.toFixed(4), '', '', '', r.total.toFixed(4),
        hoja.grandT.toFixed(4),
      ].map(csvEscape).join(','));
    });
    hoja.convRows.forEach((r) => {
      lines.push([
        product.code, product.name, 'CONV', r.wc, r.name, r.um,
        r.tiempo, r.cuota.toFixed(4), '', r.mod.toFixed(4), r.gv.toFixed(4), r.gf.toFixed(4), r.total.toFixed(4),
        hoja.grandT.toFixed(4),
      ].map(csvEscape).join(','));
    });
  });
  return lines.join('\n');
};

const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function Costeo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [recalcStamp, setRecalcStamp] = useState(0);
  const [recalcFlash, setRecalcFlash] = useState(false);
  const [exportFlash, setExportFlash] = useState(false);
  const [lastRecalc, setLastRecalc] = useState(null);

  const productSheets = useMemo(
    () => PRODUCTS.map((p) => ({ product: p, hoja: computeHoja(p.bom, p.routing) })),
    [recalcStamp],
  );
  const active = productSheets[activeIdx];

  const recalcAll = () => {
    setRecalcStamp((n) => n + 1);
    setLastRecalc(new Date());
    setRecalcFlash(true);
    setTimeout(() => setRecalcFlash(false), 1500);
  };

  const printSheet = () => window.print();

  const exportToERP = () => {
    const csv = buildCSV(productSheets);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `hojas-costeo-${stamp}.csv`, 'text/csv;charset=utf-8');
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 1500);
  };

  return (
    <>
      <PageHeader
        title="Hojas de Costeo · Costo Estándar Unitario"
        subtitle={
          lastRecalc
            ? `MP + MOD + GV + GF = Costo Std · Recalculado: ${lastRecalc.toLocaleTimeString('es-MX')}`
            : 'Materia Prima + Mano de Obra + Gtos Variables + Gtos Fijos = Costo Std.'
        }
        actions={
          <>
            <button className="btn" onClick={printSheet}>Imprimir Hoja</button>
            <button className="btn" onClick={exportToERP}>
              {exportFlash ? '✓ CSV Descargado' : 'Exportar a ERP'}
            </button>
            <button className="btn btn-primary" onClick={recalcAll}>
              {recalcFlash ? '✓ Todos Recalculados' : 'Recalcular Todos'}
            </button>
          </>
        }
      />

      <div className="grid-3">
        {productSheets.map((ps, i) => (
          <div
            className="stat-card"
            key={ps.product.code}
            onClick={() => setActiveIdx(i)}
            style={{
              cursor: 'pointer',
              outline: i === activeIdx ? '2px solid var(--ink)' : 'none',
              outlineOffset: -2,
            }}
          >
            <div className="stat-card-label">{ps.product.name} · {ps.product.code}</div>
            <div className="stat-card-value" style={{ color: ps.product.color }}>
              ${fmtMoney(ps.hoja.grandT)}
            </div>
            <div className="stat-card-foot">
              MP ${fmtMoney(ps.hoja.mpSum)} · Conv ${fmtMoney(ps.hoja.modSum + ps.hoja.gvSum + ps.hoja.gfSum)}
            </div>
          </div>
        ))}
      </div>

      <Panel
        title={`Hoja de Costeo · ${active.product.name} (${active.product.code})`}
        meta="Vigente desde: 01·ENE·2026 · Recalcular cuando cambien precios o consumos"
        scrollX
      >
        <table className="cost-table">
          <thead>
            <tr>
              <th>CÓD</th>
              <th>DESCRIPCIÓN</th>
              <th className="center">UM</th>
              <th className="num">CONSUMO</th>
              <th className="num">COSTO</th>
              <th className="num">MP</th>
              <th className="num">MOD</th>
              <th className="num">GTOS V</th>
              <th className="num">GTOS F</th>
              <th className="num" style={{ background: '#0a0a0a', color: '#fff' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {active.hoja.mpRows.map((r) => (
              <tr key={r.code}>
                <td className="mp-code">{r.code}</td>
                <td>{r.name}</td>
                <td className="center">{r.um}</td>
                <td className="cell-formula num">{r.consumo.toFixed(4)}</td>
                <td className="cell-formula num">{fmtMoney(r.costo)}</td>
                <td className="cell-formula num">{fmtMoney(r.totalMp)}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td className="cell-formula num"><b>{fmtMoney(r.total)}</b></td>
              </tr>
            ))}
            {active.hoja.convRows.map((r) => (
              <tr key={r.wc}>
                <td><span className="wc-code">{r.wc}</span></td>
                <td>{r.name}</td>
                <td className="center">{r.um}</td>
                <td className="cell-formula num">{r.tiempo.toFixed(3)}</td>
                <td className="cell-formula num">{fmtMoney(r.cuota, 4)}</td>
                <td>—</td>
                <td className="cell-formula num">{fmtMoney(r.mod, 4)}</td>
                <td className="cell-formula num">{fmtMoney(r.gv, 4)}</td>
                <td className="cell-formula num">{fmtMoney(r.gf, 4)}</td>
                <td className="cell-formula num"><b>{fmtMoney(r.total)}</b></td>
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
                COSTO ESTÁNDAR UNITARIO
              </td>
              <td className="num">${fmtMoney(active.hoja.mpSum)}</td>
              <td className="num">${fmtMoney(active.hoja.modSum)}</td>
              <td className="num">${fmtMoney(active.hoja.gvSum)}</td>
              <td className="num">${fmtMoney(active.hoja.gfSum)}</td>
              <td className="num" style={{
                background: '#fffae8',
                color: 'var(--gold)',
                fontSize: 13,
                fontWeight: 700,
              }}>
                ${fmtMoney(active.hoja.grandT)}
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  );
}
