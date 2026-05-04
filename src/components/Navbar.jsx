const TABS = [
  { id: 'dashboard',     num: '00', label: 'Dashboard'       },
  { id: 'ventaReal',     num: '01', label: 'Venta Real'      },
  { id: 'ingenieria',    num: '02', label: 'Ingeniería'      },
  { id: 'compras',       num: '03', label: 'Compras'         },
  { id: 'rh',            num: '04', label: 'Rec. Humanos'    },
  { id: 'contabilidad',  num: '05', label: 'Contabilidad'    },
  { id: 'cuotas',        num: '06', label: 'Cuotas/Min'      },
  { id: 'costeo',        num: '07', label: 'Hojas de Costeo' },
  { id: 'pnl',           num: '08', label: 'P&L Forecast'    },
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
    </div>
  );
}
