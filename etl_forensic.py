#!/usr/bin/env python3
"""
ETL Forense: Genera forensic_cases.json Y chunks paginados desde los Excel de AV (SAT Guatemala).
Salida: 
  - public/data/forensic_cases.json (archivo completo)
  - public/data/forensic/index.json (índice de chunks)
  - public/data/forensic/chunk_NNN.json (chunks de 5000 registros)
"""
import pandas as pd
import numpy as np
import glob, os, json, sys, gzip
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'src', 'data')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'data')
CHUNK_DIR = os.path.join(OUT_DIR, 'forensic')
CHUNK_SIZE = 5000

WORK_START_HOUR = 8
WORK_END_HOUR = 16
DAILY_WORK_HOURS = WORK_END_HOUR - WORK_START_HOUR  # 8.0

HOLIDAYS_2026 = pd.to_datetime([
    '2026-01-01', '2026-04-02', '2026-04-03', '2026-05-01',
    '2026-06-30', '2026-09-15', '2026-10-20', '2026-11-01',
    '2026-12-25'
]).normalize()


def compute_business_hours(start_series, end_series):
    """Calcula horas hábiles vectorizadas (Lun-Vie 08:00 - 16:00, 8h netas/día)."""
    valid_mask = start_series.notna() & end_series.notna()
    result = pd.Series(np.nan, index=start_series.index, dtype=float)
    if not valid_mask.any():
        return result

    s = start_series[valid_mask].copy()
    e = end_series[valid_mask].copy()
    negative_mask = e < s

    s_dates = s.dt.normalize().values.astype('datetime64[D]')
    e_dates = e.dt.normalize().values.astype('datetime64[D]')
    holidays = np.array(HOLIDAYS_2026.values.astype('datetime64[D]'))

    bus_days = np.busday_count(s_dates, e_dates, holidays=holidays)

    s_hour = s.dt.hour + s.dt.minute / 60.0 + s.dt.second / 3600.0
    s_work_start = np.clip(s_hour, WORK_START_HOUR, WORK_END_HOUR)
    s_day_is_bus = np.is_busday(s_dates, holidays=holidays)
    s_rem_hours = np.where(s_day_is_bus, WORK_END_HOUR - s_work_start, 0.0)

    e_hour = e.dt.hour + e.dt.minute / 60.0 + e.dt.second / 3600.0
    e_work_end = np.clip(e_hour, WORK_START_HOUR, WORK_END_HOUR)
    e_day_is_bus = np.is_busday(e_dates, holidays=holidays)
    e_elapsed_hours = np.where(e_day_is_bus, e_work_end - WORK_START_HOUR, 0.0)

    same_day = (s_dates == e_dates)
    same_day_hours = np.where(
        s_day_is_bus & same_day,
        np.maximum(0.0, e_work_end - s_work_start),
        0.0
    )

    middle_bus_days = np.maximum(0, bus_days - np.where(s_day_is_bus, 1, 0))
    diff_day_hours = middle_bus_days * DAILY_WORK_HOURS + s_rem_hours + e_elapsed_hours

    final_hours = np.where(same_day, same_day_hours, diff_day_hours)
    final_hours = np.where(negative_mask, 0.0, final_hours)

    result[valid_mask] = np.maximum(0.0, final_hours)
    return result


