# Diccionario de Datos — Cubo Compacto OLAP & Muestras Forenses

Este documento detalla la estructura tabular, tipos de datos, significado y reglas de agregación de las columnas del cubo multidimensional (`cubo_compacto.json`).

---

## 1. Estructura del Cubo Multidimensional (`cubo_compacto.json`)

El archivo utiliza un formato compacto `column-major` (`cols` + matriz de arrays `rows`) para minimizar la transferencia en red (~1.5 MB gzip / 10.8 MB json) y permitir la carga instantánea de los 865,876 expedientes en el navegador del cliente.

### Columnas y Metadatos

| Columna | Tipo de Dato | Nullable | Descripción y Reglas de Negocio |
|---|---|---|---|
| `Gestion` | `string` | No | Nombre del trámite (`ACTIVACIÓN`, `CAMBIO DE CORREO ELECTRÓNICO`, `REINICIO DE CONTRASEÑA`). |
| `Mes` | `string (YYYY-MM)` | Sí | Período mensual de creación de la solicitud. Formato ISO `2026-01`. |
| `Anio` | `number / string` | No | Año calendario (`2024`, `2025`, `2026`). |
| `Region` | `string` | No | Región tributaria administrativa: `CENTRAL`, `OCCIDENTE`, `SUR`, `NORORIENTE`. |
| `Estado` | `string` | No | Estado final registrado: `APROBADA`, `FINALIZADA`, `RECHAZADA`, `CANCELADA`, `NO CONFORME`. |
| `TipoPersona` | `string` | No | Tipo de personería jurídica del contribuyente: `INDIVIDUAL` o `JURIDICA`. |
| `MacroFamilia` | `string` | No | Agrupación macrocausal de rechazo (ej. `Fallas en Video y Declaración`, `Sin Rechazo`). |
| `ID_Subcategoria`| `string` | No | Código taxonómico de causal formal: `SUB-00` (limpio) a `SUB-24`. |
| `U1` | `string` | No | Identificador del usuario revisor tributario (ej. `MKNAJERA`, `PAPEREZT`). |
| `Rango_Velocidad`| `string` | No | Intervalo de dictamen en pantalla: `<=2s`, `2-5s`, `5-15s`, `15-60s`, `1-5m`, `>5m`. |
| `Ronda_Revision` | `string` | No | Etapa de revisión: `1RA_DIRECTA`, `2DA_SUBSANADA`, `3RA_MAS`. |
| `Casos` | `integer` | No | Conteo absoluto de expedientes agrupados en la celda del cubo. |
| `Aprobadas` | `integer` | No | Conteo de expedientes con dictamen de aprobación. |
| `Finalizadas` | `integer` | No | Conteo de expedientes finalizados favorablemente por autoservicio o canal directo. |
| `Rechazos` | `integer` | No | Conteo de expedientes con dictamen de rechazo o no conformidad. |
| `NoConfirmadas` | `integer` | No | Expedientes que no fueron confirmados por el contribuyente dentro del plazo. |
| `Canceladas` | `integer` | No | Expedientes cancelados por el contribuyente o por inactividad. |
| `AprobDirectas` | `integer` | No | Conteo de trámites con First-Time Resolution (aprobados sin rechazo previo). |
| `AprobSubsanadas`| `integer`| No | Conteo de trámites aprobados en segunda ronda tras subsanar rechazo. |
| `RechDefinitivos`| `integer`| No | Expedientes que concluyeron en rechazo o desistimiento sin lograr aprobación. |
| `Suma_Buzon_Hab_Sec` | `number` | No | Suma acumulada de segundos en cola de buzón (jornada hábil 8h: L-V 08:00-16:00). |
| `N_Buzon_Hab` | `integer` | No | Denominador de expedientes válidos con medición de buzón hábil. |
| `Suma_Buzon_Cal_Sec` | `number` | No | Suma acumulada de segundos en cola de buzón (tiempo reloj calendario). |
| `N_Buzon_Cal` | `integer` | No | Denominador de expedientes válidos con medición de buzón calendario. |
| `Suma_Bolson_Sec` | `number` | No | Suma de segundos transcurridos en la bandeja del revisor antes de su apertura. |
| `N_Bolson` | `integer` | No | Denominador de expedientes asignados en bandeja. |
| `Suma_Atencion_Final_Sec` | `number` | No | Suma de segundos de dictamen activo en pantalla para resoluciones favorables. |
| `N_Atencion_Final` | `integer` | No | Conteo de dictámenes finales auditados en pantalla. |
| `Suma_Atencion_Rechazo_Sec` | `number` | No | Suma de segundos de dictamen activo en pantalla para dictámenes de rechazo. |
| `N_Atencion_Rechazo` | `integer` | No | Conteo de dictámenes de rechazo auditados en pantalla. |
| `Suma_Creacion_Atencion_Hab_Sec` | `number` | No | Suma acumulada de segundos hábiles desde confirmación hasta 1.ª atención. |
| `N_Creacion_Atencion_Hab` | `integer` | No | Denominador de expedientes con 1.ª atención registrada. |
| `Suma_Ciclo_Hab_Sec` | `number` | No | Suma acumulada de segundos hábiles de ciclo total de respuesta. |
| `N_Ciclo_Hab` | `integer` | No | Denominador de expedientes con ciclo hábil computado. |
| `Suma_Ciclo_Cal_Sec` | `number` | No | Suma acumulada de segundos calendario de ciclo total de respuesta. |
| `N_Ciclo_Cal` | `integer` | No | Denominador de expedientes con ciclo calendario computado. |
| `SLA_8h` | `integer` | No | Conteo de casos resueltos en $\le 8\text{ h hábiles}$ ($\le 1\text{ día hábil}$). |
| `SLA_16h` | `integer` | No | Conteo de casos resueltos entre 8.01h y 16.00h hábiles ($\le 2\text{ días}$). |
| `SLA_24h` | `integer` | No | Conteo de casos resueltos entre 16.01h y 24.00h hábiles ($\le 3\text{ días}$). |
| `SLA_40h` | `integer` | No | Conteo de casos resueltos entre 24.01h y 40.00h hábiles ($\le 5\text{ días}$). |
| `Fuera_SLA_40h` | `integer` | No | Conteo de casos que superaron las 40.00 horas hábiles (> 5 días laborales). |

