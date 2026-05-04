// =====================================================
// SEED DATA — Extraído de COSTEO_MANUFACTURA.xlsx
// =====================================================

export const RAW_MATERIALS = [
  { code: 1001, name: 'MATERIA PRIMA A', um: 'KGS', costStd: 100.0, costReal: 105.0 },
  { code: 1002, name: 'MATERIA PRIMA B', um: 'KGS', costStd: 55.0,  costReal: 56.0  },
  { code: 1003, name: 'MATERIA PRIMA C', um: 'KGS', costStd: 20.0,  costReal: 21.0  },
  { code: 1004, name: 'MATERIA PRIMA D', um: 'KGS', costStd: 34.0,  costReal: 30.0  },
  { code: 1005, name: 'MATERIA PRIMA E', um: 'KGS', costStd: 15.0,  costReal: 15.0  },
  { code: 1006, name: 'MATERIA PRIMA F', um: 'KGS', costStd: 67.0,  costReal: 67.0  },
  { code: 1007, name: 'MATERIA PRIMA G', um: 'KGS', costStd: 22.0,  costReal: 18.0  },
  { code: 1008, name: 'MATERIA PRIMA H', um: 'KGS', costStd: 35.0,  costReal: 35.0  },
  { code: 1009, name: 'MATERIA PRIMA I', um: 'PZA', costStd: 15.0,  costReal: 15.0  },
  { code: 1010, name: 'MATERIA PRIMA J', um: 'PZA', costStd: 10.0,  costReal: 10.0  },
];

export const PRODUCT_A_BOM = [
  { code: 1001, name: 'MATERIA PRIMA A', um: 'KGS', consumo: 1.0  },
  { code: 1002, name: 'MATERIA PRIMA B', um: 'KGS', consumo: 0.5  },
  { code: 1003, name: 'MATERIA PRIMA C', um: 'KGS', consumo: 0.32 },
  { code: 1004, name: 'MATERIA PRIMA D', um: 'KGS', consumo: 2.0  },
  { code: 1005, name: 'MATERIA PRIMA E', um: 'KGS', consumo: 0.67 },
  { code: 1006, name: 'MATERIA PRIMA F', um: 'KGS', consumo: 0.2  },
  { code: 1007, name: 'MATERIA PRIMA G', um: 'KGS', consumo: 0.1  },
  { code: 1008, name: 'MATERIA PRIMA H', um: 'KGS', consumo: 0.8  },
  { code: 1009, name: 'MATERIA PRIMA I', um: 'PZA', consumo: 1.0  },
  { code: 1010, name: 'MATERIA PRIMA J', um: 'PZA', consumo: 1.0  },
];

export const PRODUCT_A_ROUTING = [
  { wc: 'WC1·1P', name: 'TIEMPO DE PROCESO 1 · CC100 Conversión 1', um: 'MIN', tiempo: 5, cuota: 0.6800 },
  { wc: 'WC1·2P', name: 'TIEMPO DE PROCESO 2 · CC110 Conversión 2', um: 'MIN', tiempo: 7, cuota: 0.3039 },
  { wc: 'WC1·3P', name: 'TIEMPO DE PROCESO 3 · CC120 Conversión 3', um: 'MIN', tiempo: 4, cuota: 0.5251 },
];

export const PRODUCT_B_BOM = [
  { code: 1001, name: 'MATERIA PRIMA A', um: 'KGS', consumo: 0.8542 },
  { code: 1002, name: 'MATERIA PRIMA B', um: 'KGS', consumo: 0.4271 },
  { code: 1003, name: 'MATERIA PRIMA C', um: 'KGS', consumo: 0.2733 },
  { code: 1004, name: 'MATERIA PRIMA D', um: 'KGS', consumo: 1.7084 },
  { code: 1005, name: 'MATERIA PRIMA E', um: 'KGS', consumo: 0.5723 },
  { code: 1006, name: 'MATERIA PRIMA F', um: 'KGS', consumo: 0.1708 },
  { code: 1007, name: 'MATERIA PRIMA G', um: 'KGS', consumo: 0.0854 },
  { code: 1008, name: 'MATERIA PRIMA H', um: 'KGS', consumo: 0.6834 },
  { code: 1009, name: 'MATERIA PRIMA I', um: 'PZA', consumo: 0.8542 },
  { code: 1010, name: 'MATERIA PRIMA J', um: 'PZA', consumo: 0.8542 },
];

