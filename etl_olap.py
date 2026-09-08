#!/usr/bin/env python3
"""
ETL: Genera el cubo OLAP pre-agregado desde los Excel de AV.
Salida: public/data/cubo_olap.json

Estructura del cubo:
- Cada registro es una combinación única de dimensiones con sus medidas agregadas.
- Dimensiones: region, tipo (13/14), gestion (ACTIVACIÓN/CAMBIO CORREO), estado, anio, mes
- Medidas: total, atendidas, t_cola_sum_h, tiene_rechazo, motivo_rechazo_cat
"""
import pandas as pd
import numpy as np
import glob, os, json, re, sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'src', 'data')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'data')

# ─── 1. CARGA Y NORMALIZACIÓN ───────────────────────────────────────────────

def load_all_excels():
    """Carga todos los Excel, normaliza columnas y concatena."""
    files = sorted(glob.glob(os.path.join(DATA_DIR, '*.xlsx')))
    if not files:
        print("ERROR: No se encontraron archivos Excel en", DATA_DIR)
        sys.exit(1)

    frames = []
    for f in files:
        print(f"  Cargando: {os.path.basename(f)}")
        df = pd.read_excel(f, engine='openpyxl')
        # Normalizar nombres de columnas
        df.columns = [c.strip().lower() for c in df.columns]
        # Renombrar columnas duplicadas (usuarioresponsable.1, .2, .3)
        cols = []
        seen = {}
        for c in df.columns:
            if c in seen:
                seen[c] += 1
                cols.append(f"{c}_{seen[c]}")
            else:
                seen[c] = 0
                cols.append(c)
        df.columns = cols
        frames.append(df)

    full = pd.concat(frames, ignore_index=True)
    print(f"\n  Total filas brutas (concatenadas): {len(full):,}")

    # Drop exact duplicate rows
    full = full.drop_duplicates()
    print(f"  Total filas post-dedup: {len(full):,}")

    # Convertir fechas
    date_cols = [c for c in full.columns if 'fecha' in c]
    for d in date_cols:
        full[d] = pd.to_datetime(full[d], errors='coerce')

    return full


# ─── 2. CONSTRUCCIÓN DEL REGISTRO MAESTRO POR GESTIÓN ────────────────────────

def build_master(full):
    """
    Agrupa por numerogestion y construye un registro maestro por gestión.
    Cada gestión tiene: dimensiones + medidas calculadas.
    """
    print("\n  Construyendo registros maestros por gestión...")

    # Columnas de fecha
    fc = 'fechacreacion' if 'fechacreacion' in full.columns else None
    fa = 'fechaasignacion' if 'fechaasignacion' in full.columns else None
    fr = 'fecharevision' if 'fecharevision' in full.columns else None
    ff = 'fechafinaliza' if 'fechafinaliza' in full.columns else None
    frc = 'fecharechazo' if 'fecharechazo' in full.columns else None

    group = full.groupby('numerogestion')

    # Dimensiones (tomar el primer valor de cada grupo)
    master = group.agg({
        'tipo_gestion': 'first',
        'gestion': 'first',
        'region_contribuyente': 'first',
        'tipoatencion': 'first',
    }).rename(columns={
        'tipo_gestion': 'tipo',
        'region_contribuyente': 'region',
        'tipoatencion': 'tipo_atencion',
    })

    # Estado final: último estado del grupo (basado en la última fecha)
    if fc:
        sorted_df = full.sort_values(by=fc)
        master['estado'] = sorted_df.groupby('numerogestion')['estadoactual'].last()
    else:
        master['estado'] = group['estadoactual'].last()

    # nombrebitacora - para clasificación de estados intermedios
    master['bitacora_estados'] = group['nombrebitacora'].apply(lambda x: list(x.dropna().unique()))

    # Fechas clave
    if fc:
        master['fecha_creacion'] = group[fc].min()
    if fa:
        master['fecha_asignacion'] = group[fa].min()
    if fr:
        master['fecha_revision'] = group[fr].min()
    if ff:
        master['fecha_finaliza'] = group[ff].min()
    if frc:
        master['fecha_rechazo'] = group[frc].min()

    # Motivo de rechazo
    if 'motivorechazo' in full.columns:
        master['motivo_rechazo'] = group['motivorechazo'].first()

    # Cantidad de eventos (filas) por gestión
    master['n_eventos'] = group.size()

    print(f"  Gestiones únicas (maestro): {len(master):,}")
    return master


# ─── 3. CÁLCULO DE MEDIDAS DERIVADAS ────────────────────────────────────────

