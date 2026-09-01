import json, math, statistics
from collections import defaultdict, Counter

with open("public/data/cubo_bitacora.json", "r", encoding="utf-8") as f:
    data = json.load(f)

cols = data["cols"]
rows = data["rows"]
tax = data["taxonomia"]
muestra = data["dataset_muestral_500"]
ops_8h = data["operadores_productividad_8h"]
ranking = data["ranking_operadores"]

col_map = {c: i for i, c in enumerate(cols)}

total_casos = sum(r[col_map["Casos"]] for r in rows)
total_aprob = sum(r[col_map["Aprobadas"]] for r in rows)
total_rech = sum(r[col_map["Rechazos"]] for r in rows)
total_final = sum(r[col_map["Finalizadas"]] for r in rows)
total_no_conf = sum(r[col_map["NoConfirmadas"]] for r in rows)
total_canc = sum(r[col_map["Canceladas"]] for r in rows)
total_ftr = sum(r[col_map["AprobDirectas"]] for r in rows)
total_sub = sum(r[col_map["AprobSubsanadas"]] for r in rows)
total_rech_def = sum(r[col_map["RechDefinitivos"]] for r in rows)

suma_buzon_hab = sum(r[col_map["Suma_Buzon_Hab_Sec"]] for r in rows)
n_buzon_hab = sum(r[col_map["N_Buzon_Hab"]] for r in rows)
suma_bolson = sum(r[col_map["Suma_Bolson_Sec"]] for r in rows)
n_bolson = sum(r[col_map["N_Bolson"]] for r in rows)
suma_atencion_final = sum(r[col_map["Suma_Atencion_Final_Sec"]] for r in rows)
n_atencion_final = sum(r[col_map["N_Atencion_Final"]] for r in rows)
suma_atencion_rech = sum(r[col_map["Suma_Atencion_Rechazo_Sec"]] for r in rows)
n_atencion_rech = sum(r[col_map["N_Atencion_Rechazo"]] for r in rows)
suma_ciclo_hab = sum(r[col_map["Suma_Ciclo_Hab_Sec"]] for r in rows)
n_ciclo_hab = sum(r[col_map["N_Ciclo_Hab"]] for r in rows)
suma_ciclo_cal = sum(r[col_map["Suma_Ciclo_Cal_Sec"]] for r in rows)
n_ciclo_cal = sum(r[col_map["N_Ciclo_Cal"]] for r in rows)

sla_8h = sum(r[col_map["SLA_8h"]] for r in rows)
sla_16h = sum(r[col_map["SLA_16h"]] for r in rows)
sla_24h = sum(r[col_map["SLA_24h"]] for r in rows)
sla_40h = sum(r[col_map["SLA_40h"]] for r in rows)
fuera_sla = sum(r[col_map["Fuera_SLA_40h"]] for r in rows)

print("==================================================")
print("1. VALIDACION DEL UNIVERSO HISTORICO DE AV")
print("==================================================")
print("Total Casos/Eventos en Bitácora:", f"{total_casos:,}")
print("Aprobadas:", f"{total_aprob:,} ({total_aprob/total_casos*100:.2f}%)")
print("  - First-Time-Right (1ra directa):", f"{total_ftr:,} ({total_ftr/total_casos*100:.2f}% del total, {total_ftr/total_aprob*100:.2f}% de aprobadas)")
print("  - Subsanadas (2da+ ronda):", f"{total_sub:,} ({total_sub/total_casos*100:.2f}% del total, {total_sub/total_aprob*100:.2f}% de aprobadas)")
print("Rechazos / Observaciones temporales:", f"{total_rech:,} ({total_rech/total_casos*100:.2f}%)")
print("Rechazos Definitivos:", f"{total_rech_def:,} ({total_rech_def/total_casos*100:.2f}%)")
print("No Confirmadas (Abandono/Caducidad):", f"{total_no_conf:,} ({total_no_conf/total_casos*100:.2f}%)")

