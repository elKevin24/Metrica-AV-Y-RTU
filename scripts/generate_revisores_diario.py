#!/usr/bin/env python3
"""
generate_revisores_diario.py
Genera public/data/revisores_diario.json con series temporales diarias
para los 161 revisores, puntos de atención, gerencias regionales y el consolidado nacional.
"""
import os
import json
import glob
import hashlib
from collections import defaultdict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(BASE_DIR, 'public', 'data', 'revisores_diario.json')
DETALLE_DIR = os.path.join(BASE_DIR, 'public', 'data', 'revisores_detalle')
RENDIMIENTO_FILE = os.path.join(BASE_DIR, 'public', 'data', 'revisores_rendimiento.json')

DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

PUNTOS_POR_REGIONAL = {
    'CENTRAL': [
        'Sede Central (Edificio Dubai)',
        'Agencia Montserrat',
        'Agencia Galerías Primma',
        'Agencia San Rafael',
        'Agencia Carretera a El Salvador',
        'Agencia Chimaltenango',
        'Agencia Sacatepéquez (Antigua)',
        'Agencia El Progreso (Guastatoya)',
    ],
    'OCCIDENTE': [
        'Agencia Quetzaltenango (Sede Occidente)',
        'Agencia Huehuetenango',
        'Agencia San Marcos',
        'Agencia Totonicapán',
        'Agencia Sololá',
        'Agencia Quiché',
    ],
    'SUR': [
        'Agencia Escuintla (Sede Sur)',
        'Agencia Santa Rosa (Cuilapa)',
        'Agencia Suchitepéquez (Mazatenango)',
        'Agencia Retalhuleu',
        'Agencia Puerto Quetzal',
    ],
    'NORORIENTE': [
        'Agencia Zacapa (Sede Nororiente)',
        'Agencia Chiquimula',
        'Agencia Izabal (Puerto Barrios)',
        'Agencia Alta Verapaz (Cobán)',
        'Agencia Baja Verapaz (Salamá)',
        'Agencia Petén (Santa Elena)',
        'Agencia Jalapa',
        'Agencia Jutiapa',
    ],
}

def get_punto_for_revisor(code, regional):
    puntos = PUNTOS_POR_REGIONAL.get(regional, PUNTOS_POR_REGIONAL['CENTRAL'])
    # Deterministic assignment using hash of revisor code
    h = int(hashlib.md5(code.encode('utf-8')).hexdigest(), 16)
    return puntos[h % len(puntos)]

def build_daily_entry(d, is_grouped=False, revisores_set=None):
    at = d['atendidas']
    tasa_rech = round((d['rechazadas'] / at) * 100.0, 1) if at > 0 else 0.0
    tasa_aprob = round((d['aprobadas'] / at) * 100.0, 1) if at > 0 else 0.0
    t_prom_sec = round(d['tiempo_total_sec'] / at) if at > 0 else 0
    t_prom_min = round(t_prom_sec / 60.0, 1)

    item = {
        'fecha': d['fecha'],
        'diaSemana': d['diaSemana'],
        'atendidas': at,
        'aprobadas': d['aprobadas'],
        'rechazadas': d['rechazadas'],
        'rechazos': d['rechazadas'],
        'tasaRechazo': tasa_rech,
        'tasaAprobacion': tasa_aprob,
        'tiempoPromSec': t_prom_sec,
        'tiempoPromMin': t_prom_min,
        'metaAlcanzada': at >= 100,
        'pctMeta': round((at / 100.0) * 100.0, 1),
        'tramites': d['tramites']
    }
    if is_grouped and revisores_set:
        rev_count = len(revisores_set)
        item['revisoresActivos'] = rev_count
        item['promPorRevisor'] = round(at / rev_count, 1) if rev_count > 0 else 0.0
    return item

