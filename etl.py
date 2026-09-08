import pandas as pd
import glob
import json
import os
import re

def parse_time(time_str):
    if pd.isna(time_str) or not isinstance(time_str, str): return 0
    h = re.search(r'(\d+)h', time_str)
    m = re.search(r'(\d+)m', time_str)
    s = re.search(r'(\d+)s', time_str)
    
    hours = int(h.group(1)) if h else 0
    minutes = int(m.group(1)) if m else 0
    seconds = int(s.group(1)) if s else 0
    
    return hours * 60 + minutes + (seconds / 60.0)

print("Iniciando ETL (Modo Baja Memoria / Map-Reduce)...")
files = glob.glob('src/data/*.xlsx')
print(f"Encontrados {len(files)} archivos.")

cols_to_use = [
    'Número Gestión', 'NIT/CUI', 'Tipo de Trámite', 'Usuario actual (Etapa actual)',
    'Región', 'Tiempo en Cola de Asignación', 'Tiempo en Bandeja de Revisor',
    'Tiempo en Pantalla de Revisión', 'Total Atenciones', 'Estado Final'
]

aggregated_dfs = []
total_filas = 0

for f in files:
    print(f"Procesando {f}...")
    try:
        df = pd.read_excel(f, usecols=cols_to_use)
        total_filas += len(df)
        
        # Parse tiempos
        df['Cola_Minutos'] = df['Tiempo en Cola de Asignación'].apply(parse_time)
        df['Bandeja_Minutos'] = df['Tiempo en Bandeja de Revisor'].apply(parse_time)
        df['Pantalla_Minutos'] = df['Tiempo en Pantalla de Revisión'].apply(parse_time)
        
        df.rename(columns={
            'Número Gestión': 'ID', 'NIT/CUI': 'NIT', 'Tipo de Trámite': 'Tramite',
            'Usuario actual (Etapa actual)': 'Revisor', 'Región': 'Region',
            'Total Atenciones': 'Atenciones', 'Estado Final': 'Estado'
        }, inplace=True)
        
        df['Atenciones'] = df['Atenciones'].fillna(1)
        df['Estado'] = df['Estado'].fillna('Desconocido')
        
        # Sort and Group per file
        df = df.sort_values(by=['ID', 'Atenciones'])
        df_grouped = df.groupby('ID').agg({
            'NIT': 'last', 'Tramite': 'last', 'Revisor': 'last',
            'Region': 'last', 'Estado': 'last', 'Atenciones': 'max',
            'Cola_Minutos': 'sum', 'Bandeja_Minutos': 'sum', 'Pantalla_Minutos': 'sum'
        }).reset_index()
        
        aggregated_dfs.append(df_grouped)
        
        # Free memory
        del df
        del df_grouped
    except Exception as e:
        print(f"Error procesando {f}: {e}")

if not aggregated_dfs:
    print("No hay datos.")
    exit()

print("Combinando agregaciones parciales...")
df_final = pd.concat(aggregated_dfs, ignore_index=True)

# Un archivo puede tener eventos de la misma gestion, agrupamos de nuevo
df_final = df_final.sort_values(by=['ID', 'Atenciones'])
df_grouped_final = df_final.groupby('ID').agg({
    'NIT': 'last', 'Tramite': 'last', 'Revisor': 'last',
    'Region': 'last', 'Estado': 'last', 'Atenciones': 'max',
    'Cola_Minutos': 'sum', 'Bandeja_Minutos': 'sum', 'Pantalla_Minutos': 'sum'
}).reset_index()

total_gestiones = len(df_grouped_final)
ratio = total_filas / total_gestiones if total_gestiones > 0 else 0

promedio_cola = df_grouped_final['Cola_Minutos'].mean() / 60
promedio_bandeja = df_grouped_final['Bandeja_Minutos'].mean()
promedio_pantalla = df_grouped_final['Pantalla_Minutos'].mean()

print(f"Total Gestiones Únicas: {total_gestiones}")
print(f"Filas Totales en Crudo: {total_filas}")
print(f"Ratio: {ratio:.2f}x")

out_dir = 'public/data'
os.makedirs(out_dir, exist_ok=True)

kpi_data = {
    'total_gestiones': int(total_gestiones),
    'total_filas_log': int(total_filas),
    'ratio_retrabajo': round(float(ratio), 2),
    'tiempos_promedio': {
        'cola_horas': round(float(promedio_cola), 2),
        'bandeja_min': round(float(promedio_bandeja), 2),
        'pantalla_min': round(float(promedio_pantalla), 2)
    },
    'estados': df_grouped_final['Estado'].value_counts().to_dict(),
    'cuadrantes': df_grouped_final.groupby('Revisor')['ID'].count().to_dict()
}

criticos = df_grouped_final.sort_values(by=['Cola_Minutos', 'Atenciones'], ascending=[False, False]).head(100)
kpi_data['casos_criticos'] = criticos.to_dict(orient='records')

with open(os.path.join(out_dir, 'dashboard_data.json'), 'w') as f:
    json.dump(kpi_data, f)

print(f"ETL Finalizado. Datos guardados en {out_dir}/dashboard_data.json")
