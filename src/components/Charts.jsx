// =====================================================
// CHARTS — SVG nativo, paleta editorial/terminal
// =====================================================
import { MONTHS } from '../data/seed';

const COLORS = {
  ink:     '#0a0a0a',
  inkSoft: '#3c4045',
  inkMute: '#6b6e73',
  line:    '#d9d6cc',
  lineSft: '#ebe8de',
  accent:  '#c8421f',
  accent2: '#1f5f3f',
  accent3: '#1c4f8b',
  gold:    '#b88a2c',
  pos:     '#1f5f3f',
  neg:     '#c8421f',
};

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

// -----------------------------------------------------
// Línea/área: Ventas vs Costo Total · 12 meses
// -----------------------------------------------------
export function TrendChart({ ventas, costo, height = 320 }) {
  const W = 880, H = height;
  const padL = 70, padR = 24, padT = 36, padB = 42;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const all = [...ventas, ...costo];
  const max = Math.max(...all);
  const min = Math.min(...all);
  const range = max - min;
  const yMax = max + range * 0.08;
  const yMin = Math.max(0, min - range * 0.15);

  const x = (i) => padL + (i * innerW) / (ventas.length - 1);
  const y = (v) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const path = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const area = (arr) =>
    `${path(arr)} L${x(arr.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;

  // y-axis ticks (4)
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);
  const fmtAxis = (v) => `$${(v / 1_000_000).toFixed(0)}M`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="trend-ventas" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={COLORS.accent3} stopOpacity="0.22" />
          <stop offset="100%" stopColor={COLORS.accent3} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trend-costo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={COLORS.accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={COLORS.lineSft} strokeWidth="1" />
          <text x={padL - 10} y={y(v) + 4} fontFamily={MONO} fontSize="10"
                fill={COLORS.inkMute} textAnchor="end">{fmtAxis(v)}</text>
        </g>
      ))}

      {/* x-axis labels */}
      {MONTHS.map((m, i) => (
        <text key={m} x={x(i)} y={H - padB + 18} fontFamily={MONO} fontSize="10"
              fill={COLORS.inkMute} textAnchor="middle">{m}</text>
      ))}

      {/* costo area + line */}
      <path d={area(costo)}  fill="url(#trend-costo)"  />
      <path d={path(costo)}  fill="none" stroke={COLORS.accent}  strokeWidth="1.8" />

      {/* ventas area + line */}
      <path d={area(ventas)} fill="url(#trend-ventas)" />
      <path d={path(ventas)} fill="none" stroke={COLORS.accent3} strokeWidth="2" />

      {/* points */}
      {ventas.map((v, i) => (
        <circle key={`v${i}`} cx={x(i)} cy={y(v)} r="2.6" fill="#fff" stroke={COLORS.accent3} strokeWidth="1.5" />
      ))}
      {costo.map((v, i) => (
        <circle key={`c${i}`} cx={x(i)} cy={y(v)} r="2.2" fill="#fff" stroke={COLORS.accent} strokeWidth="1.3" />
      ))}

      {/* axis baseline */}
      <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke={COLORS.line} strokeWidth="1" />

      {/* data labels — ventas arriba del punto, costo abajo, con halo blanco */}
      {ventas.map((v, i) => (
        <text key={`vl${i}`} x={x(i)} y={y(v) - 9}
              fontFamily={MONO} fontSize="9.5" fontWeight="600"
              fill={COLORS.accent3} textAnchor="middle"
              stroke="#fff" strokeWidth="3" paintOrder="stroke">
          ${(v / 1_000_000).toFixed(1)}M
        </text>
      ))}
      {costo.map((v, i) => {
        const pct = ventas[i] ? (v / ventas[i]) * 100 : 0;
        return (
          <text key={`cl${i}`} x={x(i)} y={y(v) + 16}
                fontFamily={MONO} fontSize="9.5" fontWeight="600"
                fill={COLORS.accent} textAnchor="middle"
                stroke="#fff" strokeWidth="3" paintOrder="stroke">
            <tspan x={x(i)}>${(v / 1_000_000).toFixed(1)}M</tspan>
            <tspan x={x(i)} dy="11" fontSize="8.5" fontWeight="500">{pct.toFixed(1)}%</tspan>
          </text>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------
// Barras agrupadas: Margen Bruto vs Operativo (porcentaje)
// -----------------------------------------------------
export function MarginChart({ bruto, operativo, height = 280 }) {
  const W = 600, H = height;
  const padL = 50, padR = 18, padT = 34, padB = 42;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const all = [...bruto, ...operativo];
  const yMin = 0;
  const yMax = Math.max(...all) + 0.04;

  const slotW = innerW / bruto.length;
  const barW = 13;
  const gap = 3;
  const pairW = barW * 2 + gap;

  const slotLeft = (i) => padL + i * slotW + (slotW - pairW) / 2;
  const y = (v) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const barH = (v) => ((v - yMin) / (yMax - yMin)) * innerH;

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={COLORS.lineSft} strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 4} fontFamily={MONO} fontSize="10"
                fill={COLORS.inkMute} textAnchor="end">{(v * 100).toFixed(0)}%</text>
        </g>
      ))}

      {MONTHS.map((m, i) => (
        <text key={m} x={padL + i * slotW + slotW / 2} y={H - padB + 16}
              fontFamily={MONO} fontSize="9"
              fill={COLORS.inkMute} textAnchor="middle">{m}</text>
      ))}

      {/* baseline */}
      <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH}
            stroke={COLORS.ink} strokeWidth="1" />

      {bruto.map((v, i) => {
        const bx = slotLeft(i);
        const by = y(v);
        return (
          <g key={`b${i}`}>
            <rect x={bx} y={by} width={barW} height={barH(v)} fill={COLORS.accent2} />
            <text x={bx + barW / 2} y={by - 5}
                  fontFamily={MONO} fontSize="9" fontWeight="600"
                  fill={COLORS.accent2} textAnchor="middle"
                  stroke="#fff" strokeWidth="3" paintOrder="stroke">
              {(v * 100).toFixed(1)}
            </text>
          </g>
        );
      })}

      {operativo.map((v, i) => {
        const bx = slotLeft(i) + barW + gap;
        const by = y(v);
        return (
          <g key={`o${i}`}>
            <rect x={bx} y={by} width={barW} height={barH(v)} fill={COLORS.gold} />
            <text x={bx + barW / 2} y={by - 5}
                  fontFamily={MONO} fontSize="9" fontWeight="600"
                  fill={COLORS.gold} textAnchor="middle"
                  stroke="#fff" strokeWidth="3" paintOrder="stroke">
              {(v * 100).toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------
// Barras divergentes: Variaciones de MP
// -----------------------------------------------------
export function VarianceBars({ data, height, width = 560, onSelect, onItemClick }) {
  const rowH = 30;
  const padT = 14, padB = 22;
  const H = height ?? padT + padB + data.length * rowH;
  const W = width;
  const labelW = 150;
  const valW = 92;
  const padL = labelW + 10;
  const padR = valW + 12;
  const innerW = W - padL - padR;

  const max = Math.max(...data.map((d) => Math.abs(d.varT)));
  const center = padL + innerW / 2;
  const half = innerW / 2;
  const scale = (v) => (Math.abs(v) / max) * half;

  const fmt = (n) => {
    const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (n > 0) return `+$${abs}`;
    if (n < 0) return `−$${abs}`;
    return '$0';
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      {/* center axis */}
      <line x1={center} x2={center} y1={padT - 6} y2={H - padB + 4}
            stroke={COLORS.ink} strokeWidth="1" />
      <text x={padL} y={padT - 4} fontFamily={MONO} fontSize="9"
            fill={COLORS.pos} letterSpacing="0.08em"
            style={onSelect ? { cursor: 'pointer' } : undefined}
            onClick={onSelect ? () => onSelect('favorable') : undefined}>◀ FAVORABLE</text>
      <text x={W - padR} y={padT - 4} fontFamily={MONO} fontSize="9"
            fill={COLORS.neg} textAnchor="end" letterSpacing="0.08em"
            style={onSelect ? { cursor: 'pointer' } : undefined}
            onClick={onSelect ? () => onSelect('desfavorable') : undefined}>DESFAVORABLE ▶</text>

      {data.map((d, i) => {
        const cy = padT + 8 + i * rowH + rowH / 2;
        const w = scale(d.varT);
        const isNeg = d.varT < 0;
        const isZero = d.varT === 0;
        const barX = isNeg ? center - w : center;
        const color = isNeg ? COLORS.pos : (d.varT > 0 ? COLORS.neg : COLORS.line);
        const fmtStr = fmt(d.varT);
        const estTextW = fmtStr.length * 6.5; // ancho aproximado del texto del valor

        // Si la barra es lo bastante ancha, el valor va DENTRO en blanco;
        // si es corta, va FUERA con el color del estado.
        const insideThreshold = 76;
        const inside = !isZero && w >= insideThreshold;

        let textX, textAnchor, textColor;
        if (isZero) {
          textX = center + 8; textAnchor = 'start'; textColor = COLORS.inkMute;
        } else if (inside) {
          textX = isNeg ? barX + 8 : barX + w - 8;
          textAnchor = isNeg ? 'start' : 'end';
          textColor = '#fff';
        } else if (isNeg) {
          // Negativo afuera-izquierda; si chocaría con la etiqueta, se voltea afuera-derecha.
          const proposedX = barX - 6;
          const leftEdge = proposedX - estTextW;
          const labelRightSafe = labelW + 10; // colchón mínimo respecto a la etiqueta
          if (leftEdge < labelRightSafe) {
            textX = barX + w + 6;
            textAnchor = 'start';
          } else {
            textX = proposedX;
            textAnchor = 'end';
          }
          textColor = COLORS.pos;
        } else {
          textX = barX + w + 6;
          textAnchor = 'start';
          textColor = COLORS.neg;
        }

        const clickable = (onSelect || onItemClick) && !isZero;
        const side = isNeg ? 'favorable' : 'desfavorable';
        const handleClick = clickable
          ? () => {
              if (onItemClick) onItemClick({ ...d, side });
              else if (onSelect) onSelect(side);
            }
          : undefined;
        const groupStyle = clickable ? { cursor: 'pointer' } : undefined;

        return (
          <g key={d.code} style={groupStyle} onClick={handleClick}>
            {clickable && (
              <rect x={padL} y={cy - rowH / 2} width={W - padL - padR} height={rowH}
                    fill="transparent" />
            )}
            <text x={labelW} y={cy + 3.5} fontFamily={MONO} fontSize="11"
                  fill={COLORS.inkSoft} textAnchor="end">{d.name}</text>
            <rect x={barX} y={cy - 8} width={Math.max(w, isZero ? 0 : 1)} height="16"
                  fill={color} fillOpacity="0.85" />
            <text x={textX} y={cy + 3.5}
                  fontFamily={MONO} fontSize="11" fontWeight="600"
                  fill={textColor} textAnchor={textAnchor}>
              {fmt(d.varT)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------
// Donut: Estructura del costo
// -----------------------------------------------------
export function DonutChart({ data, size = 220, thickness = 32, centerLabel, centerValue }) {
  const r  = size / 2 - thickness / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  const C = 2 * Math.PI * r;

  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.lineSft} strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * C;
        const seg = (
          <circle key={i}
                  cx={cx} cy={cy} r={r}
                  fill="none" stroke={d.color} strokeWidth={thickness}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`} />
        );
        offset += dash;
        return seg;
      })}
      {centerLabel && (
        <text x={cx} y={cy - 6} fontFamily={MONO} fontSize="9"
              fill={COLORS.inkMute} textAnchor="middle" letterSpacing="0.08em">
          {centerLabel}
        </text>
      )}
      {centerValue && (
        <text x={cx} y={cy + 14} fontFamily="'IBM Plex Serif', serif" fontSize="20"
              fontWeight="600" fill={COLORS.ink} textAnchor="middle">
          {centerValue}
        </text>
      )}
    </svg>
  );
}

// -----------------------------------------------------
// Leyenda compacta
// -----------------------------------------------------
export function ChartLegend({ items }) {
  return (
    <div style={{
      display: 'flex', gap: 18, flexWrap: 'wrap',
      fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em',
      color: COLORS.inkSoft, padding: '0 4px',
    }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 14, height: 3, background: it.color, display: 'inline-block',
            borderRadius: 0,
            ...(it.dashed ? { background: `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)` } : {}),
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
