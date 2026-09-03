#!/usr/bin/env python3
"""
Extraer métricas de tiempos en cubo_rtu.json
"""
import json

with open("public/data/cubo_rtu.json", "r", encoding="utf-8") as f:
    d = json.load(f)

print("Dimensiones:")
for dim_k, dim_v in d.get("dimensiones", {}).items():
    print(f"\n--- Dimensión: {dim_k} ---")
    if isinstance(dim_v, dict):
        for k, v in list(dim_v.items())[:5]:
            print(f"  {k}: {v}")
    elif isinstance(dim_v, list):
        for it in dim_v[:5]:
            print(f"  {it}")

print("\nCols en rows:", d.get("cols", []))
if d.get("rows"):
    print("Muestra de row 0:", d.get("rows")[0])