def load_all_excels():
    files = sorted(glob.glob(os.path.join(DATA_DIR, '*.xlsx')))
    if not files:
        print("ERROR: No se encontraron archivos Excel en", DATA_DIR)
        sys.exit(1)

    repaired_dfs = []
    for f in files:
        print(f"  Cargando: {os.path.basename(f)}")
        df = pd.read_excel(f, engine='openpyxl')
        df.columns = [c.strip().lower() for c in df.columns]

        is_valid_gestion = df['numerogestion'].astype(str).str.match(r'^\s*202\d', na=False)
        invalid_mask = ~is_valid_gestion

        if invalid_mask.any():
            clean_rows = []
            for i in range(len(df)):
                if is_valid_gestion.iloc[i]:
                    clean_rows.append(df.iloc[i].to_dict())
                else:
                    if clean_rows:
                        extra_text = " ".join([
                            str(df.iloc[i][c]) for c in ['nit', 'nombrecontribuyente', 'numerogestion']
                            if pd.notna(df.iloc[i][c]) and str(df.iloc[i][c]).strip() != ''
                        ])
                        prev_motivo = str(clean_rows[-1].get('motivorechazo', ''))
                        if prev_motivo in ['nan', 'None', '']:
                            clean_rows[-1]['motivorechazo'] = extra_text
                        else:
                            clean_rows[-1]['motivorechazo'] = prev_motivo + " " + extra_text
            repaired_df = pd.DataFrame(clean_rows)
        else:
            repaired_df = df

        repaired_dfs.append(repaired_df)

    full = pd.concat(repaired_dfs, ignore_index=True)
    full = full.drop_duplicates()

    date_cols = [c for c in full.columns if 'fecha' in c]
    for d in date_cols:
        full[d] = pd.to_datetime(full[d], errors='coerce')

    return full


