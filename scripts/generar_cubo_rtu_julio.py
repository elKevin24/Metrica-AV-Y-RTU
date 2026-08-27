#!/usr/bin/env python3
"""
Pipeline ETL & Generador de Cubo OLAP: RTU JULIO 2026
Procesa los 5 archivos Excel de RTU (10000390411_reporteRTUjulio1..5.xlsx)
Extrae campos nativos, calcula tiempos de ciclo y construye el Cubo Multidimensional.
"""

import os
import sys
import json
import gzip
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, time, timedelta
from collections import defaultdict

# -------------------------------------------------------------
# 1. PARSER EXCEL RÁPIDO VÍA OPENXML (Sin dependencias externas)
# -------------------------------------------------------------

def parse_xlsx_fast(filepath):
    """Lee un archivo .xlsx directamente desde su estructura XML interna en streaming."""
    print(f"  -> Extrayendo datos de {filepath}...")
    with zipfile.ZipFile(filepath, 'r') as z:
        # Cargar Shared Strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for elem in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                texts = [t.text for t in elem.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
                shared_strings.append(''.join(texts))

        # Cargar sheet1
        sheet_xml = z.open('xl/worksheets/sheet1.xml')
        rows = []
        
        # Iterar filas en streaming
        for event, elem in ET.iterparse(sheet_xml, events=('end',)):
            if elem.tag.endswith('row'):
                row_data = {}
                for cell in elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    r_attr = cell.attrib.get('r', '')
                    col_letter = ''.join([c for c in r_attr if c.isalpha()])
                    t_attr = cell.attrib.get('t', '')
                    v_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v_elem.text if v_elem is not None else None
                    
                    if val is not None:
                        if t_attr == 's':
                            idx = int(val)
                            val = shared_strings[idx] if idx < len(shared_strings) else ''
                        row_data[col_letter] = val
                
                if row_data:
                    rows.append(row_data)
                elem.clear()

        # Mapear columnas a partir del header (Fila 1)
        if not rows:
            return []
        
        header_row = rows[0]
        col_map = {col: str(header_row[col]).strip().lower() for col in header_row}
        
        records = []
        for r in rows[1:]:
            rec = {}
            for col_letter, val in r.items():
                col_name = col_map.get(col_letter)
                if col_name:
                    rec[col_name] = str(val).strip() if val is not None else ''
            records.append(rec)
            
        print(f"     Filas leídas: {len(records):,}")
        return records

# -------------------------------------------------------------
# 2. FUNCIONES DE CÁLCULO DE TIEMPOS (CALENDARIO Y HÁBIL)
# -------------------------------------------------------------

def parse_date(date_str):
    if not date_str or date_str in ['', 'None', 'null', '-']:
        return None
    # Formatos comunes: YYYY-MM-DD HH:MM:SS, DD/MM/YYYY HH:MM:SS, YYYY/MM/DD...
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%Y/%m/%d %H:%M:%S'):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    try:
        # Si viene en formato ISO o con T
        clean_str = date_str.replace('T', ' ').split('.')[0]
        return datetime.strptime(clean_str, '%Y-%m-%d %H:%M:%S')
    except Exception:
        return None

def calc_business_seconds(dt_start, dt_end, work_start=time(8, 0), work_end=time(16, 0)):
    """Calcula los segundos transcurridos en jornada laboral de 8h (Lunes a Viernes 08:00 a 16:00)."""
    if not dt_start or not dt_end or dt_end < dt_start:
        return 0
    
    total_sec = 0.0
    curr = dt_start
    
    while curr.date() <= dt_end.date():
        if curr.weekday() < 5:  # Lunes a Viernes
            day_start = datetime.combine(curr.date(), work_start)
            day_end = datetime.combine(curr.date(), work_end)
            
            s = max(curr, day_start)
            e = min(dt_end, day_end)
            
            if s < e:
                total_sec += (e - s).total_seconds()
        
        # Avanzar al siguiente día a las 00:00
        curr = datetime.combine(curr.date() + timedelta(days=1), time(0, 0))
        
    return total_sec

