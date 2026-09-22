# Comparativa: Múltiples ETLs vs. Pipeline Unificado

| Aspecto | Múltiples Scripts (Actual) | Pipeline Maestro Unificado (Recomendado) |
|---|---|---|
| Tiempo total de ejecución | ~2 a 3 minutos (3 lecturas de Excel) | ~35 - 45 segundos (1 sola lectura) |
| Consumo de Memoria RAM | Alto (cargas redundantes) | Optimizado (un solo procesamiento) |
| Consistencia de datos | Riesgo de discrepancias | 100% Garantizada (Single Source of Truth) |
| Comando de actualización | Ejecutar 3 scripts manualmente | Un solo comando: `npm run etl` o `python etl_pipeline.py` |

## Análisis

### Verdicto: de acuerdo, con 2 correcciones y 3 matices

**Corrección previa:** la comparativa parte de "3 scripts", pero `etl.py` ya fue eliminado. Hoy
existen **2** (`etl_olap.py` + `etl_forensic.py`); no son 3 lecturas de Excel sino 2. El ahorro de
tiempo es real pero menor al prometido en la tabla.

### Evidencia de que el problema es real (no teórico)

- `compute_business_hours` está copiado **verbo a verbo** (~45 líneas idénticas) en ambos archivos
  (`etl_olap.py:37-81` == `etl_forensic.py:31-72`).
- `load_all_excels`, las constantes (`WORK_START_HOUR`, `HOLIDAYS_2026`, `BASE_DIR`) y la lógica de
  reparación de hileras partidas también se duplican.
- `diff` → ~310 líneas de diferencia sobre 766 líneas totales; el solapamiento es mayúsculo.
- Hoy la "garantía de consistencia" depende de que alguien mantenga ambas copias a mano; el rewrite
  que sincronizó las copias de `compute_business_hours`/`load_all_excels` ya lo demuestra en la
  práctica (costo de divergencia en curso).

### Matices que la comparativa no cubre y el unificado debe incluir

1. **El maestro por gestión debe ser UNO.** La clave no es solo "leer una vez": es construir un
   único registro maestro (`build_master`) y de él derivar OLAP (agregación) y forense
   (filtro `es_atendida` + chunks). Eso garantiza la consistencia *por construcción*, no por
   disciplina.
2. **Incluir validaciones ruidosas (gates de QA).** Gates que fallen en seco ante anomalías
   (conteo de gestiones, ratio filas/gestiones, nulos, duplicados) — hoy solo se imprimen conteos.
   Unificar sin esto no resuelve la causa raíz.
3. **No borrar `scripts/ensure_forensic.py`.** Sigue siendo la red de seguridad en build
   (desempaca `forensic_cases.json.gz` → chunks). El pipeline puede escribir chunks directo; el
   script queda como fallback.

## Estructura sugerida del pipeline unificado

No un monolito indiscriminado de 700+ líneas, sino stages claros en un solo `etl_pipeline.py`:

```
etl_pipeline.py
  1. load_all_excels()        → lectura + reparación + dedup (1 sola vez)
  2. build_master()           → registro maestro canónico por gestión
  3. derive_measures()        → atendidas / FTR / subsanadas / tiempos (hab + cal)
  4. build_cube(master)       → public/data/cubo_olap.json
  5. export_forensic(master)  → public/data/forensic_cases.json.gz + chunks
  6. validate_quality()       → gates de QA
```

- Entrada en `package.json`: `"etl": "python3 etl_pipeline.py"` → `npm run etl`.
- Añadir `requirements.txt` con `pandas`, `numpy`, `openpyxl` pineados (hoy no existe).
- Opcional: flag `--check` para correr solo las validaciones.

## Beneficios esperados

- Una sola lectura de los 16 Excel (~108MB) reduce I/O y pico de RAM.
- Consistencia garantizada por construcción: OLAP y forense comparten el mismo maestro y las
  mismas definiciones de negocio (atendidas, rechazos, FTR, subsanadas, tiempos hábiles/calendario).
- Un solo comando de actualización en lugar de ejecutar ETLs por separado.
- Punto único de mantenimiento y de introducción de nuevas dimensiones/medidas.

## Decisiones abiertas

1. ¿Implementar `etl_pipeline.py` + `npm run etl` + `requirements.txt` + gates de validación?
2. ¿Quién lo hace: este flujo o el agente de ETL en paralelo? (Coordinar para no pisar el rewrite
   actual de `etl_olap.py` / `etl_forensic.py`.)