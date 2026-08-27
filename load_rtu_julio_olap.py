import os
import pandas as pd
import duckdb
from datetime import datetime

# Paths
BASE_DIR = r"C:\\Users\\busqu\\Documents\\GitHub\\Metrica AV Y RTU"
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
EXCEL_FILES = [
    os.path.join(DATA_DIR, f"10000390411_reporteRTUjulio{i}.xlsx")
    for i in range(1, 6)
]

# DuckDB database (will be created if not exists)
DB_PATH = os.path.join(BASE_DIR, "rtu_julio.olap.db")
con = duckdb.connect(DB_PATH)

# Ensure table exists: drop if re-running
con.execute("DROP TABLE IF EXISTS rtu_julio")

combined = []
for path in EXCEL_FILES:
    if not os.path.exists(path):
        print(f"Archivo no encontrado: {path}")
        continue
    df = pd.read_excel(path)
    df.columns = [c.strip().lower().replace(" ", "_").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u") for c in df.columns]
# Rename columns to match OLAP schema
col_map = {
    "estado": "estadoactual",
    "estado_1": "estadoactual",
    "fecha_creacion_solicitud": "fechacreacion",
    "fecha_confirmacion_solicitud": "fechaasignacion",
    "fecha_revisor": "fecharevision",
    "fecha_estado": "fechafinaliza",
}
for old, new in col_map.items():
    if old in df.columns:
        df.rename(columns={old: new}, inplace=True)

df["origen"] = os.path.basename(path)
combined.append(df)

if combined:
    full_df = pd.concat(combined, ignore_index=True)
    # Convertir columnas de fechas a tipo datetime (ignorando errores)
    date_cols = [c for c in full_df.columns if "fecha" in c]
    for col in date_cols:
        full_df[col] = pd.to_datetime(full_df[col], errors="coerce")
    # Guardar en DuckDB como tabla
    con.register("tmp_df", full_df)
    con.execute("CREATE TABLE rtu_julio AS SELECT * FROM tmp_df")
    print(f"Tabla rtu_julio creada con {full_df.shape[0]} filas y {full_df.shape[1]} columnas.")
    # Vista resumida opcional
    con.execute("""
        CREATE OR REPLACE VIEW rtu_julio_summary AS
        SELECT
            estadoactual,
            count(*) AS total,
            avg(datediff('day', fechaasignacion, fecharevision)) AS avg_days_asig_rev,
            avg(datediff('day', fecharevision, fechafinaliza)) AS avg_days_rev_fin
        FROM rtu_julio
        GROUP BY estadoactual
    """)
    print("Vista resumen creada: rtu_julio_summary")
else:
    print("No se cargaron archivos.")

con.close()
