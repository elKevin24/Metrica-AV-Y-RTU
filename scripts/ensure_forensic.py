#!/usr/bin/env python3
"""
Garantiza que existan los chunks forenses en public/data/forensic/
descomprimiendo y fragmentando public/data/forensic_cases.json.gz si es necesario.
"""
import os, sys, gzip, json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GZ_PATH = os.path.join(BASE_DIR, 'public', 'data', 'forensic_cases.json.gz')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'data', 'forensic')
INDEX_PATH = os.path.join(OUT_DIR, 'index.json')
CHUNK_SIZE = 5000

def ensure_chunks():
    if os.path.exists(INDEX_PATH) and os.path.exists(os.path.join(OUT_DIR, 'chunk_000.json')):
        print("  [ensure_forensic] Chunks forenses ya existen en", OUT_DIR)
        return

    if not os.path.exists(GZ_PATH):
        print("  [ensure_forensic] No se encontró", GZ_PATH)
        return

    print("  [ensure_forensic] Generando chunks forenses desde", GZ_PATH)
    os.makedirs(OUT_DIR, exist_ok=True)

    try:
        with gzip.open(GZ_PATH, 'rt', encoding='utf-8') as f:
            records = json.load(f)

        chunks = [records[i:i+CHUNK_SIZE] for i in range(0, len(records), CHUNK_SIZE)]

        for i, chunk in enumerate(chunks):
            chunk_file = os.path.join(OUT_DIR, f'chunk_{i:03d}.json')
            with open(chunk_file, 'w', encoding='utf-8') as cf:
                json.dump(chunk, cf, ensure_ascii=False, separators=(',', ':'))

        index = {'total': len(records), 'chunk_size': CHUNK_SIZE, 'chunks': len(chunks)}
        with open(INDEX_PATH, 'w', encoding='utf-8') as idxf:
            json.dump(index, idxf)

        print(f"  [ensure_forensic] Completado: {len(chunks)} chunks e index.json creados.")
    except Exception as e:
        print("  [ensure_forensic] Error generando chunks:", e)

    # Asegurar detalle por revisor
    det_dir = os.path.join(BASE_DIR, 'public', 'data', 'revisores_detalle')
    if not os.path.exists(det_dir) or len(os.listdir(det_dir)) < 100:
        try:
            import subprocess
            subprocess.run([sys.executable, os.path.join(BASE_DIR, 'scripts', 'generate_revisores_detalle.py')], check=True)
        except Exception as e:
            print("  [ensure_forensic] Error generando revisores_detalle:", e)

    # Asegurar datos diarios de 30 días para SLA 8h
    sla_path = os.path.join(BASE_DIR, 'public', 'data', 'sla_30_dias.json')
    if not os.path.exists(sla_path):
        try:
            import subprocess
            subprocess.run([sys.executable, os.path.join(BASE_DIR, 'scripts', 'calc_30d_sla.py')], check=True)
            print("  [ensure_forensic] sla_30_dias.json generado con éxito.")
        except Exception as e:
            print("  [ensure_forensic] Error generando sla_30_dias.json:", e)

    # Asegurar datos diarios por revisor
    diario_path = os.path.join(BASE_DIR, 'public', 'data', 'revisores_diario.json')
    if not os.path.exists(diario_path):
        try:
            import subprocess
            subprocess.run([sys.executable, os.path.join(BASE_DIR, 'scripts', 'generate_revisores_diario.py')], check=True)
        except Exception as e:
            print("  [ensure_forensic] Error generando revisores_diario.json:", e)

if __name__ == '__main__':
    ensure_chunks()
