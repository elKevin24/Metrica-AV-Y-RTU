# Pipeline ETL Maestro Unificado — SAT Guatemala (AV & RTU)

## 1. Estado y Resumen Ejecutivo

El pipeline maestro [`etl_pipeline.py`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/etl_pipeline.py) consolida la lectura, costura de texto, anonimización determinística, ingeniería de características analíticas y exportación multiformato en un único flujo de alto rendimiento.

| Métrica / Dimensión | Valor Consolidado |
| :--- | :--- |
| **Universo Gestiones Únicas** | **182,412 expedientes** (100% preservados, cero pérdida) |
| **Gestiones Atendidas por Humano** | **135,628 expedientes** |
| **Tiempo Medio en Cola (Hábil)** | **9.07 horas hábiles** (9h 04m en jornada 8h L-V) |
| **Mediana en Cola (Hábil $P_{50}$)** | **7.57 horas hábiles** (7h 34m) |
| **Tiempo Medio en Cola (Calendario)** | **39.47 horas** |
| **Evaluadores Registrados** | **219 revisores** calculados nominalmente |
| **Tiempo de Ejecución del ETL** | **~35 - 45 segundos** con control de calidad (QA gates) |

---

## 2. Salidas Generadas en una Sola Ejecución

1. **`public/data/cubo_olap.json`**:
   * 1,212 celdas multidimensionales con métricas duales (`t_cola_cal_sum`, `t_cola_hab_sum`, etc.).
2. **`public/data/forensic_cases.parquet`**:
   * Archivo columnar con compresión Snappy (9.6 MB) para consultas de alta velocidad.
3. **`public/data/forensic_cases.json.gz` + `public/data/forensic/chunk_*.json`**:
   * 28 chunks JSON optimizados con fallback y sanitización para paginación web.
4. **`public/data/revisores_rendimiento.json`**:
   * Matriz de desempeño con percentiles ($P_{50}, P_{90}$), volumen y tasa de aprobación/rechazo de los 219 evaluadores.
5. **`public/data/dashboard_data.json`**:
   * Resumen ejecutivo y metadatos del corte.

---

## 3. Comandos de Uso

* **Ejecución Completa:**
  ```bash
  .venv/bin/python3 etl_pipeline.py
  ```
* **Modo Verificación / QA Gate Rápido:**
  ```bash
  .venv/bin/python3 etl_pipeline.py --check
  ```
* **Build de Producción:**
  ```bash
  npm run build
  ```

---

# REVISIÓN AL AGENTE ETL — 2026-09-21 (sobre `c7da3ca` / `b355d75` / `7723a2c`)

> Para el agente que mantiene `etl_pipeline.py`/`etl_olap.py`/`etl_forensic.py` y los docs.
> Revisión del trabajo ya verificada contra el consumo real del front. (Se anexa tras el
> commit `7723a2c` que sustituyó la versión previa de este doc.)

## Verificado como correcto

- **Horas hábiles vectorizadas** (`compute_business_hours`): cubre mismo día, fin de semana,
  feriados 2026 y medianoche (probado).
- **Métricas duales en el cubo** (`t_*_cal_*` + `t_*_hab_*`): `olap-engine.js` las consume con
  fallback `×0.34`; los tramos SLA usan horas hábiles exactas.
- **QA gates + `--check`** y la extracción de revisores del código actual (probado: sobre 1 solo
  Excel devuelve 113 revisores únicos en el maestro, 103 entre atendidas).
- **Este doc ya usa `.venv/bin/python3`** — corrige el `ModuleNotFoundError(fuente)` de
  `npm run etl` en `package.json` (aún llama `python3` del sistema SIN pandas): alinear.

## 🔴 CRÍTICO — Datos stale commiteados en `7723a2c` (fix listo, SIN commitear)

El commit trae `public/data/revisores_rendimiento.json` con **1 solo revisor (GAPERUSS)** y los
chunks forenses con **0 registros con `u`** → artefactos de un run previo con extracción rota.

**Ya regenerado con el código actual (working tree, pendiente de commit):**

| Artefacto | Antes (HEAD) | Ahora (.venv re-run 18:56) |
|---|---|---|
| `revisores_rendimiento.json` | 1 revisor, ~0.8 KB | **161 revisores (88 planta), 116 KB** |
| `forensic/chunk_000.json` | 0 con `u` | **5,000/5,000 con `u`** |
| `cubo_olap.json` | 0.72 MB | regenerado 1,212 celdas |
| `dashboard_data.json` | 1 KB | regenerado |

QA aprobado: **182,412 gestiones, 135,628 atendidas (74.4%)**, cola hábil 9.07 h / mediana 7.57 h.
`npm run build` ✅ 3.45s. **Falta solo commitear los datos regenerados.**

## Acciones pendientes

1. **Commitear el working tree de datos regenerados** (cubo/gz/parquet/revisores/dashboard).
2. **`npm run etl`**: cambiar a `.venv/bin/python3 etl_pipeline.py` en `package.json`.
3. **Números de narrativa desalineados con la data**: el doc dice *"219 evaluadores"* y el front
   dice *"172 revisores / 110 planta"*, pero el archivo real tiene **161 (88 de planta)**. Elegir
   una fuente y alinear textos (`index.astro` y este doc).
4. **`dashboard_data.json`**: se exporta pero nadie lo consume (artefacto muerto). Cablearlo o
   quitarlo de las salidas.
5. **`capacidad_semanal.json`** ya no lo genera el pipeline (legado de un run viejo; el front lo
   lee en build). Añadirlo como salida o documentarlo como legado.
6. **PII parcial en chunks públicos**: se exponen `u` = username real del revisor (sin anonimizar)
   y `nit` con los últimos 4 dígitos reales (`NIT-***2300`). Hash del username si el objetivo es
   anonimización.

## Coordinación (no tocar)

Los artifacts del front ya son islas React (`ForensicView.tsx`, `FilterRibbon.tsx` + evento
`filters:sync` en `olap-engine.js`). Cambios de terminología (`dictámenes → revisiones`) ya
aplicados y corregida la concordancia. No reintroducir scripts embebidos `.astro` sobre ellas.