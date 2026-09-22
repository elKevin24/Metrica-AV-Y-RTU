# Arquitectura — Visor Estratégico BI · SAT Guatemala (AV y RTU)

## 1. Visión general

Dashboard BI estático (sin backend) desplegado en GitHub Pages:

```
src/data/*.xlsx (16 archivos, ~108MB, gitignored)
      │
      └─ ETL Python (pandas)  →  JSON pre-agregados en public/data/
                                      │
      Astro (build estático)  ←──  cubo_olap.json + forensic/ + capacidade/revisores…
                                      │
      GitHub Pages (dist/)  ──  navegador (vanilla JS + 1 isla React)
```

- **Tipo de hosting**: estático. No hay servidor; toda la analítica se cocina en build.
- **UI**: Astro + Tailwind + Chart.js (vanilla) + React/Recharts (una sola isla).
- **Referencias**: el pipeline de datos se analiza en `docs/etl_unificado.md`.

## 2. Decisiones de arquitectura (adelante/conservar)

### 2.1 Islas de Astro — auditoría y criterio

**Estado actual:** existe **1 sola isla** en todo el proyecto:

| Componente | Directiva | Dónde |
|---|---|---|
| `RechazosTrendChart` (React + Recharts) | `client:load` | `src/pages/index.astro:644` |

- `semanasData` (21 semanas × ~10 campos) se pasa por props: payload serializado pequeño y sano.
- `client:load` es correcto: vive en `tab-general`, la pestaña visible por defecto.
- Toda la demás interactividad (tabs, filtros, DataTables, motor OLAP, forense) es **JS vanilla**
  en `<script>` inline → hidratación mínima, alineado con la filosofía de Astro.

**Regla de decisión** (criterio interno): usar islas solo donde haya
1. estado complejo reusable + cambios frecuentes de DOM, o
2. lógica que se reutilice entre vistas.

En este repo los **candidatos de mayor ROÍ** son dos:

1. **`ForensicView` (tab Auditoría Forense)** — 15 funciones vanilla, estado global mutable
   (`allCases`, `loadedChunks`, `totalChunks`), carga progresiva de chunks + búsqueda + filtros +
   stats en vivo. Migrar a un island con estado tipado encapsulado elimina la fragilidad del
   estado global.
2. **`FilterRibbon` + estado de filtros** — los 5 slicers llaman a `applyFilters()` global y las
   vistas leen `window.__lastOlapResult`. Un island que posea el **estado de filtros como única
   fuente de verdad** (emitiendo eventos a los Chart.js vanilla existentes) sin reescribir los
   gráficos.

**Dónde NO usar islas** (correcto mantener vanilla): tabs de navegación, paleta de comandos
(Ctrl+K), modales, KPI cards, Chart.js ya renderizados — micro-interacciones sin estado.

**Advertencia honesta:** cada isla nueva descarga+hidrata runtime. No se debe usar islas "por
moda"; con los dos candidatos anteriores el resto puede seguir en vanilla.

### 2.2 Duplicación de runtime de gráficos

- El dashboard usa **Chart.js** (vendored, 12+ usos: `new Chart(...)` en `index.astro` y
  `CausalidadView.astro`) **y además** React+Recharts para un único gráfico de tendencia
  (`RechazosTrendChart.tsx`, 424 líneas).
- Costo: React (~45KB) + Recharts (~450KB brutos) que se cargan solo por esa isla.
- Si la tendencia se dibujara con Chart.js, se eliminaría React del build y la dependencia
  `@astrojs/react`. Contra: el gráfico ya está implementado y probado; migrar es trabajo y riesgo
  de regresión visual. **Decisión: mantener por ahora**, reevaluar si se migra `ForensicView`.

### 2.3 Asincronía y paralelismo

- **Frontend ya es asíncrono**: `ForensicView` carga chunks de forma progresiva con
  `fetchWithRetry` y fallback a `auditoria_muestra.json`.
- **ETL es síncrono y secuencial** (bucle `for f in files: pd.read_excel`). `async/await` en
  Python no aporta (operaciones CPU-bound con GIL); lo que sí aporta es **paralelismo real**
  (`ProcessPoolExecutor`) o un motor de lectura más rápido (`engine='calamine'`, polars) y
  **orquestación desacoplada** (GitHub Action que re-ejecute `npm run etl` al subir Excel nuevos).
  Ver `docs/etl_unificado.md`.

## 3. Formato de datos consumidos

| Artefacto | Uso | Vivo |
|---|---|---|
| `public/data/cubo_olap.json` | index (KPIs, OLAP, tendencias) | ✅ |
| `public/data/capacidad_semanal.json` | index + `CausalidadView` | ✅ |
| `public/data/revisores_rendimiento.json` | tab Revisores (index) | ✅ |
| `public/data/forensic/` (gz + chunks) | tab Auditoría Forense | ✅ |
| `public/data/auditoria_muestra.json` | fallback del tab forense | ⚠️ fallback |
| `etl.py`, páginas legacy `/historico·/bitacora·/dispersion·/auditoria·/laboratorio-sql`,
  `dispersion_muestra.json`, `bitacora_partitions/`, `data_old/`, `app.js`,
  `Auditoria_Detalle_Tiempos.html` | **Eliminado** (dec 2026) | ❌ |

## 4. Estado de los ETL

Ver `docs/etl_unificado.md`: recomendación de unificar `etl_olap.py` + `etl_forensic.py` en un
`etl_pipeline.py` con maestro único (`build_master`), gates de validación de calidad,
`requirements.txt` y comando `npm run etl`. Coordinado con el agente de ETL en paralelo.