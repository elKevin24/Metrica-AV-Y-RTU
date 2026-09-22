#!/usr/bin/env python3
"""
generate_revisores_detalle.py
Genera los archivos JSON de detalle individual por revisor en public/data/revisores_detalle/
"""

import os
import json
import glob
from collections import defaultdict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'public', 'data', 'revisores_detalle')
FORENSIC_DIR = os.path.join(BASE_DIR, 'public', 'data', 'forensic')
RENDIMIENTO_FILE = os.path.join(BASE_DIR, 'public', 'data', 'revisores_rendimiento.json')

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    if not os.path.exists(RENDIMIENTO_FILE):
        print(f"  [generate_revisores_detalle] Error: {RENDIMIENTO_FILE} no existe.")
        return

    with open(RENDIMIENTO_FILE, 'r', encoding='utf-8') as f:
        summary_data = json.load(f)
    summary_map = {r['revisor']: r for r in summary_data.get('revisores', [])}

    chunks = sorted(glob.glob(os.path.join(FORENSIC_DIR, 'chunk_*.json')))
    if not chunks:
        print("  [generate_revisores_detalle] No se encontraron chunks forenses.")
        return

    revisores_cases = defaultdict(list)

    for ch_path in chunks:
        with open(ch_path, 'r', encoding='utf-8') as f:
            cases = json.load(f)
            for c in cases:
                rev = c.get('u')
                if rev and rev in summary_map:
                    fa = c.get('fa')
                    fr = c.get('fr')
                    t_rev_min = None
                    t_rev_sec = None
                    if fa and fr:
                        try:
                            d_fa = datetime.strptime(fa, '%Y-%m-%d %H:%M:%S')
                            d_fr = datetime.strptime(fr, '%Y-%m-%d %H:%M:%S')
                            diff = (d_fr - d_fa).total_seconds()
                            if diff >= 0:
                                t_rev_sec = int(diff)
                                t_rev_min = round(diff / 60.0, 2)
                        except:
                            pass
                    
                    revisores_cases[rev].append({
                        'i': c.get('i'),
                        't': c.get('t', 'ACTIVACIÓN'),
                        'r': c.get('r', 'CENTRAL'),
                        'e': c.get('e', 'APROBADA'),
                        'fc': c.get('fc'),
                        'fa': fa,
                        'fr': fr,
                        'ff': c.get('ff'),
                        'th': c.get('th', 0.0),
                        'tc': c.get('tc', 0.0),
                        't_sec': t_rev_sec,
                        't_min': t_rev_min,
                        'cr': c.get('cr', 0),
                        'sb': c.get('sb', 0),
                        'ft': 1 if (c.get('cr', 0) == 0 and c.get('e') == 'APROBADA') else 0,
                        'bv': c.get('bv', 'ESTANDAR (2m-10m)')
                    })

    for rev_id, meta in summary_map.items():
        cases = revisores_cases.get(rev_id, [])
        cases.sort(key=lambda x: x.get('fr') or x.get('fa') or x.get('fc') or '', reverse=True)
        
        meses_count = defaultdict(int)
        tipos_count = defaultdict(int)
        for c in cases:
            fr_str = c.get('fr') or c.get('fa') or c.get('fc')
            if fr_str:
                mes_key = fr_str[:7]
                meses_count[mes_key] += 1
            t_key = c.get('t', 'OTRO')
            tipos_count[t_key] += 1
            
        payload = {
            'revisor': rev_id,
            'meta': meta,
            'total_casos': len(cases),
            'por_mes': dict(sorted(meses_count.items())),
            'por_tipo': dict(tipos_count),
            'casos': cases
        }
        
        out_path = os.path.join(OUTPUT_DIR, f'{rev_id}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))

    print(f"  ✓ [generate_revisores_detalle] Generados {len(summary_map)} expedientes individuales en {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
