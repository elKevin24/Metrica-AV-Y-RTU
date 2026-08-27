import pandas as pd
import numpy as np

df = pd.read_parquet('Data/maestro_expedientes.parquet')

# Filtrar solo los que tienen asignacion (ciclo completo)
ciclo = df[df['FechaAsignacion'].notna()].copy()

# Calcular tiempos por etapa (en horas)
ciclo['T_Creacion_Asignacion'] = (ciclo['FechaAsignacion'] - ciclo['FechaCreacion']).dt.total_seconds() / 3600
ciclo['T_Asignacion_Revision'] = (ciclo['FechaRevision'] - ciclo['FechaAsignacion']).dt.total_seconds() / 3600

# Revision a Finalizacion o Rechazo
ciclo['FechaFin'] = ciclo['FechaFinaliza'].fillna(ciclo['FechaRechazo'])
ciclo['T_Revision_Fin'] = (ciclo['FechaFin'] - ciclo['FechaRevision']).dt.total_seconds() / 3600

# Ciclo total
ciclo['T_Total'] = (ciclo['FechaFin'] - ciclo['FechaCreacion']).dt.total_seconds() / 3600

cols = ['T_Creacion_Asignacion', 'T_Asignacion_Revision', 'T_Revision_Fin', 'T_Total']

print("=" * 60)
print("RESUMEN TIEMPOS POR ETAPA (horas)")
print("=" * 60)
print(ciclo[cols].describe().round(2).to_string())
print()

# Promedios y participacion
total_p = ciclo['T_Total'].mean()
ca = ciclo['T_Creacion_Asignacion'].mean()
ar = ciclo['T_Asignacion_Revision'].mean()
rf = ciclo['T_Revision_Fin'].mean()

print("=" * 60)
print("PROMEDIOS Y PARTICIPACION EN EL CICLO")
print("=" * 60)
print(f"  Creacion -> Asignacion:  {ca:>7.2f}h  ({ca/total_p*100:>5.1f}%)")
print(f"  Asignacion -> Revision:  {ar:>7.2f}h  ({ar/total_p*100:>5.1f}%)")
print(f"  Revision -> Fin:         {rf:>7.2f}h  ({rf/total_p*100:>5.1f}%)")
print(f"  TOTAL:                   {total_p:>7.2f}h")
print()

# Por Gestion
print("=" * 60)
print("POR GESTION")
print("=" * 60)
for ges in ciclo['Gestion'].unique():
    sub = ciclo[ciclo['Gestion'] == ges]
    t = sub['T_Total'].mean()
    c = sub['T_Creacion_Asignacion'].mean()
    a = sub['T_Asignacion_Revision'].mean()
    r = sub['T_Revision_Fin'].mean()
    print(f"  {ges} (n={len(sub):,})")
    print(f"    Creacion -> Asignacion:  {c:>7.2f}h  ({c/t*100:>5.1f}%)")
    print(f"    Asignacion -> Revision:  {a:>7.2f}h  ({a/t*100:>5.1f}%)")
    print(f"    Revision -> Fin:         {r:>7.2f}h  ({r/t*100:>5.1f}%)")
    print(f"    TOTAL:                   {t:>7.2f}h")
    print()

# Por Region
print("=" * 60)
print("POR REGION")
print("=" * 60)
for reg in sorted(ciclo['Region'].unique()):
    sub = ciclo[ciclo['Region'] == reg]
    t = sub['T_Total'].mean()
    c = sub['T_Creacion_Asignacion'].mean()
    a = sub['T_Asignacion_Revision'].mean()
    r = sub['T_Revision_Fin'].mean()
    print(f"  {reg} (n={len(sub):,})")
    print(f"    Creacion -> Asignacion:  {c:>7.2f}h  ({c/t*100:>5.1f}%)")
    print(f"    Asignacion -> Revision:  {a:>7.2f}h  ({a/t*100:>5.1f}%)")
    print(f"    Revision -> Fin:         {r:>7.2f}h  ({r/t*100:>5.1f}%)")
    print(f"    TOTAL:                   {t:>7.2f}h")
    print()

# Por Estado
print("=" * 60)
print("POR ESTADO")
print("=" * 60)
for est in sorted(ciclo['Estado'].unique()):
    sub = ciclo[ciclo['Estado'] == est]
    t = sub['T_Total'].mean()
    c = sub['T_Creacion_Asignacion'].mean()
    a = sub['T_Asignacion_Revision'].mean()
    r = sub['T_Revision_Fin'].mean()
    print(f"  {est} (n={len(sub):,})")
    print(f"    Creacion -> Asignacion:  {c:>7.2f}h  ({c/t*100:>5.1f}%)")
    print(f"    Asignacion -> Revision:  {a:>7.2f}h  ({a/t*100:>5.1f}%)")
    print(f"    Revision -> Fin:         {r:>7.2f}h  ({r/t*100:>5.1f}%)")
    print(f"    TOTAL:                   {t:>7.2f}h")
    print()

# Percentiles
print("=" * 60)
print("PERCENTILES (horas)")
print("=" * 60)
for col in cols:
    print(f"\n  {col}:")
    for p in [25, 50, 75, 90, 95, 99]:
        print(f"    P{p}: {ciclo[col].quantile(p/100):>7.2f}h")