def compute_measures(master):
    """Calcula medidas derivadas para cada gestión."""
    print("  Calculando medidas derivadas...")

    # Atendida por humano: tiene fecha_asignacion Y fecha_revision
    master['es_atendida'] = (
        master['fecha_asignacion'].notna() & master['fecha_revision'].notna()
    ).astype(int)

    # Tiempo en cola (horas): creación → asignación
    if 'fecha_creacion' in master.columns and 'fecha_asignacion' in master.columns:
        delta = master['fecha_asignacion'] - master['fecha_creacion']
        master['t_cola_h'] = delta.dt.total_seconds() / 3600
        master['t_cola_h'] = master['t_cola_h'].clip(lower=0)  # No negativos
    else:
        master['t_cola_h'] = np.nan

    # Tiempo total (horas): creación → finalización
    if 'fecha_creacion' in master.columns and 'fecha_finaliza' in master.columns:
        delta = master['fecha_finaliza'] - master['fecha_creacion']
        master['t_total_h'] = delta.dt.total_seconds() / 3600
        master['t_total_h'] = master['t_total_h'].clip(lower=0)
    else:
        master['t_total_h'] = np.nan

    # Tiene rechazo
    master['tiene_rechazo'] = master['fecha_rechazo'].notna().astype(int) if 'fecha_rechazo' in master.columns else 0

    # Aprobada tras rechazo (subsanada)
    master['es_subsanada'] = (
        (master['estado'].str.upper() == 'APROBADA') & (master['tiene_rechazo'] == 1)
    ).astype(int)

    # Aprobada limpia (FTR - First Time Resolution)
    master['es_ftr'] = (
        (master['estado'].str.upper() == 'APROBADA') & (master['tiene_rechazo'] == 0)
    ).astype(int)

    # Año y mes de creación
    if 'fecha_creacion' in master.columns:
        master['anio'] = master['fecha_creacion'].dt.year.fillna(0).astype(int)
        master['mes'] = master['fecha_creacion'].dt.month.fillna(0).astype(int)
    else:
        master['anio'] = 0
        master['mes'] = 0

    # Clasificación de motivo de rechazo en macro-familias
    def clasificar_motivo(motivo):
        if pd.isna(motivo) or str(motivo).strip() == '':
            return 'SIN_MOTIVO'
        motivo_upper = str(motivo).upper()
        if any(k in motivo_upper for k in ['DPI', 'DOCUMENT', 'IDENTIF', 'PASAPORTE']):
            return 'DOCUMENTACION_DPI'
        elif any(k in motivo_upper for k in ['VIDEO', 'CONFIRM', 'BIOMETR']):
            return 'VIDEO_CONFIRMACION'
        elif any(k in motivo_upper for k in ['SISTEMA', 'MAC', 'BLOQU', 'REGLA', 'AUTOMAT']):
            return 'SISTEMA_REGLAS_DURAS'
        elif any(k in motivo_upper for k in ['DATO', 'INCONSIST', 'DIRECC', 'CORREO', 'TELEFONO']):
            return 'DATOS_INCONSISTENTES'
        elif any(k in motivo_upper for k in ['REPRESENT', 'LEGAL', 'PODER', 'MANDAT']):
            return 'REPRESENTACION_LEGAL'
        else:
            return 'OTROS'

    if 'motivo_rechazo' in master.columns:
        master['macro_rechazo'] = master['motivo_rechazo'].apply(clasificar_motivo)
    else:
        master['macro_rechazo'] = 'SIN_MOTIVO'

    # Normalizar estado
    master['estado_norm'] = master['estado'].str.upper().str.strip()

    # Normalizar región
    master['region_norm'] = master['region'].str.upper().str.strip()

    # Normalizar gestión
    master['gestion_norm'] = master['gestion'].str.upper().str.strip()

    # Normalizar tipo
    master['tipo_norm'] = master['tipo'].astype(str).str.strip()

    return master


# ─── 4. AGREGACIÓN DEL CUBO ─────────────────────────────────────────────────

