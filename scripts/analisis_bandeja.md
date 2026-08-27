# Análisis de Bandeja (Bolson) — Distribución por Rango

## Definición

**Bandeja (Bolson)** = Tiempo desde que el caso es **ASIGNADO** a un revisor hasta que el revisor lo **ABRE** en pantalla.

```
Bandeja = FechaRevision - FechaAsignacion
```

---

## Estadísticas Generales

| Métrica | Minutos | Horas |
|---|---:|---:|
| **Moda** | 1.0 | 0.02 |
| **Mediana** | 1.1 | 0.02 |
| **Media** | 2.4 | 0.04 |
| **Media Trimmada** | 1.7 | 0.03 |
| **Mínimo** | 0.2 | 0.003 |
| **Máximo** | 3,932.7 | 65.5 |
| **Desv. Estándar** | 22.6 | 0.38 |
| **CV** | 950.8% | — |

---

## Percentiles

| P1 | P5 | P10 | P25 | P50 | P75 | P90 | P95 | P99 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.4 | 0.5 | 0.6 | 0.8 | 1.1 | 1.8 | 3.3 | 5.4 | 21.9 |

---

## Distribución por Rangos

| Rango | Casos | % | Gráfica |
|---|---:|---:|---|
| **<1 min** | 18,289 | 39.5% | ################### |
| **1-2 min** | 18,000 | 38.9% | ################### |
| **2-5 min** | 7,457 | 16.1% | ######## |
| **5-10 min** | 1,440 | 3.1% | # |
| **10-30 min** | 869 | 1.9% | |
| **30-60 min** | 161 | 0.3% | |
| **1-2 h** | 73 | 0.2% | |
| **2-8 h** | 31 | 0.1% | |
| **8-24 h** | 4 | 0.0% | |
| **>24 h** | 2 | 0.0% | |

---

## Outliers

| Concepto | Valor |
|---|---:|
| Q1 (25%) | 0.8 min |
| Q3 (75%) | 1.8 min |
| IQR | 1.0 min |
| Límite superior | 3.4 min |
| **Outliers** | 4,475 (9.7%) |

---

## Fórmulas

### Promedio
```
Promedio = Suma(Tiempo de cada caso) / Cantidad de casos
Promedio = 1,836.19 h / 46,326 = 0.0396 h = 2.4 min
```

### Mediana
```
Ordenar tiempos de menor a mayor
Posición central = 46,326 / 2 = 23,163
Valor en posición 23,163 = 1.1 min
```

### Coeficiente de Variación
```
CV = (Desviación Estándar / Media) × 100
CV = (22.6 / 2.4) × 100 = 950.8%
```

---

## Caso Extremo

| Campo | Valor |
|---|---|
| **NoGestion** | 20267AV2C111E7F |
| **NIT** | 69303347 |
| **Contribuyente** | FELIX ESTEBAN PASCUAL |
| **Trámite** | ACTIVACIÓN |
| **Región** | OCCIDENTE |
| **Estado** | CANCELADA |
| **Revisor** | RCHAJMOR |

### Timeline

| Evento | Fecha |
|---|---|
| Creación | 04 jul 11:29 |
| Asignación | 04 jul 15:28 |
| Revisión | 07 jul 09:01 |

```
04 jul 15:28  ASIGNADA al revisor
              ↓
              ... 65.5 horas en bandeja (2.7 días) ...
              ↓
07 jul 09:01  REVISOR abre
```

**Cálculo:**
```
07 jul 09:01:35 - 04 jul 15:28:51 = 3,932.7 min = 65.5 horas = 2.7 días
```

**Posible causa:** Asignación vespertina (jueves 3:28 PM) → revisor no abrió hasta el sábado (9:01 AM).

---

## Lectura

- **78.4%** de los casos se abren en **<2 minutos**
- La **moda (1 min)** es el valor más frecuente
- El **CV de 950.8%** indica dispersión extrema por outliers
- Solo **9.7%** de casos superan los 3.4 minutos
- El caso más extremo tardó **65.5 horas** (2.7 días)