def build_forensic_cases(full):
    print("\n  Construyendo expedientes individuales con métricas duales...")

    fc = 'fechacreacion' if 'fechacreacion' in full.columns else None
    fa = 'fechaasignacion' if 'fechaasignacion' in full.columns else None
    fr = 'fecharevision' if 'fecharevision' in full.columns else None
    ff = 'fechafinaliza' if 'fechafinaliza' in full.columns else None
    frc = 'fecharechazo' if 'fecharechazo' in full.columns else None

    group = full.groupby('numerogestion')

    master = group.agg({
        'gestion': 'first',
        'region_contribuyente': 'first',
    }).rename(columns={'region_contribuyente': 'region'})

    if fc:
        sorted_df = full.sort_values(by=fc)
        master['estado'] = sorted_df.groupby('numerogestion')['estadoactual'].last()
    else:
        master['estado'] = group['estadoactual'].last()

    master['bitacora_estados'] = group['nombrebitacora'].apply(lambda x: list(x.dropna().unique()))

    if fc: master['fecha_creacion'] = group[fc].min()
    if fa: master['fecha_asignacion'] = group[fa].min()
    if fr: master['fecha_revision'] = group[fr].min()
    if ff: master['fecha_finaliza'] = group[ff].min()
    if frc: master['fecha_rechazo'] = group[frc].min()

    if 'motivorechazo' in full.columns:
        master['motivo_rechazo'] = group['motivorechazo'].first()

    master['n_eventos'] = group.size()

    # Medidas
    master['es_atendida'] = (master['fecha_asignacion'].notna() & master['fecha_revision'].notna()).astype(int)

    # 1. Tiempos en Cola (Calendario vs Hábil)
    if 'fecha_creacion' in master.columns and 'fecha_asignacion' in master.columns:
        delta = master['fecha_asignacion'] - master['fecha_creacion']
        master['t_cola_cal_h'] = (delta.dt.total_seconds() / 3600.0).clip(lower=0)
        master['t_cola_hab_h'] = compute_business_hours(master['fecha_creacion'], master['fecha_asignacion'])
    else:
        master['t_cola_cal_h'] = np.nan
        master['t_cola_hab_h'] = np.nan

    # 2. Tiempos Totales (Calendario vs Hábil)
    if 'fecha_creacion' in master.columns and 'fecha_finaliza' in master.columns:
        delta = master['fecha_finaliza'] - master['fecha_creacion']
        master['t_total_cal_h'] = (delta.dt.total_seconds() / 3600.0).clip(lower=0)
        master['t_total_hab_h'] = compute_business_hours(master['fecha_creacion'], master['fecha_finaliza'])
    else:
        master['t_total_cal_h'] = np.nan
        master['t_total_hab_h'] = np.nan

    master['tiene_rechazo'] = master['fecha_rechazo'].notna().astype(int) if 'fecha_rechazo' in master.columns else 0

    def normalize_sat_estado(row):
        st = str(row.get('estado', '')).upper().strip()
        valid_states = [
            'APROBADA', 'NO CONFIRMADA', 'RECHAZADA CON REQUERIMIENTO',
            'CANCELADA POR ADMINISTRADOR', 'CANCELADA POR EL CONTRIBUYENTE',
            'CANCELADA POR REQUERIMIENTO', 'CANCELADA POR CANTIDAD DE RECHAZOS',
            'CANCELADA POR POSIBLES ANOMALÍAS CONSTANCIA DE RENAP',
            'CANCELADA POR POSIBLES ANOMALÍAS DPI', 'CANCELADA', 'CREADA'
        ]
        if st in valid_states:
            return st
        bitacora = row.get('bitacora_estados', [])
        if isinstance(bitacora, list):
            for b in reversed(bitacora):
                b_up = str(b).upper().strip()
                if b_up in valid_states:
                    return b_up
        if 'APROB' in st: return 'APROBADA'
        if 'RECHAZ' in st: return 'RECHAZADA CON REQUERIMIENTO'
        if 'CANCEL' in st: return 'CANCELADA'
        if 'CREAD' in st: return 'CREADA'
        return 'NO CONFIRMADA'

    master['estado_norm'] = master.apply(normalize_sat_estado, axis=1)
    master['es_subsanada'] = ((master['estado_norm'] == 'APROBADA') & (master['tiene_rechazo'] == 1)).astype(int)
    master['es_ftr'] = ((master['estado_norm'] == 'APROBADA') & (master['tiene_rechazo'] == 0)).astype(int)

    def clasificar_motivo(motivo):
        if pd.isna(motivo) or str(motivo).strip() in ['', 'nan', 'None']:
            return 'SIN_MOTIVO'
        m = str(motivo).upper()
        if any(k in m for k in ['DPI', 'DOCUMENT', 'IDENTIF', 'PASAPORTE']): return 'DOCUMENTACION_DPI'
        elif any(k in m for k in ['VIDEO', 'CONFIRM', 'BIOMETR']): return 'VIDEO_CONFIRMACION'
        elif any(k in m for k in ['SISTEMA', 'MAC', 'BLOQU', 'REGLA', 'AUTOMAT']): return 'SISTEMA_REGLAS_DURAS'
        elif any(k in m for k in ['DATO', 'INCONSIST', 'DIRECC', 'CORREO', 'TELEFONO']): return 'DATOS_INCONSISTENTES'
        elif any(k in m for k in ['REPRESENT', 'LEGAL', 'PODER', 'MANDAT']): return 'REPRESENTACION_LEGAL'
        return 'OTROS'

    master['macro_rechazo'] = master['motivo_rechazo'].apply(clasificar_motivo) if 'motivo_rechazo' in master.columns else 'SIN_MOTIVO'

    def normalize_sat_region(region):
        r = str(region).upper().strip()
        if 'CENTRAL' in r: return 'CENTRAL'
        if 'SUR' in r: return 'SUR'
        if 'OCCIDENTE' in r: return 'OCCIDENTE'
        if 'NORORIENTE' in r: return 'NORORIENTE'
        return 'CENTRAL'

    def normalize_sat_gestion(g):
        gu = str(g).upper().strip()
        if 'ACTIVACI' in gu: return 'ACTIVACIÓN'
        if 'CORREO' in gu or 'CAMBIO' in gu: return 'CAMBIO DE CORREO ELECTRÓNICO'
        return 'ACTIVACIÓN'

    master['region_norm'] = master['region'].apply(normalize_sat_region)
    master['gestion_norm'] = master['gestion'].apply(normalize_sat_gestion)

    # Solo atendidos para el módulo forense
    master = master[master['es_atendida'] == 1].copy()
    print(f"  Expedientes atendidos: {len(master):,}")
    return master


