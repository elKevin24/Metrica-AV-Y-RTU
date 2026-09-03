#!/usr/bin/env python3
import json

with open("public/data/cubo_rtu.json", "r", encoding="utf-8") as f:
    d = json.load(f)

cols = d.get("cols", [])
idx_rango = cols.index("RangoAtencion")
idx_casos = cols.index("Casos")

rango_map = {}
for r in d.get("rows", []):
    rango = r[idx_rango]
    casos = r[idx_casos]
    rango_map[rango] = rango_map.get(rango, 0) + casos

print("Distribución por Rango de Atención en cubo_rtu:")
for k, v in sorted(rango_map.items(), key=lambda x: x[1], reverse=True):
    print(f"  - {k}: {v:,} ({v/d['total_expedientes']*100:.2f}%)")