---

## 2. Dataset Muestral Forense (`dataset_muestral_500`)

Utilizado para la auditoría individualizada caso a caso en la pestaña de Auditoría Forense (`tab-auditoria`).

| Campo | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `Expediente` | `string` | `EXP-2026-08912` | Identificador único anonimizado del trámite. |
| `Gestion` | `string` | `ACTIVACIÓN` | Tipo de trámite tributario. |
| `Region` | `string` | `CENTRAL` | Región asignada. |
| `Revisor` | `string` | `MKNAJERA` | Operador que dictaminó la solicitud. |
| `Estado` | `string` | `APROBADA` | Dictamen final del caso. |
| `TipoPersona` | `string` | `INDIVIDUAL` | Persona Individual o Jurídica. |
| `FechaCreacion` | `string (ISO)` | `2026-01-15 08:30:12` | Momento de confirmación por el usuario. |
| `FechaRevision` | `string (ISO)` | `2026-01-15 11:45:00` | Momento de apertura del caso en pantalla. |
| `FechaFinalizacion` | `string (ISO)` | `2026-01-15 11:45:02` | Momento de firma y emisión de resolución. |
| `TiempoColaHab` | `number (hrs)` | `3.25` | Horas hábiles en cola de asignación. |
| `TiempoRevisionSec`| `number (seg)` | `2.0` | Segundos de dictamen en pantalla. |
| `CicloTotalHab` | `number (hrs)` | `3.25` | Duración total en jornada de 8h. |
| `Ronda` | `string` | `1RA_VEZ` | Ronda en que finalizó la gestión. |