export const PRODUCT_B_ROUTING = [
  { wc: 'WC2·1P', name: 'TIEMPO DE PROCESO 1 · CC100 Conversión 1', um: 'MIN', tiempo: 5.498, cuota: 0.6800 },
  { wc: 'WC2·2P', name: 'TIEMPO DE PROCESO 2 · CC110 Conversión 2', um: 'MIN', tiempo: 7.697, cuota: 0.3039 },
  { wc: 'WC2·3P', name: 'TIEMPO DE PROCESO 3 · CC120 Conversión 3', um: 'MIN', tiempo: 4.398, cuota: 0.5251 },
];

export const PRODUCT_C_BOM = [
  { code: 1001, name: 'MATERIA PRIMA A', um: 'KGS', consumo: 1.0455 },
  { code: 1002, name: 'MATERIA PRIMA B', um: 'KGS', consumo: 0.5228 },
  { code: 1003, name: 'MATERIA PRIMA C', um: 'KGS', consumo: 0.3346 },
  { code: 1004, name: 'MATERIA PRIMA D', um: 'KGS', consumo: 2.0910 },
  { code: 1005, name: 'MATERIA PRIMA E', um: 'KGS', consumo: 0.7005 },
  { code: 1006, name: 'MATERIA PRIMA F', um: 'KGS', consumo: 0.2091 },
  { code: 1007, name: 'MATERIA PRIMA G', um: 'KGS', consumo: 0.1046 },
  { code: 1008, name: 'MATERIA PRIMA H', um: 'KGS', consumo: 0.8364 },
  { code: 1009, name: 'MATERIA PRIMA I', um: 'PZA', consumo: 1.0455 },
  { code: 1010, name: 'MATERIA PRIMA J', um: 'PZA', consumo: 1.0455 },
];

export const PRODUCT_C_ROUTING = [
  { wc: 'WC3·1P', name: 'TIEMPO DE PROCESO 1 · CC100 Conversión 1', um: 'MIN', tiempo: 4.495, cuota: 0.6800 },
  { wc: 'WC3·2P', name: 'TIEMPO DE PROCESO 2 · CC110 Conversión 2', um: 'MIN', tiempo: 6.294, cuota: 0.3039 },
  { wc: 'WC3·3P', name: 'TIEMPO DE PROCESO 3 · CC120 Conversión 3', um: 'MIN', tiempo: 3.596, cuota: 0.5251 },
];

export const PRODUCTION_SCHEDULE = [
  {
    code: 9001, name: 'PRODUCTO A',
    months: [25000, 23077, 25000, 23077, 24000, 23077, 25000, 23077, 23077, 25000, 24000, 25000],
  },
  {
    code: 9002, name: 'PRODUCTO B',
    months: [30000, 27692, 30000, 27692, 28800, 27692, 30000, 27692, 27692, 30000, 28800, 30000],
  },
  {
    code: 9003, name: 'PRODUCTO C',
    months: [20000, 18462, 20000, 18462, 19200, 18462, 20000, 18462, 18462, 20000, 19200, 20000],
  },
];

