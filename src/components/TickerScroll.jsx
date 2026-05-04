import { TICKER_ITEMS } from '../data/seed';

export default function TickerScroll() {
  return (
    <div className="ticker-scroll">
      <div className="ticker-scroll-track">
        {TICKER_ITEMS.map(([lbl, val, dir], i) => (
          <span key={i}>
            <span className="lbl">{lbl}</span>
            <span className={`val${dir ? ' ' + dir : ''}`}>{val}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
