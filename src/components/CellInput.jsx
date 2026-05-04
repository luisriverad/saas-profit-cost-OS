import { useState } from 'react';

/**
 * Celda de captura manual.
 * Branding: fondo azul claro + ícono ✎ + borde azul izquierdo.
 */
export default function CellInput({ value, onChange, formatter }) {
  const [val, setVal] = useState(value);

  const handleChange = (e) => {
    setVal(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
    <td className="cell-input num">
      <input
        type="text"
        value={formatter ? formatter(val) : val}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
      />
    </td>
  );
}
