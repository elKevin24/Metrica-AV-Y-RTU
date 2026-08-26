# Catálogo Formal de Métricas e Indicadores — Métrica AV y RTU

Este documento contiene la especificación formal y matemática de cada KPI, gráfico e indicador presentado en el **Tablero Ejecutivo BI 360° de la SAT Guatemala**.

---

## Índice de Indicadores

1. [Universo Total Digital SAT](#1-universo-total-digital-sat)
2. [Carga Humana Auditada](#2-carga-humana-auditada)
3. [Tasa de Aprobación Global](#3-tasa-de-aprobación-global)
4. [Tasa de Rechazo Global](#4-tasa-de-rechazo-global)
5. [First-Time Resolution (FTR) / Aprobación Limpia](#5-first-time-resolution-ftr--aprobación-limpia)
6. [Rescate por Subsanación (2.ª Ronda)](#6-rescate-por-subsanación-2ª-ronda)
7. [Tiempo de Espera en Cola de Servidor (Paso 1)](#7-tiempo-de-espera-en-cola-de-servidor-paso-1)
8. [Tiempo en Bandeja del Operador (Paso 2)](#8-tiempo-en-bandeja-del-operador-paso-2)
9. [Dictamen Activo en Pantalla (Paso 3)](#9-dictamen-activo-en-pantalla-paso-3)
10. [Ciclo Total de Respuesta en Jornada Hábil (8h)](#10-ciclo-total-de-respuesta-en-jornada-hábil-8h)
11. [Ciclo Total de Respuesta Calendario (Reloj Corrido)](#11-ciclo-total-de-respuesta-calendario-reloj-corrido)
12. [Cumplimiento de SLAs (1d, 2d, 3d, 5d)](#12-cumplimiento-de-slas-1d-2d-3d-5d)
13. [Capacidad Diaria y Ritmo Horario por Operador](#13-capacidad-diaria-y-ritmo-horario-por-operador)
14. [Ratio de Sobrecarga Regional](#14-ratio-de-sobrecarga-regional)
15. [Brecha Operativa por Personería (Individual vs Empresa)](#15-brecha-operativa-por-personería-individual-vs-empresa)

---

### 1. Universo Total Digital SAT
* **Definición:** Volumen total consolidado de solicitudes electrónicas recibidas en los sistemas de Agencia Virtual y RTU Digital.
* **Fórmula:** $\text{Universo Total} = \sum \text{Transacciones Electrónicas Recibidas}$
* **Fuente:** Base de datos relacional de solicitudes SAT.
* **Campos:** `Gestion`, `Casos`.
* **Universo:** 2,569,726 transacciones (histórico 2024-2026).
* **Filtros:** Ninguno (Masa bruta del sistema).
* **Exclusiones:** Ninguna.
* **Unidad:** Conteo de transacciones.
* **Estadístico:** Suma acumulada.

---

### 2. Carga Humana Auditada
* **Definición:** Subconjunto de trámites que requieren obligatoriamente la intervención, auditoría y dictamen de un revisor tributario humano.
* **Fórmula:** $\text{Carga Humana} = \text{Universo Total} - \text{Reinicios de Contraseña (Autoservicio)}$
* **Fuente:** Cubo compacto OLAP (`cubo_compacto.json`).
* **Campos:** `Gestion`, `Casos`.
* **Universo:** 865,876 expedientes (33.7% del universo total).
* **Filtros:** `fGes = 'HUMANAS'` (Activación de AV + Cambio de Correo RTU).
* **Exclusiones:** Trámites de autoservicio (`REINICIO DE CONTRASEÑA` procesados por bot).
* **Unidad:** Expedientes.
* **Estadístico:** Conteo absoluto.

---

### 3. Tasa de Aprobación Global
* **Definición:** Proporción de expedientes con dictamen favorable final dentro de la selección filtrada.
* **Fórmula:** $\text{Tasa Aprobación \%} = \frac{\sum \text{Aprobadas} + \sum \text{Finalizadas}}{\text{Total Casos}} \times 100$
* **Campos:** `Aprobadas`, `Finalizadas`, `Casos`.
* **Unidad:** Porcentaje (`%`).
* **Estadístico:** Proporción ponderada.

---

### 4. Tasa de Rechazo Global
* **Definición:** Proporción de expedientes con dictamen de rechazo o no conformidad emitido por el revisor.
* **Fórmula:** $\text{Tasa Rechazo \%} = \frac{\sum \text{Rechazos}}{\text{Total Casos}} \times 100$
* **Campos:** `Rechazos`, `Casos`.
* **Unidad:** Porcentaje (`%`).
* **Estadístico:** Proporción ponderada.

---

### 5. First-Time Resolution (FTR) / Aprobación Limpia
* **Definición:** Solicitudes que consiguen dictamen favorable en su primera y única evaluación, sin haber sufrido ningún rechazo previo ni requerir re-trabajo.
* **Fórmula:** $\text{FTR \%} = \frac{\text{Aprobadas Directas}}{\text{Total Casos}} \times 100$
* **Campos:** `AprobDirectas`, `Casos`, `Ronda_Revision = '1RA_DIRECTA'`.
* **Unidad:** Expedientes y Porcentaje.
* **Resultado Global:** 53.4% (462,808 trámites).

---

### 6. Rescate por Subsanación (2.ª Ronda)
* **Definición:** Solicitudes que sufrieron rechazo inicial pero el contribuyente corrigió la inconsistencia y el revisor aprobó en segunda ronda.
* **Fórmula:** $\text{Tasa Rescate \%} = \frac{\text{Aprobadas Subsanadas}}{\text{Total Rechazos}} \times 100$
* **Campos:** `AprobSubsanadas`, `Rechazos`.
* **Unidad:** Expedientes y Porcentaje de rescate.
* **Resultado Global:** 6.7% sobre el universo total (47.2% de los casos que reintentaron).

---

### 7. Tiempo de Espera en Cola de Servidor (Paso 1)
* **Definición:** Tiempo transcurrido desde que el contribuyente envía la solicitud hasta que el sistema la asigna a la bandeja de un revisor.
* **Fórmula:** $\text{Cola} = \text{FechaAsignación} - \text{FechaConfirmación}$
* **Campos:** `Suma_Buzon_Hab_Sec`, `N_Buzon_Hab`, `Suma_Buzon_Cal_Sec`, `N_Buzon_Cal`.
* **Unidad:** Horas Hábiles (Jornada 8h: L-V 08:00 - 16:00) y Horas Calendario.
* **Estadístico Dual:**
  - *Promedio Aritmético:* 3.85 h hábiles (representa el 93.5% del ciclo laboral promedio).
  - *Mediana Operativa:* 28.77 h calendario (representa el 95.7% del ciclo en días calendario por acumulación nocturna y fines de semana).

---

### 8. Tiempo en Bandeja del Operador (Paso 2)
* **Definición:** Tiempo que permanece el expediente asignado en la bandeja del revisor antes de ser abierto en pantalla.
* **Fórmula:** $\text{Bandeja} = \text{FechaRevisión} - \text{FechaAsignación}$
* **Campos:** `Suma_Bolson_Sec`, `N_Bolson`.
* **Unidad:** Minutos.
* **Estadístico:** Promedio: 1.8 minutos.

---

### 9. Dictamen Activo en Pantalla (Paso 3)
* **Definición:** Tiempo neto que el revisor humano interactúa con el expediente en pantalla para auditar video/DPI y emitir resolución.
* **Fórmula:** $\text{Dictamen} = \text{FechaFinalización} - \text{FechaRevisión}$
* **Campos:** `Suma_Atencion_Final_Sec`, `N_Atencion_Final`.
* **Unidad:** Segundos.
* **Estadístico:** Promedio: 1.8 segundos (el 95.86% de los expedientes se dictamina en $\le 5\text{ s}$).

---

### 10. Ciclo Total de Respuesta en Jornada Hábil (8h)
* **Definición:** Tiempo total de resolución medido exclusivamente en minutos laborales hábiles (L-V 08:00 a 16:00, excluyendo asuetos).
* **Fórmula:** $\text{Ciclo Hábil} = \frac{\sum \text{Suma\_Ciclo\_Hab\_Sec}}{\sum \text{N\_Ciclo\_Hab} \times 3600}$
* **Unidad:** Horas Hábiles.
* **Estadístico:** Promedio Institucional: 21.99 h hábiles (equivalente a ~2.75 jornadas laborales de 8 horas).

---

### 11. Ciclo Total de Respuesta Calendario (Reloj Corrido)
* **Definición:** Tiempo total percibido por el contribuyente desde la confirmación hasta la notificación final.
* **Fórmula:** $\text{Ciclo Calendario} = \frac{\sum \text{Suma\_Ciclo\_Cal\_Sec}}{\sum \text{N\_Ciclo\_Cal} \times 3600}$
* **Unidad:** Horas Calendario.
* **Estadístico:** Promedio: 92.8 horas calendario (~3.86 días continuos).

---

### 12. Cumplimiento de SLAs (1d, 2d, 3d, 5d)
* **Definición:** Porcentaje acumulado de expedientes dictaminados dentro de los umbrales reglamentarios de jornada hábil:
  - $\text{SLA 1d} \le 8\text{ h hábiles}$ (48.0%)
  - $\text{SLA 2d} \le 16\text{ h hábiles}$ (68.4%)
  - $\text{SLA 3d} \le 24\text{ h hábiles}$ (81.3%)
  - $\text{SLA 5d} \le 40\text{ h hábiles}$ (90.2%)
* **Campos:** `SLA_8h`, `SLA_16h`, `SLA_24h`, `SLA_40h`, `Fuera_SLA_40h`.
* **Unidad:** Porcentaje de cumplimiento.

---

### 13. Capacidad Diaria y Ritmo Horario por Operador
* **Definición:** Rendimiento de dictamen formalizado por revisor activo por jornada laboral estándar de 8 horas.
* **Fórmula:** $\text{Dictámenes / Jornada} = \frac{\text{Total Dictámenes}}{\text{Días Hábiles Activos}}$
* **Ritmo Horario:** $\text{Dictámenes / Hora} = \frac{\text{Dictámenes / Jornada}}{8} = 145.8\text{ dictámenes/hora}$ a nivel nacional.

---

### 14. Ratio de Sobrecarga Regional
* **Definición:** Comparativa entre la participación de demanda recibida por región vs. la capacidad de revisores asignados a dicha región.
* **Fórmula:** $\text{Ratio Sobrecarga} = \frac{\% \text{ Demanda Regional}}{\% \text{ Revisores Asignados}}$
* **Interpretación:**
  - $\text{Ratio} > 1.0$: Región sobrecargada (Central: 1.26x).
  - $\text{Ratio} < 1.0$: Región holgada (Nororiente: 0.75x).

---

### 15. Brecha Operativa por Personería (Individual vs Empresa)
* **Definición:** Comparación del comportamiento resolutivo entre Personas Individuales y Sociedades/Entidades Jurídicas.
* **Valores Clave:**
  - **Individuales:** 861,654 expedientes (99.5% volumen) | 30.4% tasa de rechazo.
  - **Empresas (Jurídicas):** 4,222 expedientes (0.5% volumen) | 47.5% tasa de rechazo (fricción por actas de nombramiento legal vencidas).
