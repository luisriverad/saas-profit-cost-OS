const TABS = [
  { id: 'general',       num: '00', label: 'Dashboard General' },
  { id: 'dashboard',     num: '01', label: 'Presupuesto 2026'  },
  { id: 'ventaReal',     num: '02', label: 'Venta Real'        },
  { id: 'ingenieria',    num: '03', label: 'Ingeniería'        },
  { id: 'compras',       num: '04', label: 'Compras'           },
  { id: 'rh',            num: '05', label: 'Rec. Humanos'      },
  { id: 'contabilidad',  num: '06', label: 'Contabilidad'      },
  { id: 'cuotas',        num: '07', label: 'Cuotas/Min'        },
  { id: 'costeo',        num: '08', label: 'Hojas de Costeo'   },
  { id: 'pnl',           num: '09', label: 'P&L Forecast'      },
];

const RIGHT_TABS = [
  { id: 'trazabilidad',  num: 'TR', label: 'Trazabilidad'      },
];

export default function Navbar({ active, onChange }) {
  return (
    <div className="navbar">
      <div className="navbar-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab${active === t.id ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="num">{t.num}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="navbar-tabs navbar-tabs-right">
        {RIGHT_TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab nav-tab-traza${active === t.id ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="num">{t.num}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
