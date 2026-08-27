#!/usr/bin/env python3
"""
Cálculo exacto del tiempo desde que se CREA la gestión hasta que se REVISA (fecha_creacion_solicitud -> fecha_revisor)
Analizando todos los archivos de RTU presentes en public/data
"""
import os
import glob
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, time, timedelta

def parse_xlsx_fast(filepath):
    print(f"  -> Leyendo {filepath}...")
    with zipfile.ZipFile(filepath, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for elem in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                texts = [t.text for t in elem.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
                shared_strings.append(''.join(texts))

        sheet_xml = z.open('xl/worksheets/sheet1.xml')
        rows = []
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
        return records

def parse_date(date_str):
    if not date_str or date_str in ['', 'None', 'null', '-']:
        return None
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M'):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    try:
        clean_str = date_str.replace('T', ' ').split('.')[0]
        return datetime.strptime(clean_str, '%Y-%m-%d %H:%M:%S')
    except Exception:
        return None

def calc_business_hours(dt_start, dt_end):
    """Calcula horas hábiles entre 08:00 y 16:00 de Lunes a Viernes"""
    if not dt_start or not dt_end or dt_end < dt_start:
        return 0.0
    
    current = dt_start
    total_seconds = 0
    
    # Si es el mismo día
    if current.date() == dt_end.date():
        if current.weekday() < 5:
            # Ventana del día
            w_start = max(current, datetime.combine(current.date(), time(8, 0)))
            w_end = min(dt_end, datetime.combine(current.date(), time(16, 0)))
            if w_end > w_start:
                total_seconds += (w_end - w_start).total_seconds()
        return total_seconds / 3600.0
    
    # Primer día
    if current.weekday() < 5:
        w_start = max(current, datetime.combine(current.date(), time(8, 0)))
        w_end = datetime.combine(current.date(), time(16, 0))
        if w_end > w_start:
            total_seconds += (w_end - w_start).total_seconds()
            
    # Días intermedios
    curr_date = current.date() + timedelta(days=1)
    while curr_date < dt_end.date():
        if curr_date.weekday() < 5:
            total_seconds += 8 * 3600
        curr_date += timedelta(days=1)
        
    # Último día
    if dt_end.weekday() < 5:
        w_start = datetime.combine(dt_end.date(), time(8, 0))
        w_end = min(dt_end, datetime.combine(dt_end.date(), time(16, 0)))
        if w_end > w_start:
            total_seconds += (w_end - w_start).total_seconds()
            
    return total_seconds / 3600.0

def main():
    data_dir = "public/data"
    excel_files = sorted(glob.glob(f"{data_dir}/10000390411_reporteRTUjulio*.xlsx"))
    raw = []
    for ef in excel_files:
        raw.extend(parse_xlsx_fast(ef))
            
    print(f"Total registros cargados: {len(raw):,}")
    
    con_fecha_revisor = []
    sin_fecha_revisor = 0
    horas_calendario = []
    horas_habiles = []
    
    for r in raw:
        f_crea = parse_date(r.get('fecha_creacion_solicitud'))
        f_rev  = parse_date(r.get('fecha_revisor'))
        
        if f_crea and f_rev:
            diff_cal = (f_rev - f_crea).total_seconds() / 3600.0
            if diff_cal >= 0:
                diff_hab = calc_business_hours(f_crea, f_rev)
                horas_calendario.append(diff_cal)
                horas_habiles.append(diff_hab)
                con_fecha_revisor.append((diff_cal, diff_hab, r.get('region', 'SIN_REGION'), r.get('gestion', 'SIN_GESTION')))
        else:
            sin_fecha_revisor += 1
            
    total_validos = len(horas_calendario)
    print(f"\n--- RESULTADOS EXACTOS (CREACIÓN -> REVISIÓN) ---")
    print(f"1. Cantidad total de casos con fecha_revisor válida: {total_validos:,} (de {len(raw):,} totales)")
    print(f"2. Casos sin revisor (automáticos / cancelados antes de asignar): {sin_fecha_revisor:,}")
    
    horas_calendario.sort()
    horas_habiles.sort()
    
    prom_cal = sum(horas_calendario) / total_validos
    med_cal = horas_calendario[total_validos // 2]
    
    prom_hab = sum(horas_habiles) / total_validos
    med_hab = horas_habiles[total_validos // 2]
    
    print(f"\n3. TIEMPO EN HORAS HÁBILES (Jornada SAT 08:00 - 16:00):")
    print(f"   - Promedio: {prom_hab:.2f} horas ({prom_hab*60:.1f} minutos)")
    print(f"   - Mediana (p50): {med_hab:.2f} horas ({med_hab*60:.1f} minutos)")
    
    print(f"\n4. TIEMPO EN HORAS CALENDARIO (Reloj continuo 24/7):")
    print(f"   - Promedio: {prom_cal:.2f} horas")
    print(f"   - Mediana (p50): {med_cal:.2f} horas ({med_cal*60:.1f} minutos)")
    
    # Desglose por rangos de tiempo hábil
    print(f"\n5. DISTRIBUCIÓN POR TIEMPO DE ESPERA HASTA REVISIÓN (Horas Hábiles):")
    b_menos_15m = sum(1 for h in horas_habiles if h <= 0.25)
    b_15m_1h = sum(1 for h in horas_habiles if 0.25 < h <= 1.0)
    b_1h_4h = sum(1 for h in horas_habiles if 1.0 < h <= 4.0)
    b_4h_8h = sum(1 for h in horas_habiles if 4.0 < h <= 8.0)
    b_mas_8h = sum(1 for h in horas_habiles if h > 8.0)
    
    print(f"   - Inmediato / <= 15 min: {b_menos_15m:,} ({b_menos_15m/total_validos*100:.1f}%)")
    print(f"   - De 15 min a 1 hora:    {b_15m_1h:,} ({b_15m_1h/total_validos*100:.1f}%)")
    print(f"   - De 1 hora a 4 horas:   {b_1h_4h:,} ({b_1h_4h/total_validos*100:.1f}%)")
    print(f"   - De 4 horas a 8 horas:  {b_4h_8h:,} ({b_4h_8h/total_validos*100:.1f}%)")
    print(f"   - Más de 8 horas hábiles:{b_mas_8h:,} ({b_mas_8h/total_validos*100:.1f}%)")

if __name__ == "__main__":
    main()