def build_cube(master):
    """
    Agrega el maestro en un cubo OLAP: una fila por combinación de dimensiones.
    """
    print("  Construyendo cubo OLAP...")

    dims = ['region_norm', 'tipo_norm', 'gestion_norm', 'estado_norm', 'anio', 'mes', 'macro_rechazo']

    cube = master.groupby(dims, dropna=False).agg(
        total=('es_atendida', 'count'),
        atendidas=('es_atendida', 'sum'),
        aprobadas=('es_ftr', 'sum'),         # FTR (aprobadas limpias)
        subsanadas=('es_subsanada', 'sum'),  # Aprobadas tras rechazo
        con_rechazo=('tiene_rechazo', 'sum'),
        t_cola_sum=('t_cola_h', 'sum'),
        t_cola_count=('t_cola_h', 'count'),
        t_total_sum=('t_total_h', 'sum'),
        t_total_count=('t_total_h', 'count'),
        n_eventos_sum=('n_eventos', 'sum'),
    ).reset_index()

    # Renombrar dimensiones para el JSON
    cube = cube.rename(columns={
        'region_norm': 'region',
        'tipo_norm': 'tipo',
        'gestion_norm': 'ges',
        'estado_norm': 'est',
        'macro_rechazo': 'macro',
    })

    # Convertir NaN a 0 en medidas numéricas
    for col in ['total', 'atendidas', 'aprobadas', 'subsanadas', 'con_rechazo',
                't_cola_sum', 't_cola_count', 't_total_sum', 't_total_count', 'n_eventos_sum']:
        cube[col] = cube[col].fillna(0).astype(float)

    # Convertir anio y mes a int
    cube['anio'] = cube['anio'].fillna(0).astype(int)
    cube['mes'] = cube['mes'].fillna(0).astype(int)

    # Reemplazar NaN en dimensiones string
    for col in ['region', 'tipo', 'ges', 'est', 'macro']:
        cube[col] = cube[col].fillna('DESCONOCIDO')

    print(f"  Celdas del cubo: {len(cube):,}")
    return cube


# ─── 5. GENERACIÓN DEL JSON DE SALIDA ───────────────────────────────────────

def export_json(cube, master):
    """Exporta el cubo y metadatos como JSON."""
    os.makedirs(OUT_DIR, exist_ok=True)

    # Metadatos
    meta = {
        'generated_at': datetime.now().isoformat(),
        'total_gestiones': int(len(master)),
        'total_atendidas': int(master['es_atendida'].sum()),
        'total_aprobadas': int((master['estado_norm'] == 'APROBADA').sum()),
        'total_rechazos': int(master['con_rechazo'].sum()) if 'con_rechazo' in master.columns else int(master['tiene_rechazo'].sum()),
        'total_ftr': int(master['es_ftr'].sum()),
        'total_subsanadas': int(master['es_subsanada'].sum()),
        'avg_cola_h': round(float(master['t_cola_h'].mean(skipna=True)), 2),
        'median_cola_h': round(float(master['t_cola_h'].median(skipna=True)), 2),
        'dimensions': {
            'regiones': sorted(master['region_norm'].dropna().unique().tolist()),
            'tipos': sorted(master['tipo_norm'].dropna().unique().tolist()),
            'gestiones': sorted(master['gestion_norm'].dropna().unique().tolist()),
            'estados': sorted(master['estado_norm'].dropna().unique().tolist()),
            'anios': sorted([int(x) for x in master['anio'].dropna().unique() if x > 0]),
            'macros': sorted(master['macro_rechazo'].dropna().unique().tolist()),
        }
    }

    # Cubo como lista de dicts
    cube_records = cube.to_dict(orient='records')

    output = {
        'meta': meta,
        'cubo': cube_records,
    }

    out_path = os.path.join(OUT_DIR, 'cubo_olap.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"\n  ✅ Cubo exportado: {out_path}")
    print(f"     Tamaño: {size_mb:.2f} MB")
    print(f"     Celdas: {len(cube_records):,}")
    print(f"     Dimensiones: {list(meta['dimensions'].keys())}")

    return output


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("=" * 60)
    print("  ETL OLAP — Cubo de Gestiones AV — SAT Guatemala")
    print("=" * 60)

    full = load_all_excels()
    master = build_master(full)
    master = compute_measures(master)
    cube = build_cube(master)
    output = export_json(cube, master)

    print("\n" + "=" * 60)
    print("  RESUMEN FINAL")
    print("=" * 60)
    meta = output['meta']
    print(f"  Gestiones únicas:    {meta['total_gestiones']:,}")
    print(f"  Atendidas (humano):  {meta['total_atendidas']:,}")
    print(f"  Aprobadas:           {meta['total_aprobadas']:,}")
    print(f"  Rechazos:            {meta['total_rechazos']:,}")
    print(f"  FTR (1ra vez):       {meta['total_ftr']:,}")
    print(f"  Subsanadas:          {meta['total_subsanadas']:,}")
    print(f"  Promedio cola:       {meta['avg_cola_h']:.2f} h")
    print(f"  Mediana cola:        {meta['median_cola_h']:.2f} h")
    print(f"  Regiones:            {meta['dimensions']['regiones']}")
    print(f"  Tipos gestión:       {meta['dimensions']['tipos']}")
    print(f"  Gestiones:           {meta['dimensions']['gestiones']}")
    print(f"  Estados:             {meta['dimensions']['estados']}")
    print(f"  Años:                {meta['dimensions']['anios']}")
    print("=" * 60)
