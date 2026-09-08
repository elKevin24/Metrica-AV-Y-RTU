#!/usr/bin/env python3
"""
ETL Forense: Genera forensic_cases.json Y chunks paginados desde los Excel de AV.
Salida: 
  - public/data/forensic_cases.json (archivo completo)
  - public/data/forensic/index.json (índice de chunks)
  - public/data/forensic/chunk_NNN.json (chunks de 5000 registros)
"""
import pandas as pd
import numpy as np
import glob, os, json, sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'src', 'data')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'data')
CHUNK_DIR = os.path.join(OUT_DIR, 'forensic')
CHUNK_SIZE = 5000


def load_all_excels():
    files = sorted(glob.glob(os.path.join(DATA_DIR, '*.xlsx')))
    if not files:
        print("ERROR: No se encontraron archivos Excel en", DATA_DIR)
        sys.exit(1)

    frames = []
    for f in files:
        print(f"  Cargando: {os.path.basename(f)}")
        df = pd.read_excel(f, engine='openpyxl')
        df.columns = [c.strip().lower() for c in df.columns]
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
    print("\n  Construyendo expedientes individuales...")

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

    def clasificar_motivo(motivo):
        if pd.isna(motivo) or str(motivo).strip() == '':
            return 'SIN_MOTIVO'
        m = str(motivo).upper()
        if any(k in m for k in ['DPI', 'DOCUMENT', 'IDENTIF', 'PASAPORTE']): return 'DOCUMENTACION_DPI'
        elif any(k in m for k in ['VIDEO', 'CONFIRM', 'BIOMETR']): return 'VIDEO_CONFIRMACION'
        elif any(k in m for k in ['SISTEMA', 'MAC', 'BLOQU', 'REGLA', 'AUTOMAT']): return 'SISTEMA_REGLAS_DURAS'
        elif any(k in m for k in ['DATO', 'INCONSIST', 'DIRECC', 'CORREO', 'TELEFONO']): return 'DATOS_INCONSISTENTES'
        elif any(k in m for k in ['REPRESENT', 'LEGAL', 'PODER', 'MANDAT']): return 'REPRESENTACION_LEGAL'
        return 'OTROS'

    master['macro_rechazo'] = master['motivo_rechazo'].apply(clasificar_motivo) if 'motivo_rechazo' in master.columns else 'SIN_MOTIVO'
    master['estado_norm'] = master['estado'].str.upper().str.strip()
    master['region_norm'] = master['region'].str.upper().str.strip()
    master['gestion_norm'] = master['gestion'].str.upper().str.strip()

    # Solo atendidos
    master = master[master['es_atendida'] == 1].copy()
    print(f"  Expedientes atendidos: {len(master):,}")
    return master


def export_all(master):
    """Exporta JSON completo + chunks paginados."""
    print("\n  Exportando datos forenses...")
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(CHUNK_DIR, exist_ok=True)

    if master.index.name == 'numerogestion':
        master = master.reset_index()

    # Serializar a registros comprimidos
    records = []
    for _, row in master.iterrows():
        r = {'i': row.get('numerogestion', ''), 't': row.get('gestion', ''), 'r': row.get('region_norm', ''), 'e': row.get('estado_norm', '')}
        if row.get('macro_rechazo') and row['macro_rechazo'] != 'SIN_MOTIVO':
            r['m'] = row['macro_rechazo']
        for src, dst in [('fecha_creacion','fc'),('fecha_asignacion','fa'),('fecha_revision','fr'),('fecha_finaliza','ff'),('fecha_rechazo','frz')]:
            v = row.get(src)
            if pd.notna(v) and v is not None:
                r[dst] = str(v)[:19]
        if pd.notna(row.get('t_cola_h')): r['tc'] = round(float(row['t_cola_h']), 1)
        if pd.notna(row.get('t_total_h')): r['tt'] = round(float(row['t_total_h']), 1)
        if row.get('tiene_rechazo'): r['cr'] = 1
        if row.get('es_subsanada'): r['sb'] = 1
        if row.get('es_ftr'): r['ft'] = 1
        if row.get('n_eventos') and row['n_eventos'] > 1: r['ne'] = int(row['n_eventos'])
        records.append(r)

    # 1. Archivo completo
    full_path = os.path.join(OUT_DIR, 'forensic_cases.json')
    with open(full_path, 'w') as f:
        json.dump(records, f, ensure_ascii=False, separators=(',', ':'))
    size_mb = os.path.getsize(full_path) / (1024 * 1024)
    print(f"  ✅ Archivo completo: {full_path} ({size_mb:.1f} MB)")

    # 2. Chunks paginados
    chunks = [records[i:i+CHUNK_SIZE] for i in range(0, len(records), CHUNK_SIZE)]
    for i, chunk in enumerate(chunks):
        path = os.path.join(CHUNK_DIR, f'chunk_{i:03d}.json')
        with open(path, 'w') as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(',', ':'))

    # 3. Índice
    index = {'total': len(records), 'chunk_size': CHUNK_SIZE, 'chunks': len(chunks)}
    with open(os.path.join(CHUNK_DIR, 'index.json'), 'w') as f:
        json.dump(index, f)

    size_chunks = sum(os.path.getsize(os.path.join(CHUNK_DIR, f'chunk_{i:03d}.json')) for i in range(len(chunks)))
    print(f"  ✅ Chunks: {len(chunks)} archivos ({size_chunks/1024/1024:.1f} MB total, ~{size_chunks/len(chunks)/1024:.0f} KB c/u)")
    print(f"  ✅ Índice: {CHUNK_DIR}/index.json")


if __name__ == '__main__':
    print("=" * 60)
    print("  ETL FORENSE — Expedientes Individuales — SAT Guatemala")
    print("=" * 60)

    full = load_all_excels()
    master = build_forensic_cases(full)
    export_all(master)

    print("\n" + "=" * 60)
    print("  ✅ ETL Forense completado")
    print("=" * 60)
