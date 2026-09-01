import json, math
from collections import defaultdict

with open("public/data/cubo_bitacora.json", "r", encoding="utf-8") as f:
    data = json.load(f)

cols = data["cols"]
rows = data["rows"]
col_map = {c: i for i, c in enumerate(cols)}

def calc_woe_iv(feature_name, target_name):
    buckets = defaultdict(lambda: {"total": 0, "event": 0, "nonevent": 0})
    for r in rows:
        val = r[col_map[feature_name]]
        c = r[col_map["Casos"]]
        event_count = r[col_map[target_name]]
        non_event = c - event_count
        buckets[val]["total"] += c
        buckets[val]["event"] += event_count
        buckets[val]["nonevent"] += non_event
    
    total_events = sum(b["event"] for b in buckets.values())
    total_nonevents = sum(b["nonevent"] for b in buckets.values())
    
    iv = 0
    results = {}
    for val, b in buckets.items():
        if b["total"] == 0: continue
        p_event = (b["event"] + 0.5) / (total_events + 1.0)
        p_nonevent = (b["nonevent"] + 0.5) / (total_nonevents + 1.0)
        woe = math.log(p_event / p_nonevent)
        iv_bin = (p_event - p_nonevent) * woe
        iv += iv_bin
        rate = b["event"] / b["total"] * 100
        results[val] = {"count": b["total"], "rate": rate, "woe": woe, "iv_bin": iv_bin}
    return iv, results

print("==================================================")
print("INFORMATION VALUE (IV) & WOE - TARGET: FTR (1ra Directa)")
print("==================================================")
for feat in ["Region", "Gestion", "TipoPersona", "MacroFamilia", "Rango_Velocidad"]:
    iv, res = calc_woe_iv(feat, "AprobDirectas")
    label = "Muy Fuerte" if iv > 0.3 else ("Medio" if iv > 0.1 else "Debil")
    print(f"\n[VARIABLE: {feat}] -> IV = {iv:.4f} ({label})")
    for k, v in sorted(res.items(), key=lambda x: x[1]["count"], reverse=True)[:5]:
        cnt = v["count"]
        r_val = v["rate"]
        w_val = v["woe"]
        print(f"   * {str(k)[:30]:30} | N={cnt:,} | FTR={r_val:.1f}% | WoE={w_val:+.3f}")

print("\n==================================================")
print("INFORMATION VALUE (IV) & WOE - TARGET: ABANDONO (NoConfirmadas)")
print("==================================================")
for feat in ["Region", "Gestion", "TipoPersona", "MacroFamilia"]:
    iv, res = calc_woe_iv(feat, "NoConfirmadas")
    label = "Muy Fuerte" if iv > 0.3 else ("Medio" if iv > 0.1 else "Debil")
    print(f"\n[VARIABLE: {feat}] -> IV = {iv:.4f} ({label})")
    for k, v in sorted(res.items(), key=lambda x: x[1]["count"], reverse=True)[:5]:
        cnt = v["count"]
        r_val = v["rate"]
        w_val = v["woe"]
        print(f"   * {str(k)[:30]:30} | N={cnt:,} | Abandono={r_val:.1f}% | WoE={w_val:+.3f}")

print("\n==================================================")
print("SERIE TEMPORAL POR MES EN AV")
print("==================================================")
month_stats = defaultdict(lambda: {"casos": 0, "aprob": 0, "ftr": 0, "rech": 0, "no_conf": 0, "sla_8h": 0})
for r in rows:
    m = r[col_map["Mes"]]
    c = r[col_map["Casos"]]
    month_stats[m]["casos"] += c
    month_stats[m]["aprob"] += r[col_map["Aprobadas"]]
    month_stats[m]["ftr"] += r[col_map["AprobDirectas"]]
    month_stats[m]["rech"] += r[col_map["Rechazos"]]
    month_stats[m]["no_conf"] += r[col_map["NoConfirmadas"]]
    month_stats[m]["sla_8h"] += r[col_map["SLA_8h"]]

for m, s in sorted(month_stats.items()):
    cnt = s["casos"]
    ftr_r = s["ftr"] / cnt * 100 if cnt else 0
    aprob_r = s["aprob"] / cnt * 100 if cnt else 0
    sla_r = s["sla_8h"] / cnt * 100 if cnt else 0
    print(f"Mes {m}: Casos={cnt:,} | FTR={ftr_r:.1f}% | Aprob={aprob_r:.1f}% | Rech={s['rech']:,} | SLA<=8h={sla_r:.1f}%")
