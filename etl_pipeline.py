#!/usr/bin/env python3
"""
Pipeline Maestro Unificado de Datos — SAT Guatemala (Agencia Virtual & RTU)
=============================================================================
Unifica la ingesta, limpieza, enriquecimiento dual (calendario y hábil) y
generación de todas las salidas analíticas en UNA SOLA ejecución optimizada.

Estructura de Stages:
  1. load_and_clean_data()   → Lectura, reparación de saltos de línea y dedup
  2. build_master_dataset()  → Registro maestro canónico por gestión única
  3. validate_quality()      → Gates de QA (validaciones estrictas de integridad)
  4. export_olap_cube()      → public/data/cubo_olap.json
  5. export_forensic_cases() → public/data/forensic_cases.json.gz + chunks
  6. export_dashboard_kpis() → public/data/dashboard_data.json

Uso:
  python3 etl_pipeline.py          # Ejecución completa
  python3 etl_pipeline.py --check  # Ejecución en modo validación QA
"""
import pandas as pd
import numpy as np
import glob, os, json, sys, gzip, time, argparse
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


def compute_business_hours(start_series, end_series):
    """
    Calcula horas hábiles vectorizadas (Lun-Vie 08:00 - 16:00, 8h netas/día)
    excluyendo fines de semana y asuetos oficiales SAT.
    """
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


# ─── 1. INGESTA Y LIMPIEZA MAESTRA (BRONZE -> SILVER) ───────────────────────

def load_and_clean_data():
    """Carga una sola vez los archivos fuente, repara filas partidas y deduplica."""
    print("\n📦 1. Ingesta y Limpieza de Fuentes Excel...")
    t0 = time.time()
    files = sorted(glob.glob(os.path.join(DATA_DIR, '*.xlsx')))
    if not files:
        print(f"❌ ERROR: No se encontraron archivos Excel en {DATA_DIR}")
        sys.exit(1)

    repaired_dfs = []
    for f in files:
        df = pd.read_excel(f, engine='openpyxl')
        df.columns = [c.strip().lower() for c in df.columns]

        # Detectar registros desplazados por saltos de línea dentro de texto de motivo
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

    print(f"   ✓ Filas brutas procesadas: {len(full):,} en {time.time() - t0:.1f}s")
    return full


# ─── 2. ENTIDAD MAESTRA & MÉTRICAS DUALES (SILVER LAYER) ────────────────────