def export_all(master):
    """Exporta JSON completo + chunks paginados + .gz comprimido."""
    print("\n  Exportando datos forenses con doble métrica...")
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(CHUNK_DIR, exist_ok=True)

    if master.index.name == 'numerogestion':
        master = master.reset_index()

    records = []
    for _, row in master.iterrows():
        r = {
            'i': row.get('numerogestion', ''),
            't': row.get('gestion_norm', ''),
            'r': row.get('region_norm', ''),
            'e': row.get('estado_norm', '')
        }
        if row.get('macro_rechazo') and row['macro_rechazo'] != 'SIN_MOTIVO':
            r['m'] = row['macro_rechazo']

        for src, dst in [('fecha_creacion','fc'),('fecha_asignacion','fa'),('fecha_revision','fr'),('fecha_finaliza','ff'),('fecha_rechazo','frz')]:
            v = row.get(src)
            if pd.notna(v) and v is not None:
                r[dst] = str(v)[:19]

        if pd.notna(row.get('t_cola_cal_h')): r['tc'] = round(float(row['t_cola_cal_h']), 1)
        if pd.notna(row.get('t_cola_hab_h')): r['th'] = round(float(row['t_cola_hab_h']), 1)
        if pd.notna(row.get('t_total_cal_h')): r['tt'] = round(float(row['t_total_cal_h']), 1)
        if pd.notna(row.get('t_total_hab_h')): r['tth'] = round(float(row['t_total_hab_h']), 1)

        if row.get('tiene_rechazo'): r['cr'] = 1
        if row.get('es_subsanada'): r['sb'] = 1
        if row.get('es_ftr'): r['ft'] = 1
        if row.get('n_eventos') and row['n_eventos'] > 1: r['ne'] = int(row['n_eventos'])
        records.append(r)

    # 1. Archivo completo JSON
    full_path = os.path.join(OUT_DIR, 'forensic_cases.json')
    with open(full_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, separators=(',', ':'))
    size_mb = os.path.getsize(full_path) / (1024 * 1024)
    print(f"  ✅ Archivo completo: {full_path} ({size_mb:.1f} MB)")

    # 2. Archivo comprimido .gz
    gz_path = os.path.join(OUT_DIR, 'forensic_cases.json.gz')
    with gzip.open(gz_path, 'wt', encoding='utf-8') as gf:
        json.dump(records, gf, ensure_ascii=False, separators=(',', ':'))
    size_gz_mb = os.path.getsize(gz_path) / (1024 * 1024)
    print(f"  ✅ Archivo GZ: {gz_path} ({size_gz_mb:.1f} MB)")

    # 3. Chunks paginados
    chunks = [records[i:i+CHUNK_SIZE] for i in range(0, len(records), CHUNK_SIZE)]
    for i, chunk in enumerate(chunks):
        path = os.path.join(CHUNK_DIR, f'chunk_{i:03d}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(',', ':'))

    # 4. Índice
    index = {'total': len(records), 'chunk_size': CHUNK_SIZE, 'chunks': len(chunks)}
    with open(os.path.join(CHUNK_DIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f)

    size_chunks = sum(os.path.getsize(os.path.join(CHUNK_DIR, f'chunk_{i:03d}.json')) for i in range(len(chunks)))
    print(f"  ✅ Chunks: {len(chunks)} archivos ({size_chunks/1024/1024:.1f} MB total, ~{size_chunks/len(chunks)/1024:.0f} KB c/u)")
    print(f"  ✅ Índice: {CHUNK_DIR}/index.json")


if __name__ == '__main__':
    print("=" * 60)
    print("  ETL FORENSE — Expedientes Individuales con Doble Métrica — SAT Guatemala")
    print("=" * 60)

    full = load_all_excels()
    master = build_forensic_cases(full)
    export_all(master)

    print("\n" + "=" * 60)
    print("  ✅ ETL Forense completado")
    print("=" * 60)
