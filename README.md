# PROFIT·COST·OS

**Sistema SaaS de Costeo Industrial Estándar** — The Profit Group

Prototipo navegable construido en **Vite + React 18**. Replica la lógica del modelo Excel
de costeo (BOM, rutas, cuotas/min, hojas de costeo, P&L) en una interfaz tipo
**Bloomberg Terminal modo claro**.

---

## Stack

- ⚡ **Vite 5** — Dev server instantáneo
- ⚛️ **React 18** — Componentes funcionales con hooks
- 🎨 **CSS Variables** — Sistema de diseño consistente
- 📐 **IBM Plex Serif / Mono / Sans** — Tipografía editorial-financiera

---

## Cómo arrancar

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar dev server
npm run dev
# → http://localhost:5173

# 3. Build de producción
npm run build

# 4. Previsualizar build
npm run preview
```

---

## Estructura del proyecto

```
profit-cost-os/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/         # Componentes UI compartidos
│   │   ├── Topbar.jsx
│   │   ├── TickerScroll.jsx
│   │   ├── CommandBar.jsx
│   │   ├── Navbar.jsx
│   │   ├── LegendBar.jsx
│   │   ├── PageHeader.jsx
│   │   ├── Panel.jsx
│   │   ├── CellInput.jsx
│   │   └── Footer.jsx
│   ├── modules/            # Cada módulo = una pestaña del SaaS
│   │   ├── Dashboard.jsx
│   │   ├── Ingenieria.jsx
│   │   ├── Compras.jsx
│   │   ├── RH.jsx
│   │   ├── Contabilidad.jsx
│   │   ├── Cuotas.jsx
│   │   ├── Costeo.jsx
│   │   └── PNL.jsx
│   ├── data/
│   │   └── seed.js         # Datos extraídos del Excel original
│   ├── utils/
│   │   └── format.js       # Formateo es-MX / MXN
│   ├── styles/
│   │   └── global.css      # Sistema de diseño completo
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## Convención de celdas (crítico)

Todo el sistema visual gira en torno a **3 tipos de celdas**:

| Tipo | Visual | CSS Class | Uso |
|------|--------|-----------|-----|
| **CAPTURA MANUAL** | Fondo azul claro + ícono ✎ + borde azul izquierdo | `cell-input` | Inputs editables (consumos, sueldos, costos MP, prestaciones) |
| **FÓRMULA** | Fondo blanco + ícono ƒ tenue | `cell-formula` | Calculados automáticos (multiplicaciones, sumas, totales) |
| **MAESTRO** | Fondo verde claro + ícono ◆ + borde verde izquierdo | `cell-master` | Tablas de referencia (catálogo cuentas, CC, códigos) |

La **leyenda visual** siempre presente en la parte superior del módulo activo
permite al usuario nunca perder de vista qué celda toca y cuál no.

---

## Sistema de diseño

Variables CSS en `src/styles/global.css`:

```css
--bg: #f7f7f4;            /* Background */
--ink: #0a0a0a;           /* Negro principal */
--accent: #c8421f;        /* Rojo terminal */
--accent-2: #1f5f3f;      /* Verde institucional */
--accent-3: #1c4f8b;      /* Azul Bloomberg */
--gold: #b88a2c;          /* Dorado títulos */
--input-bg: #e6f1fb;      /* Captura manual */
--master-bg: #eef5ec;     /* Tablas maestras */
```

**Tipografía:**
- `IBM Plex Serif` → Títulos editoriales (autoridad financiera)
- `IBM Plex Mono` → Datos numéricos (precisión tipo terminal)
- `IBM Plex Sans` → UI general

---

## Módulos del sistema

| # | ID | Módulo | Función |
|---|------|--------|---------|
| 00 | `dashboard` | Dashboard | Visión integral · KPIs · Estructura del costo |
| 01 | `ingenieria` | Ingeniería | BOM · Rutas · Programa de producción |
| 02 | `compras` | Compras | Maestro de MP · Variaciones Std vs Real |
| 03 | `rh` | Rec. Humanos | Plantilla · Sueldo integrado · Prestaciones |
| 04 | `contabilidad` | Contabilidad | Centros de costo · Catálogo de cuentas |
| 05 | `cuotas` | Cuotas/Min | Cálculo automático $/min por CC |
| 06 | `costeo` | Hojas de Costeo | Costo Std unitario por producto |
| 07 | `pnl` | P&L Forecast | Estado de Resultados mensualizado |

---

## Roadmap sugerido (próximos sprints)

- [ ] **Persistencia** — LocalStorage / Supabase / Firebase
- [ ] **Cálculo reactivo cross-módulo** — Que un cambio en Compras impacte en vivo en P&L
- [ ] **Multi-empresa** — Tenant switching
- [ ] **Módulos PROD REAL y VENTA REAL** del Excel original
- [ ] **Exportación** — Excel, PDF
- [ ] **Audit trail** — Quién cambió qué y cuándo
- [ ] **Autenticación** — Roles (Admin, Ingeniería, Compras, Finanzas)
- [ ] **Versión TSX** — Migrar a TypeScript

---

## Notas para Cursor

Este proyecto está diseñado para **iterar fácilmente desde Cursor**:

1. Cada módulo es un archivo independiente en `src/modules/`
2. Todos los datos seed están centralizados en `src/data/seed.js`
3. El sistema de diseño vive en `src/styles/global.css`
4. Componentes reutilizables en `src/components/`

**Tareas típicas:**
- Agregar un nuevo módulo → Crear `src/modules/NuevoModulo.jsx` + registrarlo en `App.jsx` y `Navbar.jsx`
- Cambiar branding → Editar variables CSS en `global.css`
- Agregar productos/MP → Editar `src/data/seed.js`

---

**The Profit Group** · v0.1 · Prototipo

`www.profit120.com` · `info@profit120.com`
