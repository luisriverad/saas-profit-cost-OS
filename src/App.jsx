import { useState } from 'react';

import Topbar from './components/Topbar';
import TickerScroll from './components/TickerScroll';
import Navbar from './components/Navbar';
import LegendBar from './components/LegendBar';
import Footer from './components/Footer';

import Dashboard from './modules/Dashboard';
import VentaReal from './modules/VentaReal';
import Ingenieria from './modules/Ingenieria';
import Compras from './modules/Compras';
import RH from './modules/RH';
import Contabilidad from './modules/Contabilidad';
import Cuotas from './modules/Cuotas';
import Costeo from './modules/Costeo';
import PNLView from './modules/PNL';

const MODULES = {
  dashboard:    Dashboard,
  ventaReal:    VentaReal,
  ingenieria:   Ingenieria,
  compras:      Compras,
  rh:           RH,
  contabilidad: Contabilidad,
  cuotas:       Cuotas,
  costeo:       Costeo,
  pnl:          PNLView,
};

export default function App() {
  const [active, setActive] = useState('dashboard');

  const handleChange = (id) => {
    setActive(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ActiveModule = MODULES[active];

  return (
    <>
      <Topbar />
      <TickerScroll />
      <Navbar active={active} onChange={handleChange} />
      <LegendBar />

      <div className="content">
        <ActiveModule />
      </div>

      <Footer />
    </>
  );
}
