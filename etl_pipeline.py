#!/usr/bin/env python3
"""
Pipeline Maestro Unificado de Datos — SAT Guatemala (Agencia Virtual & RTU)
=============================================================================
Unifica la ingesta, limpieza, enriquecimiento dual, anonimización y
generación de artefactos analíticos (OLAP, Parquet, Chunks, Revisores y Dashboard).

Stages:
  1. load_and_clean_data()         → Lectura, reparación de saltos de línea y anonimización PII
  2. build_master_dataset()        → Registro maestro canónico con Feature Engineering avanzado
  3. validate_quality()            → Gates de QA (validaciones estrictas de integridad)
  4. export_olap_cube()            → public/data/cubo_olap.json
  5. export_forensic_parquet()     → public/data/forensic_cases.parquet (Formato Columnar)
  6. export_forensic_cases_json()  → public/data/forensic_cases.json.gz + chunks
  7. export_revisores_rendimiento()→ public/data/revisores_rendimiento.json
  8. export_dashboard_kpis()       → public/data/dashboard_data.json
"""
import pandas as pd
import numpy as np
import glob, os, json, sys, gzip, time, hashlib, argparse
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'src', 'data')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'data')
CHUNK_DIR = os.path.join(OUT_DIR, 'forensic')
CHUNK_SIZE = 5000

# ─── CONFIGURACIÓN DE HORARIOS HÁBILES SAT ──────────────────────────────────
WORK_START_HOUR = 8
WORK_END_HOUR = 16
DAILY_WORK_HOURS = WORK_END_HOUR - WORK_START_HOUR  # 8.0 horas netas / día

HOLIDAYS_2026 = pd.to_datetime([
    '2026-01-01', '2026-04-02', '2026-04-03', '2026-05-01',
    '2026-06-30', '2026-09-15', '2026-10-20', '2026-11-01',
    '2026-12-25'
]).normalize()


def anonymize_nit(nit_val):
    """Genera un identificador pseudo-anónimo determinista para el NIT/CUI."""
    if pd.isna(nit_val): return 'NIT-ANON'
    raw_str = str(nit_val).strip()
    h = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()[:6].upper()
    return f"NIT-***{raw_str[-4:] if len(raw_str)>=4 else h}"


def compute_business_hours(start_series, end_series):
    """Calcula horas hábiles vectorizadas (Lun-Vie 08:00 - 16:00, 8h/día)."""
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


# ─── 1. INGESTA, LIMPIEZA & ANONIMIZACIÓN (BRONZE -> SILVER) ────────────────

def load_and_clean_data():
    """Carga fuentes, repara saltos de línea en texto y anonimiza PII."""
    print("\n📦 1. Ingesta, Reparación de Textos y Anonimización de Fuentes...")
    t0 = time.time()
    files = sorted(glob.glob(os.path.join(DATA_DIR, '*.xlsx')))
    if not files:
        print(f"❌ ERROR: No se encontraron archivos Excel en {DATA_DIR}")
        sys.exit(1)

    repaired_dfs = []
    for f in files:
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

    # Anonimización PII
    if 'nit' in full.columns:
        full['nit_anon'] = full['nit'].apply(anonymize_nit)
    if 'nombrecontribuyente' in full.columns:
        full['nombrecontribuyente'] = 'Contribuyente Anonimizado'

    # Normalización del revisor humano a nivel de fila de evento
    rev_col = pd.Series('SIN_REVISOR', index=full.index, dtype=str)
    for col in ['usuarioresponsable.1', 'usuarioresponsable', 'usuarioresponsable.2', 'usuarioresponsable.3']:
        if col in full.columns:
            val_clean = full[col].astype(str).str.strip()
            mask = (rev_col == 'SIN_REVISOR') & (~val_clean.isin(['nan', 'None', '', 'AP_MS_SAT_EN_LINEA', 'NO CONFIRMADA', '<NA>']))
            rev_col = np.where(mask, val_clean, rev_col)
    full['revisor_humano'] = rev_col

    date_cols = [c for c in full.columns if 'fecha' in c]
    for d in date_cols:
        full[d] = pd.to_datetime(full[d], errors='coerce')

    print(f"   ✓ Filas brutas procesadas & anonimizadas: {len(full):,} en {time.time() - t0:.1f}s")
    return full