print("\n==================================================")
print("2. DESCOMPOSICION DE TIEMPOS Y CUELLOS DE BOTELLA")
print("==================================================")
avg_bolson_s = suma_bolson / n_bolson if n_bolson else 0
avg_buzon_h = (suma_buzon_hab / n_buzon_hab / 3600) if n_buzon_hab else 0
avg_aten_final_m = (suma_atencion_final / n_atencion_final / 60) if n_atencion_final else 0
avg_aten_rech_m = (suma_atencion_rech / n_atencion_rech / 60) if n_atencion_rech else 0
avg_ciclo_h = (suma_ciclo_hab / n_ciclo_hab / 3600) if n_ciclo_hab else 0
avg_ciclo_cal_d = (suma_ciclo_cal / n_ciclo_cal / 86400) if n_ciclo_cal else 0

print("Tiempo Bolsón (espera toma operador):", f"{avg_bolson_s/60:.2f} min ({avg_bolson_s:.1f} seg) [N={n_bolson:,}]")
print("Tiempo Buzón Hábil (espera total en cola):", f"{avg_buzon_h:.2f} horas ({avg_buzon_h*60:.1f} min) [N={n_buzon_hab:,}]")
print("Tiempo Dictamen Aprobación (humana activa):", f"{avg_aten_final_m:.2f} min ({avg_aten_final_m*60:.1f} seg) [N={n_atencion_final:,}]")
print("Tiempo Dictamen Rechazo (humana activa):", f"{avg_aten_rech_m:.2f} min ({avg_aten_rech_m*60:.1f} seg) [N={n_atencion_rech:,}]")
print("Lead Time Hábil Total (08:00 - 16:00):", f"{avg_ciclo_h:.2f} horas [N={n_ciclo_hab:,}]")
print("Lead Time Calendario Total (24/7):", f"{avg_ciclo_cal_d:.2f} días ({avg_ciclo_cal_d*24:.1f} h) [N={n_ciclo_cal:,}]")

pct_tiempo_espera = (avg_buzon_h / avg_ciclo_h * 100) if avg_ciclo_h else 0
pct_tiempo_activo = ((avg_aten_final_m/60) / avg_ciclo_h * 100) if avg_ciclo_h else 0
print(f"-> Proporción en Cola de Espera: {pct_tiempo_espera:.1f}% del Lead Time Hábil")
print(f"-> Proporción en Atención Activa de Operador: {pct_tiempo_activo:.2f}% del Lead Time Hábil")

print("\n==================================================")
print("3. ANÁLISIS DE RONDAS Y CICLO DE VIDA")
print("==================================================")
ronda_stats = defaultdict(lambda: {"casos": 0, "aprob": 0, "ftr": 0, "sub": 0, "rech": 0, "rech_def": 0, "ciclo_sec": 0, "n_ciclo": 0, "aten_sec": 0, "n_aten": 0})
for r in rows:
    rnd = r[col_map["Ronda_Revision"]]
    c = r[col_map["Casos"]]
    ronda_stats[rnd]["casos"] += c
    ronda_stats[rnd]["aprob"] += r[col_map["Aprobadas"]]
    ronda_stats[rnd]["ftr"] += r[col_map["AprobDirectas"]]
    ronda_stats[rnd]["sub"] += r[col_map["AprobSubsanadas"]]
    ronda_stats[rnd]["rech"] += r[col_map["Rechazos"]]
    ronda_stats[rnd]["rech_def"] += r[col_map["RechDefinitivos"]]
    ronda_stats[rnd]["ciclo_sec"] += r[col_map["Suma_Ciclo_Hab_Sec"]]
    ronda_stats[rnd]["n_ciclo"] += r[col_map["N_Ciclo_Hab"]]
    ronda_stats[rnd]["aten_sec"] += r[col_map["Suma_Atencion_Final_Sec"]]
    ronda_stats[rnd]["n_aten"] += r[col_map["N_Atencion_Final"]]

for rnd, s in sorted(ronda_stats.items(), key=lambda x: x[1]["casos"], reverse=True):
    avg_h = (s["ciclo_sec"] / s["n_ciclo"] / 3600) if s["n_ciclo"] else 0
    avg_m = (s["aten_sec"] / s["n_aten"] / 60) if s["n_aten"] else 0
    aprob_r = (s["aprob"] / s["casos"] * 100) if s["casos"] else 0
    print(f"Ronda {rnd}: Casos={s['casos']:,} ({s['casos']/total_casos*100:.1f}%) | Aprobadas={s['aprob']:,} ({aprob_r:.1f}%) | Rechazos={s['rech']:,} | LeadTime={avg_h:.1f}h | TiempoAten={avg_m:.2f}m")

