export default function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand-logo-frame">
          <img
            src="/logo_n.png"
            alt="Manufacturas Adir SA de CV"
            className="brand-logo"
          />
        </div>
        <div className="ticker">
          <span><span style={{ color: '#9c9c9c' }}>MARGEN BRUTO</span> <b>28.6%</b> <span className="up">▲ 0.4</span></span>
          <span><span style={{ color: '#9c9c9c' }}>UTIL OP</span> <b>20.0%</b> <span className="up">▲ 0.1</span></span>
          <span><span style={{ color: '#9c9c9c' }}>VAR PRECIO MP</span> <b className="down">+$348K</b></span>
          <span><span style={{ color: '#9c9c9c' }}>CUOTA/MIN GLOBAL</span> <b>$1.509</b></span>
        </div>
      </div>
      <div className="topbar-right">
        <span style={{ color: '#9c9c9c' }}>EJERCICIO 2026</span>
        <span className="live"><span className="live-dot"></span>SYNC</span>
      </div>
    </div>
  );
}