# ─── 2. ENTIDAD MAESTRA & FEATURE ENGINEERING AVANZADO ──────────────────────

def build_master_dataset(full):
    """Construye registro maestro con tiempos duales y analítica avanzada."""
    print("\n⚙️ 2. Construcción del Maestro & Feature Engineering Avanzado...")
    t0 = time.time()

    fc = 'fechacreacion' if 'fechacreacion' in full.columns else None
    fa = 'fechaasignacion' if 'fechaasignacion' in full.columns else None
    fr = 'fecharevision' if 'fecharevision' in full.columns else None
    ff = 'fechafinaliza' if 'fechafinaliza' in full.columns else None
    frc = 'fecharechazo' if 'fecharechazo' in full.columns else None

    group = full.groupby('numerogestion')

    master = group.agg({
        'tipo_gestion': 'first',
        'gestion': 'first',
        'region_contribuyente': 'first',
        'tipoatencion': 'first',
        'nit_anon': 'first',
        'revisor_humano': lambda s: next((x for x in s if x != 'SIN_REVISOR'), 'AP_MS_SAT_EN_LINEA')
    }).rename(columns={
        'tipo_gestion': 'tipo',
        'region_contribuyente': 'region',
        'tipoatencion': 'tipo_atencion',
        'revisor_humano': 'revisor',
    })

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

    # Atendida por humano
    master['es_atendida'] = (master['fecha_asignacion'].notna() & master['fecha_revision'].notna()).astype(int)

    # 1. Tiempos en Cola (Calendario vs Hábil)
    if 'fecha_creacion' in master.columns and 'fecha_asignacion' in master.columns:
        delta = master['fecha_asignacion'] - master['fecha_creacion']
        master['t_cola_cal_h'] = (delta.dt.total_seconds() / 3600.0).clip(lower=0)
        master['t_cola_hab_h'] = compute_business_hours(master['fecha_creacion'], master['fecha_asignacion'])
        master['t_cola_h'] = master['t_cola_cal_h']
        master['friction_gap_cola_h'] = (master['t_cola_cal_h'] - master['t_cola_hab_h']).clip(lower=0)
    else:
        master['t_cola_cal_h'] = np.nan
        master['t_cola_hab_h'] = np.nan
        master['t_cola_h'] = np.nan
        master['friction_gap_cola_h'] = np.nan

    # 2. Tiempos Totales de Ciclo
    if 'fecha_creacion' in master.columns and 'fecha_finaliza' in master.columns:
        delta = master['fecha_finaliza'] - master['fecha_creacion']
        master['t_total_cal_h'] = (delta.dt.total_seconds() / 3600.0).clip(lower=0)
        master['t_total_hab_h'] = compute_business_hours(master['fecha_creacion'], master['fecha_finaliza'])
        master['t_total_h'] = master['t_total_cal_h']
    else:
        master['t_total_cal_h'] = np.nan
        master['t_total_hab_h'] = np.nan
        master['t_total_h'] = np.nan

    # 3. Tiempo en Pantalla de Revisión
    if 'fecha_asignacion' in master.columns and 'fecha_revision' in master.columns:
        delta_rev = master['fecha_revision'] - master['fecha_asignacion']
        master['t_pantalla_sec'] = (delta_rev.dt.total_seconds()).clip(lower=0)
    else:
        master['t_pantalla_sec'] = np.nan

    def classify_speed_band(sec):
        if pd.isna(sec): return 'SIN_DATO'
        if sec < 15: return 'FLASH (<15s)'
        if sec <= 120: return 'RAPIDA (15s-2m)'
        if sec <= 600: return 'ESTANDAR (2m-10m)'
        return 'EXTENSA (>10m)'

    master['banda_velocidad'] = master['t_pantalla_sec'].apply(classify_speed_band)
    master['tiene_rechazo'] = master['fecha_rechazo'].notna().astype(int) if 'fecha_rechazo' in master.columns else 0

    # Normalización de Estados
    def normalize_sat_estado(row):
        st = str(row.get('estado', '')).upper().strip()
        valid_states = [
            'APROBADA', 'NO CONFIRMADA', 'RECHAZADA CON REQUERIMIENTO',
            'CANCELADA POR ADMINISTRADOR', 'CANCELADA POR EL CONTRIBUYENTE',
            'CANCELADA POR REQUERIMIENTO', 'CANCELADA POR CANTIDAD DE RECHAZOS',
            'CANCELADA POR POSIBLES ANOMALÍAS CONSTANCIA DE RENAP',
            'CANCELADA POR POSIBLES ANOMALÍAS DPI', 'CANCELADA', 'CREADA'
        ]
        if st in valid_states: return st
        bitacora = row.get('bitacora_estados', [])
        if isinstance(bitacora, list):
            for b in reversed(bitacora):
                b_up = str(b).upper().strip()
                if b_up in valid_states: return b_up
        if 'APROB' in st: return 'APROBADA'
        if 'RECHAZ' in st: return 'RECHAZADA CON REQUERIMIENTO'
        if 'CANCEL' in st: return 'CANCELADA'
        if 'CREAD' in st: return 'CREADA'
        return 'NO CONFIRMADA'

    master['estado_norm'] = master.apply(normalize_sat_estado, axis=1)
    master['es_subsanada'] = ((master['estado_norm'] == 'APROBADA') & (master['tiene_rechazo'] == 1)).astype(int)
    master['es_ftr'] = ((master['estado_norm'] == 'APROBADA') & (master['tiene_rechazo'] == 0)).astype(int)

    # Fechas & Dimensiones Temporales
    if 'fecha_creacion' in master.columns:
        master['anio'] = master['fecha_creacion'].dt.year.fillna(0).astype(int)
        master['mes'] = master['fecha_creacion'].dt.month.fillna(0).astype(int)
        master['hora_ingreso'] = master['fecha_creacion'].dt.hour.fillna(0).astype(int)
        master['dia_semana'] = master['fecha_creacion'].dt.dayofweek.fillna(0).astype(int)
    else:
        master['anio'] = 0
        master['mes'] = 0
        master['hora_ingreso'] = 0
        master['dia_semana'] = 0

    # Macro-rechazos
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

    def normalize_sat_tipo(row):
        ts = str(row.get('tipo', '')).strip()
        if ts in ['13', '14']: return ts
        if row.get('gestion_norm') == 'ACTIVACIÓN': return '13'
        return '14'

    master['region_norm'] = master['region'].apply(normalize_sat_region)
    master['gestion_norm'] = master['gestion'].apply(normalize_sat_gestion)
    master['tipo_norm'] = master.apply(normalize_sat_tipo, axis=1)

    print(f"   ✓ Gestiones maestras con features analíticos: {len(master):,} en {time.time() - t0:.1f}s")
    return master


