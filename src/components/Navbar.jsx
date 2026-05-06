const TAB_GROUPS = [
  {
    id: 'a',
    tabs: [
      { id: 'general',     num: '00', label: 'Dashboard General' },
    ],
  },
  {
    id: 'b',
    tabs: [
      { id: 'ventaReal',   num: '01', label: 'Venta Real'        },
      { id: 'prodReal',    num: '02', label: 'Prod Real'         },
      { id: 'dashboard',   num: '03', label: 'Presupuesto 2026'  },
      { id: 'pnl',         num: '10', label: 'P&L Forecast'      },
    ],
  },
  {
    id: 'c',
    tabs: [
      { id: 'ingenieria',  num: '04', label: 'Ingeniería'        },
      { id: 'compras',     num: '05', label: 'Compras'           },
      { id: 'rh',          num: '06', label: 'Rec. Humanos'      },
      { id: 'contabilidad',num: '07', label: 'Contabilidad'      },
      { id: 'cuotas',      num: '08', label: 'Cuotas/Min'        },
      { id: 'costeo',      num: '09', label: 'Hojas de Costeo'   },
    ],
  },
];

const RIGHT_TABS = [
  { id: 'trazabilidad',  num: 'TR', label: 'Trazabilidad'      },
];

export default function Navbar({ active, onChange }) {
  return (
    <div className="navbar">
      <div className="navbar-tabs">
        {TAB_GROUPS.map((g) => (
          <div key={g.id} className={`nav-group nav-group-${g.id}`}>
            {g.tabs.map((t) => (
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