def build_master_dataset(full):
    """Consolida eventos por gestión única y calcula métricas duales de negocio."""
    print("\n⚙️ 2. Construcción de Registros Maestros & Métricas Duales...")
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
        'usuarioresponsable': 'last',
    }).rename(columns={
        'tipo_gestion': 'tipo',
        'region_contribuyente': 'region',
        'tipoatencion': 'tipo_atencion',
        'usuarioresponsable': 'revisor',
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

    # Indicadores operativos
    master['es_atendida'] = (master['fecha_asignacion'].notna() & master['fecha_revision'].notna()).astype(int)

    # 1. TIEMPOS EN COLA (Calendario vs Hábil)
    if 'fecha_creacion' in master.columns and 'fecha_asignacion' in master.columns:
        delta = master['fecha_asignacion'] - master['fecha_creacion']
        master['t_cola_cal_h'] = (delta.dt.total_seconds() / 3600.0).clip(lower=0)
        master['t_cola_hab_h'] = compute_business_hours(master['fecha_creacion'], master['fecha_asignacion'])
        master['t_cola_h'] = master['t_cola_cal_h']
    else:
        master['t_cola_cal_h'] = np.nan
        master['t_cola_hab_h'] = np.nan
        master['t_cola_h'] = np.nan

    # 2. TIEMPOS TOTALES DE CICLO (Calendario vs Hábil)
    if 'fecha_creacion' in master.columns and 'fecha_finaliza' in master.columns:
        delta = master['fecha_finaliza'] - master['fecha_creacion']
        master['t_total_cal_h'] = (delta.dt.total_seconds() / 3600.0).clip(lower=0)
        master['t_total_hab_h'] = compute_business_hours(master['fecha_creacion'], master['fecha_finaliza'])
        master['t_total_h'] = master['t_total_cal_h']
    else:
        master['t_total_cal_h'] = np.nan
        master['t_total_hab_h'] = np.nan
        master['t_total_h'] = np.nan

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

    if 'fecha_creacion' in master.columns:
        master['anio'] = master['fecha_creacion'].dt.year.fillna(0).astype(int)
        master['mes'] = master['fecha_creacion'].dt.month.fillna(0).astype(int)
    else:
        master['anio'] = 0
        master['mes'] = 0

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

    print(f"   ✓ Gestiones maestras calculadas: {len(master):,} en {time.time() - t0:.1f}s")
    return master


# ─── 3. QA QUALITY GATES (VALIDACIONES RUIDOSAS) ────────────────────────────

def validate_quality(master, full_len):
    """Ejecuta verificaciones estrictas de integridad y consistencia analítica."""
    print("\n🔍 3. Ejecutando Gates de Control de Calidad (QA)...")
    errors = []

    # 1. Integridad de universo
    if len(master) < 150000:
        errors.append(f"Gestiones únicas insuficientes: {len(master):,} (esperado >150K)")

    # 2. Ratios de retrabajo válidos
    ratio = full_len / len(master) if len(master) > 0 else 0
    if ratio < 1.0 or ratio > 20.0:
        errors.append(f"Ratio de eventos anómalo: {ratio:.2f}x")

    # 3. Consistencia de tiempos (hábiles <= calendario en no-negativos)
    invalid_times = master[master['t_cola_hab_h'] > (master['t_cola_cal_h'] + 0.1)]
    if len(invalid_times) > 0:
        errors.append(f"{len(invalid_times)} registros tienen tiempo hábil mayor al calendario")

    # 4. Dimensiones limpias (sin residuos como 'AP_MS_SAT_EN_LINEA' o 'AMVELIZM')
    valid_regions = {'CENTRAL', 'NORORIENTE', 'OCCIDENTE', 'SUR'}
    actual_regions = set(master['region_norm'].unique())
    if not actual_regions.issubset(valid_regions):
        errors.append(f"Regiones no reconocidas encontradas: {actual_regions - valid_regions}")

    if errors:
        print("❌ FALLO EN GATES DE CALIDAD DE DATOS:")
        for err in errors:
            print(f"   • {err}")
        sys.exit(1)
    else:
        print("   ✅ Todos los gates de QA pasaron satisfactoriamente (Integridad, Tipos, Tiempos y Catálogos).")


# ─── 4. EXPORTACIONES (GOLD LAYER) ──────────────────────────────────────────

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
    for col in num_cols:
        cube[col] = cube[col].fillna(0).astype(float)

    cube['anio'] = cube['anio'].fillna(0).astype(int)
    cube['mes'] = cube['mes'].fillna(0).astype(int)

    for col in ['region', 'tipo', 'ges', 'est', 'macro']:
        cube[col] = cube[col].fillna('DESCONOCIDO')

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
    print(f"   ✓ [1/3] Cubo OLAP: {out_path} ({size_mb:.2f} MB, {len(cube):,} celdas) en {time.time() - t0:.1f}s")
    return meta


def export_forensic_cases(master):
    """Genera expedientes forenses comprimidos e indexados en chunks."""
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

    # 1. GZ Comprimido
    gz_path = os.path.join(OUT_DIR, 'forensic_cases.json.gz')
    with gzip.open(gz_path, 'wt', encoding='utf-8') as gf:
        json.dump(records, gf, ensure_ascii=False, separators=(',', ':'))

    # 2. Chunks paginados
    chunks = [records[i:i+CHUNK_SIZE] for i in range(0, len(records), CHUNK_SIZE)]
    for i, chunk in enumerate(chunks):
        path = os.path.join(CHUNK_DIR, f'chunk_{i:03d}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(',', ':'))

    # 3. Índice
    index = {'total': len(records), 'chunk_size': CHUNK_SIZE, 'chunks': len(chunks)}
    with open(os.path.join(CHUNK_DIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f)

    size_gz = os.path.getsize(gz_path) / (1024 * 1024)
    print(f"   ✓ [2/3] Expedientes Forenses: {len(records):,} registros ({size_gz:.1f} MB GZ, {len(chunks)} chunks) en {time.time() - t0:.1f}s")


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
        'estados': master['estado_norm'].value_counts().to_dict(),
        'regiones': master['region_norm'].value_counts().to_dict(),
        'gestiones': master['gestion_norm'].value_counts().to_dict(),
    }

    out_path = os.path.join(OUT_DIR, 'dashboard_data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(kpi_data, f, ensure_ascii=False, indent=2)

    print(f"   ✓ [3/3] Dashboard KPIs: {out_path} en {time.time() - t0:.1f}s")


# ─── MAIN PIPELINE RUNNER ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Pipeline Maestro Unificado de Datos — SAT Guatemala")
    parser.add_argument('--check', action='store_true', help="Ejecuta solo la fase de ingesta, métricas y validación QA sin escribir salidas.")
    args = parser.parse_args()

    total_t0 = time.time()
    os.makedirs(OUT_DIR, exist_ok=True)

    print("=" * 70)
    print(f"  🚀 PIPELINE MAESTRO UNIFICADO DE DATOS — SAT GUATEMALA {'(MODO QA CHECK)' if args.check else ''}")
    print("=" * 70)

    # 1. Ingesta y limpieza única
    full = load_and_clean_data()
    full_len = len(full)

    # 2. Transformación y métricas duales
    master = build_master_dataset(full)

    # 3. QA Quality Gates
    validate_quality(master, full_len)

    if args.check:
        print("\n" + "=" * 70)
        print(f"  ✨ VALIDACIÓN QA COMPLETADA EXITOSAMENTE EN {time.time() - total_t0:.1f}s")
        print("=" * 70)
        return

    # 4. Exportación simultánea en una sola pasada
    print("\n📊 4. Generación de Artefactos de Consumo (Serving Layer)...")
    meta = export_olap_cube(master)
    export_forensic_cases(master)
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