export const STAFF = [
  { cc: 100, name: 'JUAN PEREZ GARCIA',         puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'EDGAR XOCHITL RAMIREZ',     puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'SONIA YAÑEZ MARTINEZ',      puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'SOFIA BELTRAN LOPEZ',       puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'PEDRO XIMENEZ HERNANDEZ',   puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'JOEL ZAMORA TORRES',        puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'CARLOS FERNANDEZ RUIZ',     puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'MANUEL ROMERO SANCHEZ',     puesto: 'MECANICO',   sueldo: 315 },
  { cc: 100, name: 'ERICK JIMENEZ MORALES',     puesto: 'SUPERVISOR', sueldo: 500 },
  { cc: 110, name: 'VERONICA LARA CASTRO',      puesto: 'MECANICO',   sueldo: 315 },
  { cc: 110, name: 'ALEJANDRO HURTADO MENDOZA', puesto: 'MECANICO',   sueldo: 315 },
  { cc: 110, name: 'JANETTE MUÑOZ VARGAS',      puesto: 'MECANICO',   sueldo: 315 },
  { cc: 110, name: 'ALEXA TREVIÑO REYES',       puesto: 'MECANICO',   sueldo: 315 },
  { cc: 110, name: 'BERENICE JUAREZ FLORES',    puesto: 'MECANICO',   sueldo: 315 },
  { cc: 110, name: 'ALMA GUTIERREZ NAVARRO',    puesto: 'MECANICO',   sueldo: 315 },
  { cc: 110, name: 'FRANCISCO RIVERA SOTO',     puesto: 'SUPERVISOR', sueldo: 500 },
  { cc: 120, name: 'RAFAEL HERRERA CAMPOS',     puesto: 'MECANICO',   sueldo: 315 },
  { cc: 120, name: 'MANUEL ORTEGA SALINAS',     puesto: 'MECANICO',   sueldo: 315 },
  { cc: 120, name: 'DAVID ESPINOZA MEDINA',     puesto: 'MECANICO',   sueldo: 315 },
  { cc: 120, name: 'OSCAR JARAMILLO PEÑA',      puesto: 'MECANICO',   sueldo: 315 },
];

export const INTEGRATION_FACTOR = 1.0493;

export const BENEFITS = [
  { name: 'Aguinaldo',        value: 15,    unit: 'días'   },
  { name: 'Vacaciones',       value: 12,    unit: 'días'   },
  { name: 'Prima Vacacional', value: 0.25,  unit: 'pct'    },
  { name: 'IMSS',             value: 0.20,  unit: 'pct'    },
  { name: 'SAR',              value: 0.045, unit: 'pct'    },
  { name: 'INFONAVIT',        value: 0.05,  unit: 'pct'    },
  { name: 'Imp. Estatal',     value: 0.03,  unit: 'pct'    },
];

export const COST_CENTERS = [
  { category: 'PRODUCTIVOS',     cc: 100, name: 'PROCESO CONVERSION 1' },
  { category: 'PRODUCTIVOS',     cc: 110, name: 'PROCESO CONVERSION 2' },
  { category: 'PRODUCTIVOS',     cc: 120, name: 'PROCESO CONVERSION 3' },
  { category: 'SERVICIOS',       cc: 150, name: 'ALMACEN DE MP'        },
  { category: 'SERVICIOS',       cc: 160, name: 'INGENIERIA PLANTA'    },
  { category: 'SERVICIOS',       cc: 170, name: 'CALIDAD'              },
  { category: 'ADMINISTRACION',  cc: 200, name: 'GERENCIA GENERAL'     },
  { category: 'ADMINISTRACION',  cc: 210, name: 'CONTABILIDAD'         },
  { category: 'ADMINISTRACION',  cc: 220, name: 'RECURSOS HUMANOS'     },
  { category: 'VENTAS',          cc: 300, name: 'GERENCIA COMERCIAL'   },
  { category: 'VENTAS',          cc: 310, name: 'GERENCIA REGIONAL NORTE'  },
  { category: 'VENTAS',          cc: 320, name: 'GERENCIA REGIONAL CENTRO' },
];

