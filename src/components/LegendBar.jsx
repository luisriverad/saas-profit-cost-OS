export default function LegendBar() {
  return (
    <div className="legend-bar">
      <strong>CÓDIGO DE COLORES</strong>
      <div className="legend-item">
        <span className="legend-swatch input"></span>
        CAPTURA MANUAL · Input editable
      </div>
      <div className="legend-item">
        <span className="legend-swatch formula"></span>
        FÓRMULA · Calculado automático
      </div>
      <div className="legend-item">
        <span className="legend-swatch master"></span>
        MAESTRO · Tabla de referencia
      </div>
      <div className="meta">Última sync: 02·MAY·2026 09:14:22</div>
    </div>
  );
}