# -------------------------------------------------------------
# 3. PROCESAMIENTO PRINCIPAL Y CONSTRUCCIÓN DEL CUBO
# -------------------------------------------------------------

def build_rtu_julio_olap():
    print("=" * 70)
    print("🚀 INICIANDO CONSTRUCCIÓN DEL CUBO OLAP: RTU JULIO 2026")
    print("=" * 70)
    
    data_dir = "public/data"
    excel_files = [
        f"{data_dir}/10000390411_reporteRTUjulio1.xlsx",
        f"{data_dir}/10000390411_reporteRTUjulio2.xlsx",
        f"{data_dir}/10000390411_reporteRTUjulio3.xlsx",
        f"{data_dir}/10000390411_reporteRTUjulio4.xlsx",
        f"{data_dir}/10000390411_reporteRTUjulio5.xlsx"
    ]
    
    raw_records = []
    for ef in excel_files:
        if os.path.exists(ef):
            recs = parse_xlsx_fast(ef)
            raw_records.extend(recs)
        else:
            print(f"  [ALERTA] Archivo no encontrado: {ef}")
            
    total_expedientes = len(raw_records)
    print(f"\n📊 Total de registros leídos en bruto: {total_expedientes:,}")
    
    if total_expedientes == 0:
        print("❌ Error: No se encontraron registros para procesar.")
        return

    # Normalización y cálculo de métricas por expediente
    processed_list = []
    
    # Conjuntos para dimensiones
    gestiones_set = set()
    regiones_set = set()
    estados_set = set()
    origenes_set = set()
    usuarios_set = set()
    
    # Conteo de estados
    estados_count = defaultdict(int)
    
    # Acumuladores para el cubo agregado
    # Key: (Mes, Region, Gestion, Estado, Origen, Rango_Atencion)
    cubo_agg = defaultdict(lambda: {
        'casos': 0,
        'suma_cola_sec': 0,
        'n_cola': 0,
        'suma_atencion_sec': 0,
        'n_atencion': 0,
        'suma_total_sec': 0,
        'n_total': 0,
        'suma_total_hab_sec': 0,
        'n_total_hab': 0,
        'sla_8h': 0,
        'sla_24h': 0,
        'sla_40h': 0,
        'fuera_sla': 0
    })
    
    # Análisis de operadores
    operadores_stats = defaultdict(lambda: {
        'total_expedientes': 0,
        'suma_atencion_sec': 0,
        'gestiones': defaultdict(int),
        'estados': defaultdict(int)
    })

    print("\n⚙️  Calculando tiempos de ciclo por expediente...")
    
    for r in raw_records:
        cod_gestion = r.get('codigo_gestion', '')
        region = r.get('region', 'SIN_REGION').upper().strip() or 'CENTRAL'
        gestion = r.get('gestion', 'GESTION_NO_ESPECIFICADA').upper().strip()
        estado = r.get('estado', 'SIN_ESTADO').upper().strip()
        origen = r.get('origen_solicitud', 'NO ESPECIFICADO').upper().strip()
        usuario = r.get('usuario', 'SISTEMA').upper().strip() or 'SISTEMA'
        nit = r.get('nit', '').strip()
        
        f_crea = parse_date(r.get('fecha_creacion_solicitud'))
        f_conf = parse_date(r.get('fecha_confirmacion_solicitud'))
        f_rev  = parse_date(r.get('fecha_revisor'))
        f_est  = parse_date(r.get('fecha_estado'))
        
        # Clasificación simplificada de macro-gestión
        macro_gestion = "ACTUALIZACIÓN"
        if "INSCRIPCIÓN" in gestion or "INSCRIPCION" in gestion:
            macro_gestion = "INSCRIPCIÓN"
        elif "CANCELACIÓN" in gestion or "CANCELACION" in gestion or "CESE" in gestion or "INACTIVACIÓN" in gestion:
            macro_gestion = "CANCELACIÓN / CESE"
        elif "ACTIVACIÓN" in gestion or "HABILITACIÓN" in gestion:
            macro_gestion = "ACTIVACIÓN / HABILITACIÓN"
            
        gestiones_set.add(gestion)
        regiones_set.add(region)
        estados_set.add(estado)
        origenes_set.add(origen)
        if usuario not in ('SISTEMA', ''):
            usuarios_set.add(usuario)
            
        estados_count[estado] += 1
        
        # 1. Tiempo en Cola de Asignación (Confirmación/Creación -> Asignación Revisor)
        t_cola_sec = 0
        dt_inicio = f_conf if f_conf else f_crea
        if dt_inicio and f_rev and f_rev >= dt_inicio:
            t_cola_sec = (f_rev - dt_inicio).total_seconds()
            
        # 2. Tiempo de Atención del Revisor (Asignación Revisor -> Fecha Estado)
        t_atencion_sec = 0
        if f_rev and f_est and f_est >= f_rev:
            t_atencion_sec = (f_est - f_rev).total_seconds()
            
        # 3. Tiempo Total Calendario y Hábil (Creación -> Estado)
        t_total_cal_sec = 0
        t_total_hab_sec = 0
        if f_crea and f_est and f_est >= f_crea:
            t_total_cal_sec = (f_est - f_crea).total_seconds()
            t_total_hab_sec = calc_business_seconds(f_crea, f_est)
            
        # Rango de Atención Humana
        if t_atencion_sec < 120:
            rango_atencion = "< 2 min"
        elif t_atencion_sec < 300:
            rango_atencion = "2 - 5 min"
        elif t_atencion_sec < 600:
            rango_atencion = "5 - 10 min"
        elif t_atencion_sec < 3600:
            rango_atencion = "10 min - 1 h"
        elif t_atencion_sec < 28800: # 8h
            rango_atencion = "1 - 8 h"
        else:
            rango_atencion = "> 8 h"
            
        # SLA en horas hábiles (8h = 28800s, 24h = 86400s, 40h = 144000s)
        is_sla_8h = 1 if t_total_hab_sec <= 28800 else 0
        is_sla_24h = 1 if t_total_hab_sec <= 86400 else 0
        is_sla_40h = 1 if t_total_hab_sec <= 144000 else 0
        is_fuera_sla = 1 if t_total_hab_sec > 144000 else 0
        
        # Acumular en celda OLAP
        mes_key = "2026-07"
        agg_key = (mes_key, region, macro_gestion, gestion, estado, origen, rango_atencion)
        
        c = cubo_agg[agg_key]
        c['casos'] += 1
        if t_cola_sec > 0:
            c['suma_cola_sec'] += t_cola_sec
            c['n_cola'] += 1
        if t_atencion_sec > 0:
            c['suma_atencion_sec'] += t_atencion_sec
            c['n_atencion'] += 1
        if t_total_cal_sec > 0:
            c['suma_total_sec'] += t_total_cal_sec
            c['n_total'] += 1
        if t_total_hab_sec > 0:
            c['suma_total_hab_sec'] += t_total_hab_sec
            c['n_total_hab'] += 1
            
        c['sla_8h'] += is_sla_8h
        c['sla_24h'] += is_sla_24h
        c['sla_40h'] += is_sla_40h
        c['fuera_sla'] += is_fuera_sla
        
        # Acumular operador
        if usuario != 'SISTEMA':
            op = operadores_stats[usuario]
            op['total_expedientes'] += 1
            op['suma_atencion_sec'] += t_atencion_sec
            op['gestiones'][macro_gestion] += 1
            op['estados'][estado] += 1

    # Formatear filas de la tabla de hechos OLAP
    cols = [
        "Mes", "Region", "MacroGestion", "Gestion", "Estado", "Origen", "RangoAtencion",
        "Casos", "Suma_Cola_Sec", "N_Cola", "Suma_Atencion_Sec", "N_Atencion",
        "Suma_Total_Cal_Sec", "N_Total_Cal", "Suma_Total_Hab_Sec", "N_Total_Hab",
        "SLA_8h", "SLA_24h", "SLA_40h", "Fuera_SLA"
    ]
    
    rows = []
    for (m, reg, mg, g, e, orig, ra), vals in cubo_agg.items():
        rows.append([
            m, reg, mg, g, e, orig, ra,
            vals['casos'],
            int(vals['suma_cola_sec']), vals['n_cola'],
            int(vals['suma_atencion_sec']), vals['n_atencion'],
            int(vals['suma_total_sec']), vals['n_total'],
            int(vals['suma_total_hab_sec']), vals['n_total_hab'],
            vals['sla_8h'], vals['sla_24h'], vals['sla_40h'], vals['fuera_sla']
        ])

    # Ranking y métricas de revisores de RTU
    ranking_operadores = []
    for usuario, d in operadores_stats.items():
        total = d['total_expedientes']
        prom_atencion_min = round((d['suma_atencion_sec'] / total / 60), 2) if total > 0 else 0
        ranking_operadores.append({
            "usuario": usuario,
            "expedientes": total,
            "promedio_atencion_min": prom_atencion_min,
            "principales_gestiones": sorted(d['gestiones'].items(), key=lambda x: x[1], reverse=True)[:3],
            "estados": dict(d['estados'])
        })
    ranking_operadores.sort(key=lambda x: x['expedientes'], reverse=True)

    # Estructura del Cubo Final RTU Julio 2026
    cubo_rtu = {
        "cubo_nombre": "RTU JULIO 2026",
        "fecha_corte": "2026-07-31",
        "total_expedientes": total_expedientes,
        "resumen_estados": dict(estados_count),
        "dimensiones": {
            "meses": ["2026-07"],
            "anios": ["2026"],
            "regiones": sorted(list(regiones_set)),
            "macro_gestiones": ["ACTUALIZACIÓN", "INSCRIPCIÓN", "CANCELACIÓN / CESE", "ACTIVACIÓN / HABILITACIÓN"],
            "gestiones": sorted(list(gestiones_set)),
            "estados": sorted(list(estados_set)),
            "origenes": sorted(list(origenes_set)),
            "total_operadores": len(ranking_operadores)
        },
        "ranking_operadores": ranking_operadores[:50],
        "cols": cols,
        "rows": rows
    }

    # Guardar en JSON y JSON.GZ
    out_json = f"{data_dir}/cubo_rtu_julio_2026.json"
    out_gz   = f"{data_dir}/cubo_rtu_julio_2026.json.gz"
    
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(cubo_rtu, f, ensure_ascii=False, indent=2)
        
    with gzip.open(out_gz, 'wt', encoding='utf-8') as f:
        json.dump(cubo_rtu, f, ensure_ascii=False)
        
    # También actualizar el cubo_rtu.json principal para el frontend
    with open(f"{data_dir}/cubo_rtu.json", 'w', encoding='utf-8') as f:
        json.dump(cubo_rtu, f, ensure_ascii=False, indent=2)
    with gzip.open(f"{data_dir}/cubo_rtu.json.gz", 'wt', encoding='utf-8') as f:
        json.dump(cubo_rtu, f, ensure_ascii=False)

    print("\n" + "=" * 70)
    print("✅ CUBO OLAP RTU JULIO 2026 GENERADO EXITOSAMENTE")
    print("=" * 70)
    print(f"📁 Destino JSON:    {out_json} ({os.path.getsize(out_json):,} bytes)")
    print(f"📁 Destino GZIP:    {out_gz} ({os.path.getsize(out_gz):,} bytes)")
    print(f"📊 Total Filas Agregadas en el Cubo: {len(rows):,}")
    print(f"📋 Estados detectados: {dict(estados_count)}")
    print(f"👤 Total Operadores Identificados: {len(ranking_operadores):,}")
    print("=" * 70)

if __name__ == "__main__":
    build_rtu_julio_olap()
