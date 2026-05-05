import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { VarianceBars } from '../components/Charts';
import { VARIATIONS } from '../data/seed';
import { fmtMoney, fmtMoneyNoDec, fmtMoneySigned } from '../utils/format';

export default function DashboardGeneral() {
  const [varSide, setVarSide] = useState(null);

  useEffect(() => {
    if (!varSide) return;
    const onKey = (e) => { if (e.key === 'Escape') setVarSide(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [varSide]);

  return (
    <>
      <PageHeader
        title="DASHBOARD GENERAL"
        subtitle="Visión ejecutiva consolidada · Ejercicio 2026"
      />

      <Panel
        title="Variaciones de Materia Prima · YTD"
        meta="Real vs Estándar · efecto sobre costo"
      >
        <div style={{ padding: '6px 18px 14px' }}>
          <VarianceBars data={VARIATIONS} width={1180} onSelect={setVarSide} />
          <div style={{
            marginTop: 10, paddingTop: 12,
            borderTop: '1px solid var(--line)',
            fontFamily: "'IBM Plex Serif'", fontSize: 12,
            color: 'var(--ink-soft)', fontStyle: 'italic',
          }}>
            <strong style={{
              color: 'var(--accent)', fontStyle: 'normal',
              fontFamily: "'IBM Plex Mono'", fontSize: 10, letterSpacing: '0.08em',
            }}>LECTURA</strong>
            &nbsp; MP-D compensa por –$557K, pero MP-A erosiona +$348K. Saldo neto favorable.
          </div>
        </div>
      </Panel>

      {varSide && <VariationModal side={varSide} onClose={() => setVarSide(null)} />}
    </>
  );
}

function VariationModal({ side, onClose }) {
  const isFav = side === 'favorable';
  const rows = VARIATIONS.filter((d) => isFav ? d.varT < 0 : d.varT > 0);
  const totalVar = rows.reduce((s, r) => s + r.varT, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3>Variaciones de Materia Prima</h3>
            <span className={`modal-tag ${isFav ? 'favorable' : 'desfavorable'}`}>
              {isFav ? 'Favorables' : 'Desfavorables'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          {rows.length === 0 ? (
            <p style={{ color: 'var(--ink-mute)', textAlign: 'center', padding: '20px 0' }}>
              No hay materias primas con variación {isFav ? 'favorable' : 'desfavorable'}.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cód.</th>
                  <th>Materia Prima</th>
                  <th>Consumo</th>
                  <th>Costo Std.</th>
                  <th>Costo Real</th>
                  <th>Var / U</th>
                  <th>Var. Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const stdU = r.std / r.consumo;
                  const realU = r.real / r.consumo;
                  const cls = r.varT < 0 ? 'var-pos' : 'var-neg';
                  return (
                    <tr key={r.code}>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{fmtMoneyNoDec(r.consumo)}</td>
                      <td>${fmtMoney(stdU)}</td>
                      <td>${fmtMoney(realU)}</td>
                      <td className={cls}>{fmtMoneySigned(r.varU)}</td>
                      <td className={cls}>${fmtMoneySigned(r.varT)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>TOTAL {isFav ? 'FAVORABLE' : 'DESFAVORABLE'}</td>
                  <td className={totalVar < 0 ? 'var-pos' : 'var-neg'}>
                    ${fmtMoneySigned(totalVar)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
