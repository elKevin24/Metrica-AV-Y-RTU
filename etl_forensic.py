#!/usr/bin/env python3
"""
ETL Forense: Genera forensic_cases.json desde los Excel de AV.
Salida: public/data/forensic_cases.json

Genera un archivo JSON con expedientes individuales para la vista
Master-Detail del ForensicView en el dashboard SAT Guatemala.
"""
import pandas as pd
import numpy as np
import glob, os, json, sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'src', 'data')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'data')


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
        df.columns = [c.strip().lower() for c in df.columns]
        # Renombrar columnas duplicadas
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
    print(f"\n  Total filas brutas: {len(full):,}")
    full = full.drop_duplicates()
    print(f"  Post-dedup: {len(full):,}")

    date_cols = [c for c in full.columns if 'fecha' in c]
    for d in date_cols:
        full[d] = pd.to_datetime(full[d], errors='coerce')

    return full


def build_forensic_cases(full):
    """Construye registros individuales de expedientes para la vista forense."""
    print("\n  Construyendo expedientes individuales...")

    fc = 'fechacreacion' if 'fechacreacion' in full.columns else None
    fa = 'fechaasignacion' if 'fechaasignacion' in full.columns else None
    fr = 'fecharevision' if 'fecharevision' in full.columns else None
    ff = 'fechafinaliza' if 'fechafinaliza' in full.columns else None
    frc = 'fecharechazo' if 'fecharechazo' in full.columns else None

    group = full.groupby('numerogestion')

    # Dimensiones
    master = group.agg({
        'gestion': 'first',
        'region_contribuyente': 'first',
    }).rename(columns={
        'region_contribuyente': 'region',
    })

    # Estado final
    if fc:
        sorted_df = full.sort_values(by=fc)
        master['estado'] = sorted_df.groupby('numerogestion')['estadoactual'].last()
    else:
        master['estado'] = group['estadoactual'].last()

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

    master['n_eventos'] = group.size()

    # Medidas derivadas
    master['es_atendida'] = (
        master['fecha_asignacion'].notna() & master['fecha_revision'].notna()
    ).astype(int)

    if 'fecha_creacion' in master.columns and 'fecha_asignacion' in master.columns:
        delta = master['fecha_asignacion'] - master['fecha_creacion']
        master['t_cola_h'] = (delta.dt.total_seconds() / 3600).clip(lower=0)
    else:
        master['t_cola_h'] = np.nan

    if 'fecha_creacion' in master.columns and 'fecha_finaliza' in master.columns:
        delta = master['fecha_finaliza'] - master['fecha_creacion']
        master['t_total_h'] = (delta.dt.total_seconds() / 3600).clip(lower=0)
    else:
        master['t_total_h'] = np.nan

    master['tiene_rechazo'] = master['fecha_rechazo'].notna().astype(int) if 'fecha_rechazo' in master.columns else 0
    master['es_subsanada'] = ((master['estado'].str.upper() == 'APROBADA') & (master['tiene_rechazo'] == 1)).astype(int)
    master['es_ftr'] = ((master['estado'].str.upper() == 'APROBADA') & (master['tiene_rechazo'] == 0)).astype(int)

    # Clasificar motivo de rechazo
    def clasificar_motivo(motivo):
        if pd.isna(motivo) or str(motivo).strip() == '':
            return 'SIN_MOTIVO'
        m = str(motivo).upper()
        if any(k in m for k in ['DPI', 'DOCUMENT', 'IDENTIF', 'PASAPORTE']):
            return 'DOCUMENTACION_DPI'
        elif any(k in m for k in ['VIDEO', 'CONFIRM', 'BIOMETR']):
            return 'VIDEO_CONFIRMACION'
        elif any(k in m for k in ['SISTEMA', 'MAC', 'BLOQU', 'REGLA', 'AUTOMAT']):
            return 'SISTEMA_REGLAS_DURAS'
        elif any(k in m for k in ['DATO', 'INCONSIST', 'DIRECC', 'CORREO', 'TELEFONO']):
            return 'DATOS_INCONSISTENTES'
        elif any(k in m for k in ['REPRESENT', 'LEGAL', 'PODER', 'MANDAT']):
            return 'REPRESENTACION_LEGAL'
        return 'OTROS'

    if 'motivo_rechazo' in master.columns:
        master['macro_rechazo'] = master['motivo_rechazo'].apply(clasificar_motivo)
    else:
        master['macro_rechazo'] = 'SIN_MOTIVO'

    # Normalizar
    master['estado_norm'] = master['estado'].str.upper().str.strip()
    master['region_norm'] = master['region'].str.upper().str.strip()
    master['gestion_norm'] = master['gestion'].str.upper().str.strip()

    print(f"  Expedientes únicos: {len(master):,}")
    return master


def export(master):
    """Exporta expedientes individuales a JSON."""
    print("\n  Exportando forensic_cases.json...")
    os.makedirs(OUT_DIR, exist_ok=True)

    if master.index.name == 'numerogestion':
        master = master.reset_index()

    # Seleccionar columnas relevantes
    export_cols = []
    col_map = {}

    if 'numerogestion' in master.columns:
        export_cols.append('numerogestion')

    for src, dst in [('gestion', 'tramite'), ('region_norm', 'region'),
                      ('estado_norm', 'estado'), ('motivo_rechazo', 'motivo'),
                      ('macro_rechazo', 'macro')]:
        if src in master.columns:
            export_cols.append(src)
            col_map[src] = dst

    for ts in ['fecha_creacion', 'fecha_asignacion', 'fecha_revision', 'fecha_finaliza', 'fecha_rechazo']:
        if ts in master.columns:
            export_cols.append(ts)

    for m in ['t_cola_h', 't_total_h', 'es_atendida', 'tiene_rechazo', 'es_subsanada', 'es_ftr', 'n_eventos']:
        if m in master.columns:
            export_cols.append(m)

    subset = master[export_cols].copy()
    subset = subset.rename(columns=col_map)

    # Serializar fechas
    for c in subset.columns:
        if subset[c].dtype == 'datetime64[ns]':
            subset[c] = subset[c].dt.strftime('%Y-%m-%dT%H:%M:%S')
            subset[c] = subset[c].where(subset[c].notna(), None)

    subset = subset.where(subset.notna(), None)

    records = subset.to_dict(orient='records')
    out_path = os.path.join(OUT_DIR, 'forensic_cases.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, default=str)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"  ✅ Expedientes exportados: {out_path}")
    print(f"     Registros: {len(records):,}")
    print(f"     Tamaño: {size_mb:.2f} MB")

    # Estadísticas resumen
    regiones = subset['region'].value_counts().to_dict() if 'region' in subset.columns else {}
    estados = subset['estado'].value_counts().to_dict() if 'estado' in subset.columns else {}
    print(f"\n  Por región: {regiones}")
    print(f"  Por estado: {estados}")

    return records


if __name__ == '__main__':
    print("=" * 60)
    print("  ETL FORENSE — Expedientes Individuales — SAT Guatemala")
    print("=" * 60)

    full = load_all_excels()
    master = build_forensic_cases(full)
    export(master)

    print("\n" + "=" * 60)
    print("  ✅ ETL Forense completado")
    print("=" * 60)
