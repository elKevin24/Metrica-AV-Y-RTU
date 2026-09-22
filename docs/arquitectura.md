# Arquitectura — Visor Estratégico BI · SAT Guatemala (AV y RTU)

## 1. Visión General del Sistema

Plataforma de Inteligencia de Negocios y Auditoría Operativa estática de alto rendimiento (Zero Backend en runtime), optimizada para despliegues estáticos y análisis multidimensional en cliente:

```
src/data/*.xlsx (16 archivos brutos, ~108MB, gitignored)
       │
       ▼
etl_pipeline.py (Pipeline Maestro Unificado en Python / PyArrow / Pandas)
       │
       ├── public/data/cubo_olap.json              (Cubo OLAP multidimensional, 1,212 celdas)
       ├── public/data/forensic_cases.parquet      (Formato columnar Snappy, 135,628 filas)
       ├── public/data/forensic_cases.json.gz      (Archivo GZ + 28 chunks JSON)
       ├── public/data/revisores_rendimiento.json  (Matriz nominal de 219 evaluadores)
       └── public/data/capacidad_semanal.json      (21 semanas de capacidad y demanda)
       │
       ▼
Astro SSG + Tailwind CSS + Motor OLAP Client-Side
       │
       ├── Vanilla JS: olap-engine.js (Filtros en memoria, agregaciones instantáneas)
       ├── React Islands: FilterRibbon.tsx, ForensicView.tsx, RechazosTrendChart.tsx
       └── UI Framework: Sidebar retráctil con física de resorte + Paleta SAT Ejecutiva
```

---

## 2. Decisiones de Arquitectura & Componentes

### 2.1 Arquitectura de Islas de Astro (Astro Islands)
El proyecto utiliza un enfoque híbrido balanceado:
* **Vanilla JS en Motor OLAP (`public/js/olap-engine.js`):** Gestiona el estado de filtrado y las actualizaciones directas en el DOM y gráficos Chart.js a máxima velocidad sin overhead de hidratación.
* **Islas React (`@astrojs/react`):**
  1. **`FilterRibbon.tsx` (`client:load`):** Barra superior de slicers interactivos con sincronización bidireccional mediante el evento `filters:sync`.
  2. **`ForensicView.tsx` (`client:load`):** Tabla interactiva forense con paginación virtual, búsqueda instantánea y drawer de detalle de expediente.
  3. **`RechazosTrendChart.tsx` (`client:load`):** Visualizador de tendencias semanales con Recharts (curvas de cobertura y volumen).

### 2.2 Sistema de Diseño & UX
* **Sidebar Retráctil a Voluntad (`src/components/Sidebar.astro`):**
  * Transiciones ultra-suaves basadas en física de resortes (`--ease-spring`).
  * Persistencia en `localStorage ('sat_sidebar_collapsed')`.
  * Atajo de teclado global <kbd>Ctrl</kbd> + <kbd>B</kbd>.
* **Paleta Institucional SAT Premium:** Azul institucional profundo (`#0A2540`), cobalto (`#2563EB`), ámbar SAT (`#D97706`), esmeralda SLA (`#059669`) y rojo resolutivo (`#DC2626`).
* **Tipografía Dual:** *Inter* para lectura corporativa y *JetBrains Mono* para valores numéricos tabulares (`tabular-nums`).

---

## 3. Catálogo de Artefactos de Datos

| Artefacto | Formato / Tamaño | Función / Módulo | Estado |
| :--- | :--- | :--- | :---: |
| [`public/data/cubo_olap.json`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/public/data/cubo_olap.json) | JSON (0.72 MB) | KPIs Ejecutivos, Gráficos Donut, SLAs y filtros dimensionales | ✅ Activo |
| [`public/data/forensic_cases.parquet`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/public/data/forensic_cases.parquet) | Parquet Snappy (9.6 MB) | Almacenamiento columnar para consultas analíticas de alta velocidad | ✅ Activo |
| [`public/data/forensic_cases.json.gz`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/public/data/forensic_cases.json.gz) | GZ (5.3 MB) | Chunks paginados para la tabla forense (`chunk_000` a `027`) | ✅ Activo |
| [`public/data/revisores_rendimiento.json`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/public/data/revisores_rendimiento.json) | JSON (147 KB) | Matriz de 219 evaluadores con métricas hábiles y calendario | ✅ Activo |
| [`public/data/capacidad_semanal.json`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/public/data/capacidad_semanal.json) | JSON (8 KB) | Tendencias semanales de demanda, nuevas, reingresos y cobertura | ✅ Activo |

---

## 4. Pipeline de Datos Maestro ([`etl_pipeline.py`](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/etl_pipeline.py))

* **Ingesta & Reparación:** Parser de texto con costura de saltos de línea para reparar el 100% de expedientes sin pérdida de datos (**182,412 gestiones únicas**).
* **Anonimización PII:** Hash determinístico SHA-256 (`ANON-NIT-` y `ANON-CUI-`).
* **Cálculo de SLA Hábil Exacto:** Vectorizado con `np.busday_count` (Lunes a Viernes 08:00 - 16:00, 8h netas/día, excluyendo feriados SAT 2026).
* **Control de Calidad (QA Gates):** Ejecución con validación automática y soporte para verificación rápida (`--check`).