#!/usr/bin/env python3
"""
Cálculo exacto de agregados de tiempo en cubo_rtu.json:
- Suma_Cola_Sec / N_Cola  (Tiempo de Espera: Creación -> Revisor)
- Suma_Atencion_Sec / N_Atencion (Tiempo de Atención Activa: Revisor -> Estado)
- Suma_Total_Hab_Sec / N_Total_Hab (Lead Time Total Hábil)
"""
import json

with open("public/data/cubo_rtu.json", "r", encoding="utf-8") as f:
    d = json.load(f)

cols = d.get("cols", [])
idx_map = {c: i for i, c in enumerate(cols)}

total_casos = 0
total_suma_cola_sec = 0
total_n_cola = 0

total_suma_atencion_sec = 0
total_n_atencion = 0

total_suma_hab_sec = 0
total_n_hab = 0

# Por macro gestión
cola_por_macro = {}

for r in d.get("rows", []):
    casos = r[idx_map["Casos"]]
    s_cola = r[idx_map["Suma_Cola_Sec"]]
    n_cola = r[idx_map["N_Cola"]]
    s_atn = r[idx_map["Suma_Atencion_Sec"]]
    n_atn = r[idx_map["N_Atencion"]]
    s_hab = r[idx_map["Suma_Total_Hab_Sec"]]
    n_hab = r[idx_map["N_Total_Hab"]]
    macro = r[idx_map["MacroGestion"]]
    
    total_casos += casos
    total_suma_cola_sec += s_cola
    total_n_cola += n_cola
    
    total_suma_atencion_sec += s_atn
    total_n_atencion += n_atn
    
    total_suma_hab_sec += s_hab
    total_n_hab += n_hab
    
    if macro not in cola_por_macro:
        cola_por_macro[macro] = {"s_cola": 0, "n_cola": 0, "casos": 0}
    cola_por_macro[macro]["s_cola"] += s_cola
    cola_por_macro[macro]["n_cola"] += n_cola
    cola_por_macro[macro]["casos"] += casos

print(f"=== RESULTADOS TOTALES DE RTU (Universo: {total_casos:,} expedientes) ===")
print(f"\n1. TIEMPO HASTA INICIO DE ATENCIÓN (Creación -> Revisor):")
print(f"   - Cantidad de casos evaluados con revisor (N_Cola): {total_n_cola:,} expedientes ({total_n_cola/total_casos*100:.1f}% del universo)")
if total_n_cola > 0:
    prom_cola_sec = total_suma_cola_sec / total_n_cola
    prom_cola_min = prom_cola_sec / 60.0
    prom_cola_hrs = prom_cola_sec / 3600.0
    print(f"   - Tiempo Promedio de Espera: {prom_cola_hrs:.2f} horas ({prom_cola_min:.1f} minutos / {prom_cola_sec:.0f} segundos)")

print(f"\n2. TIEMPO DE REVISIÓN ACTIVA (Revisor -> Estado Final):")
print(f"   - Cantidad de casos (N_Atencion): {total_n_atencion:,}")
if total_n_atencion > 0:
    prom_atn_sec = total_suma_atencion_sec / total_n_atencion
    prom_atn_min = prom_atn_sec / 60.0
    print(f"   - Tiempo Promedio de Revisión: {prom_atn_min:.2f} minutos ({prom_atn_sec:.1f} segundos)")

print(f"\n3. TIEMPO TOTAL HÁBIL (Lead Time Hábil de Inicio a Fin):")
print(f"   - Cantidad de casos (N_Total_Hab): {total_n_hab:,}")
if total_n_hab > 0:
    prom_hab_sec = total_suma_hab_sec / total_n_hab
    prom_hab_hrs = prom_hab_sec / 3600.0
    print(f"   - Tiempo Promedio Total Hábil: {prom_hab_hrs:.2f} horas ({prom_hab_hrs*60:.1f} minutos)")

print(f"\n4. DESGLOSE DEL TIEMPO HASTA INICIO DE ATENCIÓN POR MACRO-GESTIÓN:")
for macro, vals in cola_por_macro.items():
    if vals["n_cola"] > 0:
        p_hrs = (vals["s_cola"] / vals["n_cola"]) / 3600.0
        p_min = (vals["s_cola"] / vals["n_cola"]) / 60.0
        print(f"   * {macro}:")
        print(f"       - Casos con revisor: {vals['n_cola']:,} de {vals['casos']:,} ({vals['n_cola']/vals['casos']*100:.1f}%)")
        print(f"       - Promedio de espera hasta inicio atención: {p_hrs:.2f} horas ({p_min:.1f} minutos)")
