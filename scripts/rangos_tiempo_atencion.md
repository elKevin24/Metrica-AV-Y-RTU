# Rangos de Tiempo de Atención (Creación → Resolución)

**Fuente:** `maestro_expedientes.parquet` — campos `Atencion_Final_Sec` (aprobados) y `Atencion_Rechazo_Sec` (rechazados)

## Estadísticas Resumen

| Métrica | APROBADA (n=36,262) | RECHAZADA (n=157) | COMBINADO (n=36,419) |
|---------|---------------------|-------------------|----------------------|
| Media | 14.24 h (854.5 min) | 162.88 h (9,773.1 min) | 14.88 h (892.9 min) |
| Mediana | 0.00 h (0.0 min) | 99.32 h (5,959.4 min) | 0.00 h (0.0 min) |
| Moda | 0.0 min | 0.0 min | 0.0 min |
| Desv Est | 44.0 h (2,639.3 min) | 158.8 h (9,527.6 min) | — |
| Mín | 0.0 min | 0.0 min | 0.0 min |
| Máx | 814.6 h (48,875.5 min) | — | — |

## Percentiles — APROBADA

| P1 | P5 | P10 | P25 | P50 | P75 | P90 | P95 | P99 |
|----|----|----|-----|-----|-----|-----|-----|-----|
| 0.0 min | 0.0 min | 0.0 min | 0.0 min | 0.0 min | 8.4 min | 47.1 h | 90.7 h | 213.0 h |

## Distribución por Rangos

| Rango | APROBADA | % | RECHAZADA | % | COMBINADO | % |
|-------|----------|---|-----------|---|-----------|---|
| <2 min | 8,478 | 23.4% | 3 | 1.9% | 8,481 | 23.3% |
| 2-5 min | 17,678 | 48.8% | 0 | 0.0% | 17,678 | 48.5% |
| 5-10 min | 892 | 2.5% | 0 | 0.0% | 892 | 2.4% |
| 10-20 min | 51 | 0.1% | 0 | 0.0% | 51 | 0.1% |
| 20-30 min | 18 | 0.0% | 0 | 0.0% | 18 | 0.0% |
| 30-60 min | 17 | 0.0% | 0 | 0.0% | 17 | 0.0% |
| 1-2 h | 8 | 0.0% | 0 | 0.0% | 8 | 0.0% |
| 2-4 h | 9 | 0.0% | 0 | 0.0% | 9 | 0.0% |
| 4-8 h | 38 | 0.1% | 0 | 0.0% | 38 | 0.1% |
| 8-24 h | 242 | 0.7% | 3 | 1.9% | 245 | 0.7% |
| >24 h | 8,264 | 22.8% | 101 | 64.3% | 8,365 | 23.0% |
| **Total** | **36,262** | **100%** | **157** | **100%** | **36,419** | **100%** |

## Nota Metodológica

La distribución es **bimodal extremada**:
- **71.9%** se resuelven en <5 min (autoaprobados o revisión instantánea)
- **23.0%** tardan >24 h (casos con rondas múltiples — 2DA_SUBSANADA / 3RA_MAS)

Los casos >24h en APROBADA incluyen el **tiempo total del ciclo** (incluyendo corrección del contribuyente entre rondas), no solo el tiempo del revisor. Para medir exclusivamente el tiempo del SAT, se requiere desagregar por rondas usando `detalle_eventos.parquet`.