def main():
    if not os.path.exists(RENDIMIENTO_FILE):
        print(f"  [generate_revisores_diario] Error: {RENDIMIENTO_FILE} no existe.")
        return

    with open(RENDIMIENTO_FILE, 'r', encoding='utf-8') as f:
        summary_data = json.load(f)
    revisores_meta = {r['revisor']: r for r in summary_data.get('revisores', [])}

    files = sorted(glob.glob(os.path.join(DETALLE_DIR, '*.json')))
    if not files:
        print("  [generate_revisores_diario] No se encontraron archivos en revisores_detalle.")
        return

    revisores_daily = {}
    
    # Aggregators
    national_daily = defaultdict(lambda: {
        'fecha': '', 'diaSemana': '', 'atendidas': 0, 'aprobadas': 0, 'rechazadas': 0,
        'revisores_set': set(), 'tiempo_total_sec': 0, 'tramites': {'correo': 0, 'activacion': 0}
    })
    
    regional_daily = defaultdict(lambda: defaultdict(lambda: {
        'fecha': '', 'diaSemana': '', 'atendidas': 0, 'aprobadas': 0, 'rechazadas': 0,
        'revisores_set': set(), 'tiempo_total_sec': 0, 'tramites': {'correo': 0, 'activacion': 0}
    }))
    
    punto_daily = defaultdict(lambda: defaultdict(lambda: {
        'fecha': '', 'diaSemana': '', 'atendidas': 0, 'aprobadas': 0, 'rechazadas': 0,
        'revisores_set': set(), 'tiempo_total_sec': 0, 'tramites': {'correo': 0, 'activacion': 0}
    }))

    for fpath in files:
        code = os.path.splitext(os.path.basename(fpath))[0]
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        meta = revisores_meta.get(code, data.get('meta', {'revisor': code}))
        reg = meta.get('regional', 'CENTRAL')
        punto = get_punto_for_revisor(code, reg)
        meta['punto_atencion'] = punto

        days_map = defaultdict(lambda: {
            'fecha': '', 'diaSemana': '', 'atendidas': 0, 'aprobadas': 0, 'rechazadas': 0,
            'directas': 0, 'subsanadas': 0, 'tiempo_total_sec': 0, 'tramites': {'correo': 0, 'activacion': 0}
        })

        for c in data.get('casos', []):
            raw_date = c.get('fa') or c.get('fr') or c.get('fc') or ''
            if len(raw_date) < 10:
                continue
            fecha = raw_date[:10]
            try:
                dt = datetime.strptime(fecha, '%Y-%m-%d')
                dia_sem = DAY_NAMES[dt.weekday()]
            except:
                dia_sem = 'N/A'

            d = days_map[fecha]
            d['fecha'] = fecha
            d['diaSemana'] = dia_sem
            d['atendidas'] += 1

            st = (c.get('e') or '').upper()
            is_aprob = ('APROB' in st or 'FINAL' in st or 'COMPL' in st)
            if is_aprob:
                d['aprobadas'] += 1
            else:
                d['rechazadas'] += 1

            if c.get('ft') == 1:
                d['directas'] += 1
            if c.get('sb') == 1:
                d['subsanadas'] += 1
            if c.get('t_sec'):
                d['tiempo_total_sec'] += c['t_sec']

            t = (c.get('t') or '').upper()
            is_correo = 'CORREO' in t
            if is_correo:
                d['tramites']['correo'] += 1
            else:
                d['tramites']['activacion'] += 1

            # 1. Nacional
            nd = national_daily[fecha]
            nd['fecha'] = fecha
            nd['diaSemana'] = dia_sem
            nd['atendidas'] += 1
            if is_aprob: nd['aprobadas'] += 1
            else: nd['rechazadas'] += 1
            nd['revisores_set'].add(code)
            if c.get('t_sec'): nd['tiempo_total_sec'] += c['t_sec']
            if is_correo: nd['tramites']['correo'] += 1
            else: nd['tramites']['activacion'] += 1

            # 2. Regional
            rd = regional_daily[reg][fecha]
            rd['fecha'] = fecha
            rd['diaSemana'] = dia_sem
            rd['atendidas'] += 1
            if is_aprob: rd['aprobadas'] += 1
            else: rd['rechazadas'] += 1
            rd['revisores_set'].add(code)
            if c.get('t_sec'): rd['tiempo_total_sec'] += c['t_sec']
            if is_correo: rd['tramites']['correo'] += 1
            else: rd['tramites']['activacion'] += 1

            # 3. Punto de Atención
            pd = punto_daily[punto][fecha]
            pd['fecha'] = fecha
            pd['diaSemana'] = dia_sem
            pd['atendidas'] += 1
            if is_aprob: pd['aprobadas'] += 1
            else: pd['rechazadas'] += 1
            pd['revisores_set'].add(code)
            if c.get('t_sec'): pd['tiempo_total_sec'] += c['t_sec']
            if is_correo: pd['tramites']['correo'] += 1
            else: pd['tramites']['activacion'] += 1

        daily_list = [build_daily_entry(days_map[f]) for f in sorted(days_map.keys())]
        revisores_daily[code] = {
            'meta': meta,
            'serie_diaria': daily_list
        }

    # Build national list
    national_list = [
        build_daily_entry(national_daily[f], is_grouped=True, revisores_set=national_daily[f]['revisores_set'])
        for f in sorted(national_daily.keys())
    ]

    # Build regional dict
    regionales_dict = {}
    for reg, dmap in regional_daily.items():
        regionales_dict[reg] = [
            build_daily_entry(dmap[f], is_grouped=True, revisores_set=dmap[f]['revisores_set'])
            for f in sorted(dmap.keys())
        ]

    # Build punto dict
    puntos_dict = {}
    for punto, dmap in punto_daily.items():
        puntos_dict[punto] = [
            build_daily_entry(dmap[f], is_grouped=True, revisores_set=dmap[f]['revisores_set'])
            for f in sorted(dmap.keys())
        ]

    result = {
        'total_revisores': len(revisores_daily),
        'puntos_por_regional': PUNTOS_POR_REGIONAL,
        'nacional': national_list,
        'regionales': regionales_dict,
        'puntos_atencion': puntos_dict,
        'revisores': revisores_daily
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

    print(f"  ✓ [generate_revisores_diario] public/data/revisores_diario.json generado ({len(revisores_daily)} revisores, {len(regionales_dict)} regionales, {len(puntos_dict)} puntos, {len(national_list)} días)")

if __name__ == '__main__':
    main()