export const ACCOUNTS = [
  { code: 1001001, name: 'Salarios'         },
  { code: 1001002, name: 'Tiempo extra'     },
  { code: 1001003, name: 'Vacaciones'       },
  { code: 1001004, name: 'Prima vacacional' },
  { code: 1001005, name: 'Aguinaldo'        },
  { code: 1001006, name: 'IMSS'             },
  { code: 1001007, name: 'SAR'              },
  { code: 1001008, name: 'INFONAVIT'        },
  { code: 1001009, name: 'Impuesto Estatal' },
  { code: 1002001, name: 'Energía Eléctrica'},
  { code: 1002002, name: 'Agua'             },
  { code: 1002003, name: 'Gas'              },
  { code: 1002004, name: 'Mantenimientos'   },
  { code: 1002005, name: 'Refacciones'      },
  { code: 1002006, name: 'Gastos Indirectos'},
];

export const RATES_BY_CC = [
  {
    cc: 100, name: 'Proceso Conversión 1',
    accent: 'var(--accent)',
    mod: 1280722, gv: 723600, gf: 976479, total: 2980802,
    minutes: 4383446,
    modRate: 0.2922, gvRate: 0.1651, gfRate: 0.2228, totalRate: 0.6800,
  },
  {
    cc: 110, name: 'Proceso Conversión 2',
    accent: 'var(--accent-3)',
    mod: 960542, gv: 191400, gf: 713309, total: 1865251,
    minutes: 6136825,
    modRate: 0.1565, gvRate: 0.0312, gfRate: 0.1162, totalRate: 0.3039,
  },
  {
    cc: 120, name: 'Proceso Conversión 3',
    accent: 'var(--gold)',
    mod: 960542, gv: 167400, gf: 713309, total: 1841251,
    minutes: 3506757,
    modRate: 0.2739, gvRate: 0.0477, gfRate: 0.2034, totalRate: 0.5251,
  },
];

export const RATES_TOTAL = {
  mod: 3201806, gv: 1082400, gf: 2403097, total: 6687303,
  minutes: 14027028,
  modRate: 0.7226, gvRate: 0.2440, gfRate: 0.5424, totalRate: 1.5090,
};

export const PRODUCTS_SUMMARY = [
  { code: 9001, name: 'PRODUCTO A', mp: 280.55, conv: 7.63, total: 288.18, color: 'var(--accent)' },
  { code: 9002, name: 'PRODUCTO B', mp: 239.66, conv: 8.39, total: 248.05, color: 'var(--accent-3)' },
  { code: 9003, name: 'PRODUCTO C', mp: 293.33, conv: 6.86, total: 300.19, color: 'var(--gold)' },
];

export const VARIATIONS = [
  { code: 1001, name: 'MATERIA PRIMA A', consumo: 69650,  std: 6965000,  real: 7313250, varU: 5,  varT:  348250 },
  { code: 1002, name: 'MATERIA PRIMA B', consumo: 34825,  std: 1915375,  real: 1950200, varU: 1,  varT:   34825 },
  { code: 1003, name: 'MATERIA PRIMA C', consumo: 22288,  std:  445760,  real:  468048, varU: 1,  varT:   22288 },
  { code: 1004, name: 'MATERIA PRIMA D', consumo: 139300, std: 4736200,  real: 4179000, varU: -4, varT: -557200 },
  { code: 1005, name: 'MATERIA PRIMA E', consumo: 46666,  std:  699983,  real:  699983, varU: 0,  varT:       0 },
  { code: 1006, name: 'MATERIA PRIMA F', consumo: 13930,  std:  933310,  real:  933310, varU: 0,  varT:       0 },
  { code: 1007, name: 'MATERIA PRIMA G', consumo: 6965,   std:  153230,  real:  125370, varU: -4, varT:  -27860 },
];

export const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