print("\n==================================================")
print("4. ANÁLISIS DE REGIONES")
print("==================================================")
reg_stats = defaultdict(lambda: {"casos": 0, "aprob": 0, "ftr": 0, "sub": 0, "rech": 0, "rech_def": 0, "no_conf": 0, "ciclo_hab_sec": 0, "n_ciclo": 0, "atencion_sec": 0, "n_atencion": 0, "sla_8h": 0})
for r in rows:
    reg = r[col_map["Region"]]
    c = r[col_map["Casos"]]
    reg_stats[reg]["casos"] += c
    reg_stats[reg]["aprob"] += r[col_map["Aprobadas"]]
    reg_stats[reg]["ftr"] += r[col_map["AprobDirectas"]]
    reg_stats[reg]["sub"] += r[col_map["AprobSubsanadas"]]
    reg_stats[reg]["rech"] += r[col_map["Rechazos"]]
    reg_stats[reg]["rech_def"] += r[col_map["RechDefinitivos"]]
    reg_stats[reg]["no_conf"] += r[col_map["NoConfirmadas"]]
    reg_stats[reg]["ciclo_hab_sec"] += r[col_map["Suma_Ciclo_Hab_Sec"]]
    reg_stats[reg]["n_ciclo"] += r[col_map["N_Ciclo_Hab"]]
    reg_stats[reg]["atencion_sec"] += r[col_map["Suma_Atencion_Final_Sec"]]
    reg_stats[reg]["n_atencion"] += r[col_map["N_Atencion_Final"]]
    reg_stats[reg]["sla_8h"] += r[col_map["SLA_8h"]]

for reg, s in sorted(reg_stats.items(), key=lambda x: x[1]["casos"], reverse=True):
    ftr_r = s["ftr"] / s["casos"] * 100 if s["casos"] else 0
    aprob_r = s["aprob"] / s["casos"] * 100 if s["casos"] else 0
    sla_r = s["sla_8h"] / s["casos"] * 100 if s["casos"] else 0
    avg_ciclo_h = (s["ciclo_hab_sec"] / s["n_ciclo"] / 3600) if s["n_ciclo"] else 0
    avg_aten_m = (s["atencion_sec"] / s["n_atencion"] / 60) if s["n_atencion"] else 0
    print(f"Región {reg}: Casos={s['casos']:,} ({s['casos']/total_casos*100:.1f}%) | FTR={ftr_r:.1f}% | Aprob={aprob_r:.1f}% | SLA<=8h={sla_r:.1f}% | LeadTime={avg_ciclo_h:.1f}h | Aten={avg_aten_m:.2f}min")

print("\n==================================================")
print("5. ANÁLISIS DE LAS 26 CAUSALES & 6 MACROFAMILIAS")
print("==================================================")
sub_stats = defaultdict(lambda: {"id_sub": "", "macro": "", "casos": 0, "rech": 0, "sub": 0, "rech_def": 0, "no_conf": 0, "ciclo_sec": 0, "n_ciclo": 0})
for r in rows:
    sub_id = r[col_map["ID_Subcategoria"]]
    macro = r[col_map["MacroFamilia"]]
    c = r[col_map["Casos"]]
    sub_stats[sub_id]["id_sub"] = sub_id
    sub_stats[sub_id]["macro"] = macro
    sub_stats[sub_id]["casos"] += c
    sub_stats[sub_id]["rech"] += r[col_map["Rechazos"]]
    sub_stats[sub_id]["sub"] += r[col_map["AprobSubsanadas"]]
    sub_stats[sub_id]["rech_def"] += r[col_map["RechDefinitivos"]]
    sub_stats[sub_id]["no_conf"] += r[col_map["NoConfirmadas"]]
    sub_stats[sub_id]["ciclo_sec"] += r[col_map["Suma_Ciclo_Hab_Sec"]]
    sub_stats[sub_id]["n_ciclo"] += r[col_map["N_Ciclo_Hab"]]