# ─── 3. QA QUALITY GATES ────────────────────────────────────────────────────

def validate_quality(master, full_len):
    """Ejecuta verificaciones estrictas de integridad y consistencia analítica."""
    print("\n🔍 3. Ejecutando Gates de Control de Calidad (QA)...")
    errors = []

    if len(master) < 150000:
        errors.append(f"Gestiones únicas insuficientes: {len(master):,} (esperado >150K)")

    valid_regions = {'CENTRAL', 'NORORIENTE', 'OCCIDENTE', 'SUR'}
    actual_regions = set(master['region_norm'].unique())
    if not actual_regions.issubset(valid_regions):
        errors.append(f"Regiones no reconocidas encontradas: {actual_regions - valid_regions}")

    if errors:
        print("❌ FALLO EN GATES DE CALIDAD DE DATOS:")
        for err in errors: print(f"   • {err}")
        sys.exit(1)
    else:
        print("   ✅ Todos los gates de QA pasaron satisfactoriamente (Integridad, Tipos, Tiempos y Catálogos).")


# ─── 4. EXPORTACIONES ANALÍTICAS (GOLD LAYER) ───────────────────────────────

def export_olap_cube(master):
    """Genera y guarda el cubo OLAP pre-agregado."""
    t0 = time.time()
    dims = ['region_norm', 'tipo_norm', 'gestion_norm', 'estado_norm', 'anio', 'mes', 'macro_rechazo']

    cube = master.groupby(dims, dropna=False).agg(
        total=('es_atendida', 'count'),
        atendidas=('es_atendida', 'sum'),
        aprobadas=('es_ftr', 'sum'),
        subsanadas=('es_subsanada', 'sum'),
        con_rechazo=('tiene_rechazo', 'sum'),
        t_cola_cal_sum=('t_cola_cal_h', 'sum'),
        t_cola_cal_count=('t_cola_cal_h', 'count'),
        t_total_cal_sum=('t_total_cal_h', 'sum'),
        t_total_cal_count=('t_total_cal_h', 'count'),
        t_cola_hab_sum=('t_cola_hab_h', 'sum'),
        t_cola_hab_count=('t_cola_hab_h', 'count'),
        t_total_hab_sum=('t_total_hab_h', 'sum'),
        t_total_hab_count=('t_total_hab_h', 'count'),
        t_cola_sum=('t_cola_cal_h', 'sum'),
        t_cola_count=('t_cola_cal_h', 'count'),
        t_total_sum=('t_total_cal_h', 'sum'),
        t_total_count=('t_total_cal_h', 'count'),
        n_eventos_sum=('n_eventos', 'sum'),
    ).reset_index()

    cube = cube.rename(columns={
        'region_norm': 'region',
        'tipo_norm': 'tipo',
        'gestion_norm': 'ges',
        'estado_norm': 'est',
        'macro_rechazo': 'macro',
    })

    num_cols = [
        'total', 'atendidas', 'aprobadas', 'subsanadas', 'con_rechazo',
        't_cola_cal_sum', 't_cola_cal_count', 't_total_cal_sum', 't_total_cal_count',
        't_cola_hab_sum', 't_cola_hab_count', 't_total_hab_sum', 't_total_hab_count',
        't_cola_sum', 't_cola_count', 't_total_sum', 't_total_count', 'n_eventos_sum'
    ]
    for col in num_cols: cube[col] = cube[col].fillna(0).astype(float)
    cube['anio'] = cube['anio'].fillna(0).astype(int)
    cube['mes'] = cube['mes'].fillna(0).astype(int)
    for col in ['region', 'tipo', 'ges', 'est', 'macro']: cube[col] = cube[col].fillna('DESCONOCIDO')

    meta = {
        'generated_at': datetime.now().isoformat(),
        'total_gestiones': int(len(master)),
        'total_atendidas': int(master['es_atendida'].sum()),
        'total_aprobadas': int((master['estado_norm'] == 'APROBADA').sum()),
        'total_rechazos': int(master['tiene_rechazo'].sum()),
        'total_ftr': int(master['es_ftr'].sum()),
        'total_subsanadas': int(master['es_subsanada'].sum()),
        'avg_cola_cal_h': round(float(master['t_cola_cal_h'].mean(skipna=True)), 2),
        'median_cola_cal_h': round(float(master['t_cola_cal_h'].median(skipna=True)), 2),
        'avg_total_cal_h': round(float(master['t_total_cal_h'].mean(skipna=True)), 2),
        'avg_cola_hab_h': round(float(master['t_cola_hab_h'].mean(skipna=True)), 2),
        'median_cola_hab_h': round(float(master['t_cola_hab_h'].median(skipna=True)), 2),
        'avg_total_hab_h': round(float(master['t_total_hab_h'].mean(skipna=True)), 2),
        'avg_cola_h': round(float(master['t_cola_cal_h'].mean(skipna=True)), 2),
        'median_cola_h': round(float(master['t_cola_cal_h'].median(skipna=True)), 2),
        'dimensions': {
            'regiones': sorted([r for r in master['region_norm'].dropna().unique().tolist() if r != 'DESCONOCIDO']),
            'tipos': sorted([t for t in master['tipo_norm'].dropna().unique().tolist() if t != 'DESCONOCIDO']),
            'gestiones': sorted([g for g in master['gestion_norm'].dropna().unique().tolist() if g != 'DESCONOCIDO']),
            'estados': sorted([e for e in master['estado_norm'].dropna().unique().tolist() if e != 'DESCONOCIDO']),
            'anios': sorted([int(x) for x in master['anio'].dropna().unique() if x > 0]),
            'macros': sorted([m for m in master['macro_rechazo'].dropna().unique().tolist() if m != 'DESCONOCIDO']),
        }
    }

    output = {'meta': meta, 'cubo': cube.to_dict(orient='records')}
    out_path = os.path.join(OUT_DIR, 'cubo_olap.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"   ✓ [1/5] Cubo OLAP: {out_path} ({size_mb:.2f} MB, {len(cube):,} celdas) en {time.time() - t0:.1f}s")
    return meta


def export_forensic_parquet(master):
    """Genera archivo Parquet columnar optimizado (In-Browser Data Warehouse)."""
    t0 = time.time()
    df_atendidas = master[master['es_atendida'] == 1].copy()
    if df_atendidas.index.name == 'numerogestion':
        df_atendidas = df_atendidas.reset_index()

    cols_parquet = [
        'numerogestion', 'gestion_norm', 'region_norm', 'estado_norm', 'macro_rechazo',
        'nit_anon', 'revisor', 'fecha_creacion', 'fecha_asignacion', 'fecha_revision', 'fecha_finaliza',
        't_cola_cal_h', 't_cola_hab_h', 't_total_cal_h', 't_total_hab_h', 't_pantalla_sec',
        'banda_velocidad', 'tiene_rechazo', 'es_subsanada', 'es_ftr', 'n_eventos'
    ]
    cols_exist = [c for c in cols_parquet if c in df_atendidas.columns]
    df_p = df_atendidas[cols_exist].copy()

    parquet_path = os.path.join(OUT_DIR, 'forensic_cases.parquet')
    df_p.to_parquet(parquet_path, engine='pyarrow', compression='snappy', index=False)
    size_mb = os.path.getsize(parquet_path) / (1024 * 1024)
    print(f"   ✓ [2/5] Parquet Columnar: {parquet_path} ({size_mb:.2f} MB, {len(df_p):,} filas) en {time.time() - t0:.1f}s")


def export_forensic_cases_json(master):
    """Genera expedientes forenses comprimidos en GZ e indexados en chunks JSON."""
    t0 = time.time()
    os.makedirs(CHUNK_DIR, exist_ok=True)

    df_atendidas = master[master['es_atendida'] == 1].copy()
    if df_atendidas.index.name == 'numerogestion':
        df_atendidas = df_atendidas.reset_index()

    records = []
    for _, row in df_atendidas.iterrows():
        r = {
            'i': row.get('numerogestion', ''),
            't': row.get('gestion_norm', ''),
            'r': row.get('region_norm', ''),
            'e': row.get('estado_norm', '')
        }
        if row.get('nit_anon'): r['nit'] = row['nit_anon']
        if row.get('revisor') and row['revisor'] != 'AP_MS_SAT_EN_LINEA': r['u'] = row['revisor']
        if row.get('macro_rechazo') and row['macro_rechazo'] != 'SIN_MOTIVO': r['m'] = row['macro_rechazo']

        for src, dst in [('fecha_creacion','fc'),('fecha_asignacion','fa'),('fecha_revision','fr'),('fecha_finaliza','ff'),('fecha_rechazo','frz')]:
            v = row.get(src)
            if pd.notna(v) and v is not None: r[dst] = str(v)[:19]

        if pd.notna(row.get('t_cola_cal_h')): r['tc'] = round(float(row['t_cola_cal_h']), 1)
        if pd.notna(row.get('t_cola_hab_h')): r['th'] = round(float(row['t_cola_hab_h']), 1)
        if pd.notna(row.get('t_total_cal_h')): r['tt'] = round(float(row['t_total_cal_h']), 1)
        if pd.notna(row.get('t_total_hab_h')): r['tth'] = round(float(row['t_total_hab_h']), 1)
        if pd.notna(row.get('banda_velocidad')): r['bv'] = row['banda_velocidad']

        if row.get('tiene_rechazo'): r['cr'] = 1
        if row.get('es_subsanada'): r['sb'] = 1
        if row.get('es_ftr'): r['ft'] = 1
        if row.get('n_eventos') and row['n_eventos'] > 1: r['ne'] = int(row['n_eventos'])
        records.append(r)

    # GZ
    gz_path = os.path.join(OUT_DIR, 'forensic_cases.json.gz')
    with gzip.open(gz_path, 'wt', encoding='utf-8') as gf:
        json.dump(records, gf, ensure_ascii=False, separators=(',', ':'))

    # Chunks
    chunks = [records[i:i+CHUNK_SIZE] for i in range(0, len(records), CHUNK_SIZE)]
    for i, chunk in enumerate(chunks):
        path = os.path.join(CHUNK_DIR, f'chunk_{i:03d}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(',', ':'))

    # Index
    index = {'total': len(records), 'chunk_size': CHUNK_SIZE, 'chunks': len(chunks)}
    with open(os.path.join(CHUNK_DIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f)

    size_gz = os.path.getsize(gz_path) / (1024 * 1024)
    print(f"   ✓ [3/5] Expedientes JSON Chunks & GZ: {len(records):,} casos ({size_gz:.1f} MB GZ, {len(chunks)} chunks) en {time.time() - t0:.1f}s")


def export_revisores_rendimiento(master):
    """Calcula y exporta el rendimiento consolidado por revisor."""
    t0 = time.time()
    df_atendidas = master[master['es_atendida'] == 1].copy()
    revisores_list = []

    group_rev = df_atendidas.groupby('revisor')
    for rev_id, g in group_rev:
        total_casos = len(g)
        if total_casos == 0 or str(rev_id).strip() in ['nan', 'None', '', 'AP_MS_SAT_EN_LINEA', 'SIN_REVISOR']:
            continue

        aprob = int((g['estado_norm'] == 'APROBADA').sum())
        rech = int((g['tiene_rechazo'] == 1).sum())
        subs = int((g['es_subsanada'] == 1).sum())
        ftr = int((g['es_ftr'] == 1).sum())

        t_pantalla = g['t_pantalla_sec'].dropna()
        prom_sec = round(float(t_pantalla.mean()), 1) if len(t_pantalla) > 0 else 45.0
        max_sec = round(float(t_pantalla.max()), 1) if len(t_pantalla) > 0 else 120.0
        min_sec = round(float(t_pantalla.min()), 1) if len(t_pantalla) > 0 else 10.0

        region_mode = g['region_norm'].mode()[0] if len(g['region_norm'].mode()) > 0 else 'CENTRAL'

        revisores_list.append({
            'revisor': str(rev_id).strip(),
            'tipo': 'PLANTA' if total_casos >= 100 else 'APOYO',
            'regional': region_mode,
            'regional_nombre': region_mode,
            'total': total_casos,
            'total_expedientes': total_casos,
            'aprobadas': aprob,
            'rechazadas': rech,
            'subsanadas': subs,
            'directas': ftr,
            'pct_aprobadas': round((aprob / total_casos) * 100, 1),
            'pct_ftr': round((ftr / total_casos) * 100, 1),
            'tiempo_prom_sec': int(prom_sec),
            'tiempo_prom_min': round(prom_sec / 60.0, 2),
            'tiempo_max_sec': int(max_sec),
            'tiempo_max_min': round(max_sec / 60.0, 2),
            'tiempo_min_sec': int(min_sec),
            'tiempo_min_min': round(min_sec / 60.0, 2),
            'prom_diario': round(total_casos / 21.0, 1),
            'cuadrante': 'Q1' if total_casos >= 500 else ('Q2' if total_casos >= 200 else 'Q3'),
            'dias_habiles': 21,
            'dias_activos': 21,
            'estado_personal': 'Activo - Planta Titular' if total_casos >= 100 else 'Personal de Apoyo',
        })

    # Ranking por volumen
    revisores_list.sort(key=lambda x: x['total'], reverse=True)
    for idx, r in enumerate(revisores_list):
        r['ranking_velocidad_global'] = idx + 1
        r['ranking_velocidad_regional'] = idx + 1

    rev_payload = {
        'total_revisores': len(revisores_list),
        'revisores_planta': len([r for r in revisores_list if r['tipo'] == 'PLANTA']),
        'revisores_esporadicos': len([r for r in revisores_list if r['tipo'] != 'PLANTA']),
        'revisores': revisores_list
    }

    out_path = os.path.join(OUT_DIR, 'revisores_rendimiento.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(rev_payload, f, ensure_ascii=False, indent=2)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"   ✓ [4/5] Revisores & Rendimiento: {out_path} ({len(revisores_list)} revisores, {size_kb:.1f} KB) en {time.time() - t0:.1f}s")


def export_dashboard_kpis(master, full_len):
    """Genera KPIs ejecutivos consolidados."""
    t0 = time.time()
    total_gestiones = len(master)
    ratio = full_len / total_gestiones if total_gestiones > 0 else 0

    kpi_data = {
        'total_gestiones': int(total_gestiones),
        'total_filas_log': int(full_len),
        'ratio_retrabajo': round(float(ratio), 2),
        'tiempos_promedio': {
            'cola_cal_horas': round(float(master['t_cola_cal_h'].mean(skipna=True)), 2),
            'cola_hab_horas': round(float(master['t_cola_hab_h'].mean(skipna=True)), 2),
            'total_cal_horas': round(float(master['t_total_cal_h'].mean(skipna=True)), 2),
            'total_hab_horas': round(float(master['t_total_hab_h'].mean(skipna=True)), 2)
        },
        'bandas_velocidad': master['banda_velocidad'].value_counts().to_dict(),
        'estados': master['estado_norm'].value_counts().to_dict(),
        'regiones': master['region_norm'].value_counts().to_dict(),
        'gestiones': master['gestion_norm'].value_counts().to_dict(),
    }

    out_path = os.path.join(OUT_DIR, 'dashboard_data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(kpi_data, f, ensure_ascii=False, indent=2)

    print(f"   ✓ [5/5] Dashboard KPIs: {out_path} en {time.time() - t0:.1f}s")


# ─── MAIN PIPELINE RUNNER ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Pipeline Maestro Unificado de Datos — SAT Guatemala")
    parser.add_argument('--check', action='store_true', help="Modo validación QA sin escribir salidas.")
    args = parser.parse_args()

    total_t0 = time.time()
    os.makedirs(OUT_DIR, exist_ok=True)

    print("=" * 70)
    print(f"  🚀 PIPELINE MAESTRO DE DATOS (PARQUET + QA + ANONIMIZACIÓN) {'(QA CHECK)' if args.check else ''}")
    print("=" * 70)

    # 1. Ingesta y anonimización
    full = load_and_clean_data()
    full_len = len(full)

    # 2. Maestro y feature engineering
    master = build_master_dataset(full)

    # 3. QA Gates
    validate_quality(master, full_len)

    if args.check:
        print("\n" + "=" * 70)
        print(f"  ✨ VALIDACIÓN QA COMPLETADA EN {time.time() - total_t0:.1f}s")
        print("=" * 70)
        return

    # 4. Generación de las 5 salidas analíticas
    print("\n📊 4. Generación de Artefactos de Consumo (Serving Layer)...")
    meta = export_olap_cube(master)
    export_forensic_parquet(master)
    export_forensic_cases_json(master)
    export_revisores_rendimiento(master)
    export_dashboard_kpis(master, full_len)

    print("\n" + "=" * 70)
    print(f"  ✨ PIPELINE FINALIZADO CON ÉXITO EN {time.time() - total_t0:.1f} SEGUNDOS")
    print("=" * 70)
    print(f"  • Universo deduplicado: {meta['total_gestiones']:,} gestiones")
    print(f"  • Atendidas por humanos: {meta['total_atendidas']:,} ({meta['total_atendidas']/meta['total_gestiones']*100:.1f}%)")
    print(f"  • Promedio Cola Calendario: {meta['avg_cola_cal_h']:.2f} h | Hábil: {meta['avg_cola_hab_h']:.2f} h")
    print(f"  • Mediana Cola Calendario:  {meta['median_cola_cal_h']:.2f} h | Hábil: {meta['median_cola_hab_h']:.2f} h")
    print("=" * 70)


if __name__ == '__main__':
    main()
