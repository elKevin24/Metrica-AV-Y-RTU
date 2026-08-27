#!/usr/bin/env python3
"""
Cálculo exacto desde cubo_rtu_julio_2026.json o cubo_rtu.json del tiempo desde fecha_creacion hasta fecha_revisor
"""
import os
import json
import gzip
from datetime import datetime, time, timedelta

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
    if not dt_start or not dt_end or dt_end < dt_start:
        return 0.0
    current = dt_start
    total_seconds = 0
    if current.date() == dt_end.date():
        if current.weekday() < 5:
            w_start = max(current, datetime.combine(current.date(), time(8, 0)))
            w_end = min(dt_end, datetime.combine(current.date(), time(16, 0)))
            if w_end > w_start:
                total_seconds += (w_end - w_start).total_seconds()
        return total_seconds / 3600.0
    
    if current.weekday() < 5:
        w_start = max(current, datetime.combine(current.date(), time(8, 0)))
        w_end = datetime.combine(current.date(), time(16, 0))
        if w_end > w_start:
            total_seconds += (w_end - w_start).total_seconds()
            
    curr_date = current.date() + timedelta(days=1)
    while curr_date < dt_end.date():
        if curr_date.weekday() < 5:
            total_seconds += 8 * 3600
        curr_date += timedelta(days=1)
        
    if dt_end.weekday() < 5:
        w_start = datetime.combine(dt_end.date(), time(8, 0))
        w_end = min(dt_end, datetime.combine(dt_end.date(), time(16, 0)))
        if w_end > w_start:
            total_seconds += (w_end - w_start).total_seconds()
            
    return total_seconds / 3600.0

def main():
    json_path = "public/data/cubo_rtu.json"
    if not os.path.exists(json_path):
        json_path = "public/data/cubo_rtu_julio_2026.json"
        
    print(f"Cargando {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print("Claves disponibles en el JSON:", list(data.keys()) if isinstance(data, dict) else "Es una lista")
    
    if isinstance(data, dict):
        for k in data:
            if isinstance(data[k], (list, dict)):
                print(f"  - {k}: {type(data[k])} (len: {len(data[k]) if hasattr(data[k], '__len__') else 'N/A'})")
            else:
                print(f"  - {k}: {data[k]}")

if __name__ == "__main__":
    main()
