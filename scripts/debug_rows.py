#!/usr/bin/env python3
"""
Inspeccionar las filas no cero en cubo_rtu.json
"""
import json

with open("public/data/cubo_rtu.json", "r", encoding="utf-8") as f:
    d = json.load(f)

cols = d.get("cols", [])
print("Cols:", cols)

for idx, r in enumerate(d.get("rows", [])):
    if any(val > 0 for val in r[7:]):
        print(f"Row {idx}: {r}")
        if idx > 10:
            break