export const PNL = {
  ventas:        [28909833,26685999,28909833,26685999,27753440,26685999,28909833,26685999,26685999,28909833,27753440,28909833],
  costoStd:      [20649881,19061428,20649881,19061428,19823886,19061428,20649881,19061428,19061428,20649881,19823886,20649881],
  variaciones:   [-17626,2205,-17626,18700,5562,18700,-17626,26967,18700,-17626,-2705,-17626],
  totalCosto:    [20632254,19063634,20632254,19080129,19829448,19080129,20632254,19088396,19080129,20632254,19821181,20632254],
  utBruta:       [8277579,7622366,8277579,7605871,7923992,7605871,8277579,7597604,7605871,8277579,7932259,8277579],
  margenBruto:   [0.286,0.286,0.286,0.285,0.286,0.285,0.286,0.285,0.285,0.286,0.286,0.286],
  gtosOperacion: [2477986,2287371,2477986,2287371,2378866,2287371,2477986,2287371,2287371,2477986,2378866,2477986],
  utOperacion:   [5799593,5334995,5799593,5318499,5545126,5318499,5799593,5310232,5318499,5799593,5553393,5799593],
  margenOp:      [0.201,0.200,0.201,0.199,0.200,0.199,0.201,0.199,0.199,0.201,0.200,0.201],
};

// VENTA REAL — Enero 2026 (extraído de COSTEO_MANUFACTURA.xlsx · pestaña "VENTA REAL")
export const VENTA_REAL = {
  period: 'ENERO 2026',
  rows: [
    {
      code: 9001, name: 'PRODUCTO A',
      kgs: 35000, precio: 403.4491,
      ventaBruta: 14120717.39, descuentos: 282414.35, ventaNeta: 13838303.05,
      fctsKgs: 25000, varKgs: 10000,
      fctsVentas: 10086226.71, varVentas: 3752076.34,
      xVolumen: 4034490.68, xPrecio: -282414.35,
    },
    {
      code: 9002, name: 'PRODUCTO B',
      kgs: 10000, precio: 347.2738,
      ventaBruta: 3472737.75, descuentos: 0, ventaNeta: 3472737.75,
      fctsKgs: 30000, varKgs: -20000,
      fctsVentas: 10418213.26, varVentas: -6945475.50,
      xVolumen: -6945475.50, xPrecio: 0,
    },
    {
      code: 9003, name: 'PRODUCTO C',
      kgs: 25000, precio: 420.2697,
      ventaBruta: 10506741.54, descuentos: 0, ventaNeta: 10506741.54,
      fctsKgs: 20000, varKgs: 5000,
      fctsVentas: 8405393.23, varVentas: 2101348.31,
      xVolumen: 2101348.31, xPrecio: 0,
    },
  ],
  totals: {
    kgs: 70000,
    ventaBruta: 28100196.68, descuentos: 282414.35, ventaNeta: 27817782.34,
    fctsKgs: 75000, varKgs: -5000,
    fctsVentas: 28909833.20, varVentas: -1092050.86,
    xVolumen: -809636.51, xPrecio: -282414.35,
  },
  impacto: { volumen: -809636.51, precio: -282414.35, neto: -1092050.86 },
};

export const TICKER_ITEMS = [
  ['VENTAS YTD',       '$333,486,045'],
  ['COSTO VENTAS',     '$238,204,318'],
  ['UB',               '$95,281,727', 'up'],
  ['UO',               '$66,697,209', 'up'],
  ['VAR MP A',         '+$348,250',   'dn'],
  ['VAR MP D',         '−$557,200',   'up'],
  ['PROD A',           '288,385 PZA'],
  ['PROD B',           '346,062 PZA'],
  ['PROD C',           '230,708 PZA'],
  ['CUOTA CC100',      '$0.6800'],
  ['CUOTA CC110',      '$0.3039'],
  ['CUOTA CC120',      '$0.5251'],
  ['FACTOR INTEG',     '1.0493'],
  ['HEADCOUNT DIR',    '38'],
];
