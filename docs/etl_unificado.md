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