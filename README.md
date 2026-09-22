# Visor Estratégico BI — SAT Guatemala (Agencia Virtual & RTU)

Plataforma de Inteligencia de Negocios, Auditoría Operativa y Análisis de SLAs para la **Superintendencia de Administración Tributaria (SAT Guatemala)**. Construida con **Astro**, **Tailwind CSS**, **Chart.js**, **React/Recharts** y un pipeline de datos unificado en **Python (Pandas / PyArrow)**.

---

## 🚀 Inicio Rápido

### Requisitos
* **Node.js**: v18+ y npm
* **Python**: v3.10+ (entorno `.venv` con paquetes de `requirements.txt`)

### Instalación y Ejecución Local

1. **Instalar dependencias de Node:**
   ```bash
   npm install
   ```

2. **Configurar entorno Python:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Ejecutar el Pipeline ETL Maestro:**
   ```bash
   .venv/bin/python3 etl_pipeline.py
   ```

4. **Iniciar Servidor de Desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

5. **Compilar para Producción:**
   ```bash
   npm run build
   ```

---

## 📊 Módulos Analíticos

1. **Resumen Ejecutivo:** KPIs globales, cumplimiento SLA, tasa First Time Right (FTR), subsanaciones y desglose de aprobaciones vs. rechazos.
2. **Tiempos & SLAs (8h):** Comparativa dual entre horas hábiles institucionales (L-V 08:00 a 16:00 excluyendo feriados SAT 2026) y horas calendario brutas.
3. **Revisores & Atenciones:** Matriz nominal de 219 evaluadores con percentiles ($P_{50}, P_{90}$), capacidad teórica instalada y tendencias de demanda semanal.
4. **Causalidad & Flujos:** Árbol de decisión de desenlaces, causalidad de rechazos (DPI, Video, Reglas Duras) y curvas de dispersión.
5. **Auditoría Forense:** Paginación de expedientes deduplicados, búsqueda instantánea, detalles de eventos y trazabilidad PII anonimizada.

---

## 📚 Documentación Técnica

* 🏛️ [Arquitectura del Sistema](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/docs/arquitectura.md)
* ⚙️ [Pipeline ETL Maestro Unificado](file:///home/kev/Documentos/GitHub/Metrica-AV-Y-RTU/docs/etl_unificado.md)