# Mapping sub to name
tax_map = {t["ID_Sub"]: t["Subcategoria"] for t in tax}

sorted_subs = sorted(sub_stats.values(), key=lambda x: x["rech"], reverse=True)
for s in sorted_subs[:15]:
    sub_name = tax_map.get(s["id_sub"], s["id_sub"])
    recup_r = (s["sub"] / (s["rech"] + 1e-9) * 100) if s["rech"] else 0
    avg_h = (s["ciclo_sec"] / s["n_ciclo"] / 3600) if s["n_ciclo"] else 0
    aband_r = (s["no_conf"] / s["casos"] * 100) if s["casos"] else 0
    print(f"[{s['id_sub']}] {sub_name[:35]:35} | Macro={s['macro'][:20]:20} | Rechazos={s['rech']:,} | Subsanadas={s['sub']:,} (Recup={recup_r:.1f}%) | Abandono={aband_r:.1f}% | LeadTime={avg_h:.1f}h")

print("\n==================================================")
print("6. ANÁLISIS DE OPERADORES & AUDITORÍA DE VELOCIDAD")
print("==================================================")
op_stats = defaultdict(lambda: {"casos": 0, "aprob": 0, "ftr": 0, "sub": 0, "rech": 0, "rech_def": 0, "no_conf": 0, "aten_sec": 0, "n_aten": 0, "ciclo_sec": 0, "n_ciclo": 0, "speeds": Counter()})
for r in rows:
    op = r[col_map["U1"]]
    c = r[col_map["Casos"]]
    v = r[col_map["Rango_Velocidad"]]
    op_stats[op]["casos"] += c
    op_stats[op]["aprob"] += r[col_map["Aprobadas"]]
    op_stats[op]["ftr"] += r[col_map["AprobDirectas"]]
    op_stats[op]["sub"] += r[col_map["AprobSubsanadas"]]
    op_stats[op]["rech"] += r[col_map["Rechazos"]]
    op_stats[op]["rech_def"] += r[col_map["RechDefinitivos"]]
    op_stats[op]["no_conf"] += r[col_map["NoConfirmadas"]]
    op_stats[op]["aten_sec"] += r[col_map["Suma_Atencion_Final_Sec"]]
    op_stats[op]["n_aten"] += r[col_map["N_Atencion_Final"]]
    op_stats[op]["ciclo_sec"] += r[col_map["Suma_Ciclo_Hab_Sec"]]
    op_stats[op]["n_ciclo"] += r[col_map["N_Ciclo_Hab"]]
    op_stats[op]["speeds"][v] += c

print(f"Total Operadores Únicos: {len(op_stats)}")
# Compute z-scores on speed and rejection rate
rejection_rates = [s["rech"]/s["casos"]*100 for s in op_stats.values() if s["casos"] >= 100]
mean_rech = statistics.mean(rejection_rates)
stdev_rech = statistics.stdev(rejection_rates) if len(rejection_rates) > 1 else 1

print(f"Media de Rechazo Operadores (N>=100): {mean_rech:.2f}% (Desv. Estándar: {stdev_rech:.2f}%)")

for op, s in sorted(op_stats.items(), key=lambda x: x[1]["casos"], reverse=True)[:15]:
    avg_m = (s["aten_sec"] / s["n_aten"] / 60) if s["n_aten"] else 0
    rech_r = (s["rech"] / s["casos"] * 100) if s["casos"] else 0
    ftr_r = (s["ftr"] / s["casos"] * 100) if s["casos"] else 0
    z_rech = (rech_r - mean_rech) / stdev_rech if s["casos"] >= 100 else 0
    fast_pct = (s["speeds"]["<5s"] + s["speeds"]["5-15s"]) / s["casos"] * 100 if s["casos"] else 0
    print(f"Operador {op:10}: Casos={s['casos']:,} | FTR={ftr_r:.1f}% | Rechazo={rech_r:.1f}% (Z={z_rech:+.2f}) | Aten={avg_m:.2f}min | Dictamen Ultra-Rápido(<15s)={fast_pct:.1f}%")
