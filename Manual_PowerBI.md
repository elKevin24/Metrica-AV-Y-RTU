# Manual de Implementacion - Tablero BI Metrica AV & RTU en Power BI

> **Guia paso a paso (Opcion A: Power Query nativo, sin codigo externo)**
> Proyecto: *Tablero Ejecutivo BI 360 - SAT Agencia Virtual*
> Origen: ~19-50 archivos `reporteAV_*.xlsx` - ~1.7M+ registros - esquema de 18 columnas

---

## Indice

1. [Proposito y alcance](#1-proposito-y-alcance)
2. [Arquitectura general](#2-arquitectura-general)
3. [Requisitos previos](#3-requisitos-previos)
4. [Fase 1 - Conexion y consolidacion](#4-fase-1--conexion-y-consolidacion)
5. [Fase 2 - Limpieza y tipos](#5-fase-2--limpieza-y-tipos)
6. [Fase 3 - Taxonomia de motivos de rechazo](#6-fase-3--taxonomia-de-motivos-de-rechazo)
7. [Fase 4 - Duraciones y atributos operativos](#7-fase-4--duraciones-y-atributos-operativos)
8. [Fase 5 - Modelo semantico y relaciones](#8-fase-5--modelo-semantico-y-relaciones)
9. [Catalogo completo de medidas DAX](#9-catalogo-completo-de-medidas-dax)
10. [Paginas del informe](#10-paginas-del-informe)
11. [Publicacion y refresco](#11-publicacion-y-refresco)
12. [Checklist de implementacion](#12-checklist-de-implementacion)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Proposito y alcance

Este manual documenta como replicar en **Power BI** el tablero web existente
(dashboard Astro con cubo OLAP en JavaScript), utilizando exclusivamente:

- **Power Query** para el ETL (conector Carpeta).
- **Modelo estrella** en VertiPaq.
- **DAX** para las metricas.
- **Visuales nativos + drillthrough** para las 6 pestanas analiticas.

### Esquema de origen por archivo

| Columna | Tipo destino | Nota |
|---|---|---|
| `Nit` | Texto | Nunca numerico (ceros iniciales) |
| `NombreContribuyente` | Texto | Limpiar espacios |
| `NumeroGestion` | Texto | Clave unica de gestion |
| `gestion` | Texto | Tipo de tramite |
| `region_contribuyente` | Texto | -> DimRegion |
| `TipoAtencion` | Texto | - |
| `FechaCreacion` | Date/DateTime | Inicio del ciclo |
| `FechaAsignacion` | Date/DateTime | Fin buzon habilitacion |
| `FechaRevision` | Date/DateTime | Fin revision/calidad |
| `UsuarioResponsable` | Texto | Operador asignado |
| `FechaFinaliza` | Date/DateTime | Cierre |
| `UsuarioResponsable2` | Texto | - |
| `FechaRechazo` | Date/DateTime | Null = no hubo rechazo |
| `UsuarioResponsable3` | Texto | - |
| `MotivoRechazo` | Texto | Libre, multicausal (`.-` separador) |
| `UsuarioResponsable4` | Texto | - |
| `EstadoActual` | Texto | -> DimEstado |
| `UsuarioAtendio` | Texto | -> DimOperador |

---

## 2. Arquitectura general

```
Data\reporteAV_*.xlsx          Catalogo_Motivos.xlsx
        |                              |
        v                              v
+-----------------------------------------------+
|              POWER QUERY (ETL)                |
|  Combinar -> Limpiar -> Taxonomia -> Durac.   |
+-----------------------------------------------+
        |
        v
+-----------------------------------------------+
|         MODELO ESTRELLA (VertiPaq)            |
|  FactGestiones <-- DimFecha / Region /        |
|                     Operador / Estado /       |
|                     Taxonomia                 |
+-----------------------------------------------+
        |
        v
+-----------------------------------------------+
|      INFORME - 6 paginas (= 6 tabs web)       |
|  Macro - Operativo - Tiempos - Calidad -      |
|  Gestion - Auditoria (drillthrough)           |
+-----------------------------------------------+
```

---

## 3. Requisitos previos

- Power BI Desktop (version reciente, x64).
- Carpeta `Data\` accesible localmente con los `.xlsx`.
- Archivo `Catalogo_Motivos.xlsx` (generado por `build_catalogo.py`) con la hoja
  **Catalogo_General** (`Motivo_Normalizado`, `Categoria_Principal`, `Es_Multicausal`).

---

## 4. Fase 1 - Conexion y consolidacion

**1.1** `Obtener datos -> Carpeta` -> ruta `...\Data` -> **Transformar datos**
*(no usar "Combinar" directo todavia)*.

**1.2** Filtrar solo los reportes AV:

```m
= Table.SelectRows(Origen, each
    Text.StartsWith([Name], "reporteAV_")
    and Text.EndsWith([Name], ".xlsx"))
```

**1.3** Boton **Combinar archivos -> Transformar archivo de ejemplo**:
seleccionar hoja, promocionar encabezados. Power Query genera una funcion que
replica la transformacion sobre todos los archivos.

**1.4** Sobre la consulta combinada renombrada `FactGestiones`:

- Eliminar columnas auxiliares de carpeta (`Source.Name`, `Content`, ...).
- Quitar duplicados por `NumeroGestion`.

> Si los encabezados varian entre archivos, normalizalos en el
> *archivo de ejemplo* antes de combinar.

---

## 5. Fase 2 - Limpieza y tipos

| Paso | Accion |
|---|---|
| 2.1 | Las 5 fechas -> tipo **Date/DateTime**. Si vienen como texto, usar *Configuracion regional: Espanol (Guatemala)* al cambiar tipo. |
| 2.2 | `MotivoRechazo`, `NombreContribuyente`, usuarios -> **Recortar** + **Limpiar** (Formato). |
| 2.3 | Reemplazar el caracter corrupto de reemplazo Unicode U+FFFD (rombo con "?") por cadena vacia en `MotivoRechazo`. En M se escribe `"#(FFFD)"`. |
| 2.4 | Normalizar `MotivoRechazo` a mayusculas. |
| 2.5 | `Nit`, `NumeroGestion`, usuarios -> tipo **Texto**. |

Columna clave para el merge posterior:

```m
Motivo_Norm = Text.Upper(Text.Trim(Text.Clean([MotivoRechazo])))
```

---

## 6. Fase 3 - Taxonomia de motivos de rechazo

Estrategia **lookup-table** (reutiliza el catalogo generado por Python):
si manana cambia una categoria, editas el Excel - no el query.

**6.1** Nueva conexion -> `Catalogo_Motivos.xlsx` -> hoja `Catalogo_General`.
Conservar `Motivo_Normalizado` + `Categoria_Principal` -> renombrar `DimTaxonomia`
y quitar duplicados por clave.

**6.2** En `FactGestiones`: **Combinar consultas**

```
FactGestiones[Motivo_Norm]  <->  DimTaxonomia[Motivo_Normalizado]
```

Expandir `Categoria_Principal`; reemplazar `null` -> `"Otros"`.

**6.3** Multicausalidad - observaciones multiples separadas por `.-`:

```m
Es_Multicausal =
if [MotivoRechazo] = null then "No"
else if List.Count(Text.SplitAny([MotivoRechazo], ".-")) > 2 then "Si"
else "No"
```

**6.4** Flag de rechazo:

```m
EsRechazo = not ([FechaRechazo] = null)
```

---

## 7. Fase 4 - Duraciones y atributos operativos

### 7.1 Duraciones (segundos)

```m
Duracion_Buzon_Hab_Sec = Duration.TotalSeconds([FechaAsignacion] - [FechaCreacion])
Duracion_Buzon_Cal_Sec = Duration.TotalSeconds([FechaRevision]  - [FechaAsignacion])
Duracion_Atencion_Sec  = Duration.TotalSeconds([FechaFinaliza]  - [FechaRevision])
Duracion_Ciclo_Sec     = Duration.TotalSeconds([FechaFinaliza]  - [FechaCreacion])
```

> Si alguna fecha es `null`, el resultado es `null` automaticamente - correcto
> para los promedios DAX posteriores.

### 7.2 Rango_Velocidad (columna condicional)

| Condicion sobre `Duracion_Atencion_Sec` | Etiqueta |
|---|---|
| `< 30` | `"0-30s"` |
| `< 120` | `"30s-2m"` |
| `< 300` | `"2-5m"` |
| `< 600` | `"5-10m"` |
| resto | `">10m"` |

*(Umbrales ajustables; validar contra negocio.)*

### 7.3 Ronda_Revision (columna condicional)

| Regla | Valor |
|---|---|
| Sin rechazo (`FechaRechazo = null`) | `"1RA_DIRECTA"` |
| Con rechazo pero finalizada | `"2DA_SUBSANADA"` |
| Rechazo sin cierre | `"RECH_DEFINITIVO"` |

---

## 8. Fase 5 - Modelo semantico y relaciones

### Diagrama

```
DimFecha --1:*--> FactGestiones <--*:1-- DimRegion    (region_contribuyente)
(marcar como tabla de fechas)     <--*:1-- DimOperador(UsuarioAtendio)
                                  <--*:1-- DimEstado  (EstadoActual)
                                  <--*:1-- DimTaxonomia(Categoria_Principal)
```

Reglas de oro:

- Relaciones **uno-a-muchos**, direccion de filtro unica (*single*), nunca bidireccionales.
- Ocultar claves tecnicas y campos de staging.
- Cada dimension nace de *Referencia* sobre `FactGestiones` -> quitar duplicados ->
  conservar solo clave + descripcion.

### DimFecha (tabla calculada DAX)

```dax
DimFecha =
ADDCOLUMNS(
    CALENDAR(DATE(2024,1,1), DATE(2026,12,31)),
    "IdFecha",   INT([Date]),
    "Anio",      YEAR([Date]),
    "Mes",       FORMAT([Date], "MMM"),
    "NroMes",    MONTH([Date]),
    "AnioMes",   FORMAT([Date], "YYYY-MM"),
    "Trimestre", "Q" & QUARTER([Date])
)
```

Despues: `Herramientas de tabla -> Marcar como tabla de fechas` -> columna `Date`.

---

## 9. Catalogo completo de medidas DAX

Crear una tabla vacia `_Medidas` (o carpetas de medida) para organizarlas.

### 9.1 Bloque base

```dax
Total Gestiones    = COUNTROWS(FactGestiones)
Contribuyentes     = DISTINCTCOUNT(FactGestiones[Nit])
Operadores Activos = DISTINCTCOUNT(FactGestiones[UsuarioAtendio])

Rechazos  = CALCULATE([Total Gestiones], FactGestiones[EsRechazo] = TRUE())
Aprobadas = CALCULATE([Total Gestiones],
             FactGestiones[EstadoActual] = "APROBADA")
```

### 9.2 Pestana MACRO

```dax
% Aprobacion = DIVIDE([Aprobadas], [Total Gestiones])
% Rechazo    = DIVIDE([Rechazos],  [Total Gestiones])

Tendencia %Rechazo MoM =
VAR ant = CALCULATE([% Rechazo], DATEADD(DimFecha[Date], -1, MONTH))
RETURN DIVIDE([% Rechazo] - ant, ant)

Gestiones MTD = CALCULATE([Total Gestiones], DATESMTD(DimFecha[Date]))
```

### 9.3 Pestana OPERATIVO

```dax
Ranking Operador =
RANKX(ALL(DimOperador[UsuarioAtendio]), [Total Gestiones])

Casos Promedio por Operador =
AVERAGEX(VALUES(DimOperador[UsuarioAtendio]),
    CALCULATE([Total Gestiones]))

Concentracion Top10 =
DIVIDE(
    CALCULATE([Total Gestiones],
        TOPN(10, VALUES(DimOperador[UsuarioAtendio]), [Total Gestiones])),
    [Total Gestiones])
```

### 9.4 Pestana TIEMPOS

```dax
Tma Buzon Hab (min) =
DIVIDE(SUM(FactGestiones[Duracion_Buzon_Hab_Sec]),
       COUNTROWS(FactGestiones), 60)

Tma Ciclo (min) =
DIVIDE(SUM(FactGestiones[Duracion_Ciclo_Sec]),
       [Total Gestiones], 60)

P90 Ciclo (min) =
DIVIDE(PERCENTILEX.INC(FactGestiones,
       FactGestiones[Duracion_Ciclo_Sec], 0.90), 60)

Backlog >24h =
CALCULATE([Total Gestiones],
    FILTER(FactGestiones,
        FactGestiones[Duracion_Buzon_Hab_Sec] > 86400))
```

### 9.5 Pestana CALIDAD

```dax
Multicausales % =
DIVIDE(CALCULATE([Total Gestiones],
        FactGestiones[Es_Multicausal] = "Si"),
    [Rechazos])

Top Motivo =
MAXX(TOPN(1,
        VALUES(DimTaxonomia[Categoria_Principal]), [Rechazos]),
    DimTaxonomia[Categoria_Principal])

Rechazos x Motivo =
CALCULATE([Rechazos],
    NOT ISBLANK(FactGestiones[Categoria_Principal]))
```

### 9.6 Pestana GESTION (embudo)

```dax
Aprob Directas   = CALCULATE([Total Gestiones],
                     FactGestiones[Ronda_Revision] = "1RA_DIRECTA")
Aprob Subsanadas = CALCULATE([Total Gestiones],
                     FactGestiones[Ronda_Revision] = "2DA_SUBSANADA")
Rech Definitivos = CALCULATE([Total Gestiones],
                     FactGestiones[Ronda_Revision] = "RECH_DEFINITIVO")

Efectividad Subsanacion =
DIVIDE([Aprob Subsanadas], [Aprob Subsanadas] + [Rech Definitivos])

No Confirmadas =
CALCULATE([Total Gestiones],
    FactGestiones[EstadoActual] = "NO CONFIRMADA")
```

### 9.7 Pestana AUDITORIA (tabla detallada)

```dax
Dias en Proceso =
DATEDIFF(MIN(FactGestiones[FechaCreacion]), TODAY(), DAY)

Alerta Vencido = IF([Dias en Proceso] > 3, "VENCIDO", "OK")
```

> Formato recomendado: enteros con separador de miles; porcentajes con 1 decimal;
> tiempos en minutos con 1 decimal.

---

## 10. Paginas del informe

| Pagina | Visuales clave | Medidas principales |
|---|---|---|
| **Macro** | Cards KPI, linea/columna tendencia mensual por region, mapa | `% Aprobacion`, `% Rechazo`, `Tendencia MoM`, `Gestiones MTD` |
| **Operativo** | Ranking operadores (barras), matriz region x operador, scatter cuadrantes | `Ranking Operador`, `Concentracion Top10` |
| **Tiempos** | Histograma `Rango_Velocidad`, barras por etapa del buzon | `Tma Buzon Hab`, `P90 Ciclo`, `Backlog >24h` |
| **Calidad** | Arbol de descomposicion sobre categoria de motivo, donut multicausal | `Rechazos x Motivo`, `Multicausales %`, `Top Motivo` |
| **Gestion** | Embudo del flujo de estados | `Aprob Directas`, `Efectividad Subsanacion` |
| **Auditoria** | Tabla granular con ordenacion nativa + pagina drillthrough de expediente | `Dias en Proceso`, `Alerta Vencido` |

Navegacion: botones con accion *Ir a la pagina* replicando los tabs del dashboard web.

---

## 11. Publicacion y refresco

1. `Publicar` desde Power BI Desktop -> Workspace dedicado (ej. `SAT - Agencia Virtual`).
2. Configurar refresco programado:
   - **Gateway estandar/personal** si los `.xlsx` viven en un equipo local o servidor.
   - Alternativa: publicar `Data\` en SharePoint/OneDrive y reconectar el conector Carpeta a esa URL (sin gateway).
3. Compartir via **App** de Power BI (no via PBIX suelto).
4. Opcional: RLS por region (`DimRegion[region_contribuyente]`) si cada supervisor ve solo su zona.

---

## 12. Checklist de implementacion

- [ ] Queries: `FactGestiones` + `DimFecha/Region/Operador/Estado/Taxonomia`
- [ ] Relaciones 1:M verificacion (ninguna bidireccional)
- [ ] `DimFecha` marcada como tabla de fechas
- [ ] Medidas creadas por bloque (base -> macro -> resto)
- [ ] Claves tecnicas ocultas; formatos aplicados
- [ ] Pagina auditoria con drillthrough funcionando
- [ ] Publicado al workspace + refresco programado probado

---

## 13. Troubleshooting

| Sintoma | Causa probable | Solucion |
|---|---|---|
| Fechas quedan `null` al tipar | Locale distinto (dd/mm vs mm/dd) | Cambiar tipo -> *Usar configuracion regional* -> Espanol (Guatemala) |
| Merge con taxonomia da todo `Otros` | Espacios invisibles o acentos distintos | Verificar pasos 2.2-2.4 y regenerar catalogo (`build_catalogo.py`) |
| Promedios de duracion disparados | Duraciones negativas por fechas invertidas | Filtrar `Duracion_x >= 0` en PQ |
| Informe lento al filtrar operador | Relacion bidireccional o visual con DISTINCTCOUNT masivo | Revisar direcciones; usar `DimOperador` en visuales, no columnas del fact |
| `CALENDAR` fuera de rango | Nuevos meses fuera de 2024-2026 | Ampliar rango o usar `CALEDNDAR(MIN(FechaCreacion), MAX(...))` |

