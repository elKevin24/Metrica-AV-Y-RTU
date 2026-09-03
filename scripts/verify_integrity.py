import os, glob, json, gzip
import duckdb
import pyarrow.parquet as pq

errors = []
warnings = []

print("=== 1. VERIFICACIÓN DE ARCHIVOS EXCEL FUENTE ===")
excel_files = sorted(glob.glob("Data/Excel/*.xlsx"))
print(f"Archivos encontrados: {len(excel_files)}")
total_mb = sum(os.path.getsize(f) for f in excel_files) / (1024 * 1024)
print(f"Peso total en disco: {total_mb:.2f} MB")
if len(excel_files) != 16:
    errors.append(f"Se esperaban 16 archivos Excel, se encontraron {len(excel_files)}")

print("\n=== 2. VERIFICACIÓN DE DUCKDB ===")
duck_path = "Data/sat_tramites.duckdb"
if not os.path.exists(duck_path):
    errors.append(f"No existe {duck_path}")
else:
    con = duckdb.connect(duck_path)
    tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
    print(f"Tablas en DuckDB: {tables}")
    for t in ['raw_bitacora', 'detalle_eventos', 'maestro_expedientes']:
        if t not in tables:
            errors.append(f"Falta la tabla {t} en DuckDB")
        else:
            cnt = con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
            print(f"  - {t}: {cnt:,} filas")

    # Integridad referencial
    orphan_events = con.execute("""
        SELECT count(*) FROM detalle_eventos d 
        LEFT JOIN maestro_expedientes m ON d.NoGestion = m.NoGestion 
        WHERE m.NoGestion IS NULL
    """).fetchone()[0]
    print(f"Eventos huérfanos sin expediente maestro: {orphan_events}")
    if orphan_events > 0:
        errors.append(f"{orphan_events} eventos no tienen expediente maestro")

    # Verificación de NITs con 'K' en DuckDB
    k_nits = con.execute("SELECT count(*) FROM maestro_expedientes WHERE NIT LIKE '%K'").fetchone()[0]
    print(f"Expedientes con NIT terminando en K: {k_nits:,}")
    if k_nits == 0:
        errors.append("No se encontraron NITs con K en maestro_expedientes")

    # Verificación de nulos en columnas críticas de Maestro
    null_checks = con.execute("""
        SELECT 
            COUNT(CASE WHEN NoGestion IS NULL OR NoGestion = '' THEN 1 END) as null_gestion,
            COUNT(CASE WHEN NIT IS NULL OR NIT = '' THEN 1 END) as null_nit,
            COUNT(CASE WHEN Estado IS NULL OR Estado = '' THEN 1 END) as null_estado,
            COUNT(CASE WHEN FechaCreacion IS NULL THEN 1 END) as null_crea,
            COUNT(CASE WHEN Region IS NULL OR Region = '' THEN 1 END) as null_region
        FROM maestro_expedientes
    """).fetchone()
    print(f"Nulos en Maestro (Gestion, NIT, Estado, FechaCreacion, Region): {null_checks}")
    if any(null_checks):
        errors.append(f"Se encontraron nulos en columnas críticas: {null_checks}")

    con.close()

print("\n=== 3. VERIFICACIÓN DE PARQUET ===")
for pfile, expected_rows in [("Data/maestro_expedientes.parquet", 182412), ("Data/detalle_eventos.parquet", 1254098)]:
    if not os.path.exists(pfile):
        errors.append(f"No existe {pfile}")
    else:
        meta = pq.read_metadata(pfile)
        size_mb = os.path.getsize(pfile) / (1024 * 1024)
        print(f"{pfile}: {meta.num_rows:,} filas, {meta.num_columns} columnas, {size_mb:.2f} MB")
        if meta.num_rows != expected_rows:
            warnings.append(f"{pfile} tiene {meta.num_rows:,} filas (esperadas {expected_rows:,})")

print("\n=== 4. VERIFICACIÓN DEL CUBO OLAP & PARTICIONES ===")
cubo_path = "public/data/cubo_bitacora.json"
if not os.path.exists(cubo_path):
    errors.append(f"No existe {cubo_path}")
else:
    with open(cubo_path, "r", encoding="utf-8") as f:
        cubo = json.load(f)
    print(f"Cubo rows: {len(cubo.get('rows', [])):,}, cols: {len(cubo.get('cols', []))}")
    print(f"Taxonomía categorías: {len(cubo.get('taxonomia', []))}")
    print(f"Ranking operadores: {len(cubo.get('ranking_operadores', []))}")
    print(f"Dataset muestral: {len(cubo.get('dataset_muestral_500', []))}")

# GZIP del cubo
gz_path = "public/data/cubo_bitacora.json.gz"
if not os.path.exists(gz_path):
    errors.append(f"No existe {gz_path}")
else:
    with gzip.open(gz_path, "rb") as fg:
        d_gz = json.loads(fg.read().decode("utf-8"))
    if len(d_gz.get("rows", [])) != len(cubo.get("rows", [])):
        errors.append("El archivo .gz no coincide en filas con el .json")
    print(f"Cubo GZIP verificado: {os.path.getsize(gz_path)/(1024*1024):.2f} MB")

# Particiones hash
part_files = glob.glob("public/data/bitacora_partitions/*.json")
print(f"Particiones hash de bitácora: {len(part_files)} / 256")
if len(part_files) != 256:
    errors.append(f"Se esperaban 256 particiones hash, se encontraron {len(part_files)}")

# Test de búsqueda en particiones hash
sample_part = "public/data/bitacora_partitions/00.json"
if os.path.exists(sample_part):
    with open(sample_part, "r", encoding="utf-8") as f:
        pdata = json.load(f)
    print(f"Muestra de partición 00.json: {len(pdata):,} expedientes indexados")
    first_key = list(pdata.keys())[0]
    print(f"  Ejemplo expediente: {first_key} -> {len(pdata[first_key])} eventos")

print("\n=== 5. VERIFICACIÓN DE DATA QUALITY REPORT ===")
dq_path = "public/data/data_quality_report.json"
with open(dq_path, "r", encoding="utf-8") as f:
    dq = json.load(f)
print(f"Fecha auditoría: {dq.get('fecha_auditoria')}")
print(f"Archivos fuente auditados: {dq.get('total_archivos_fuente')}")
print(f"Total expedientes únicos: {dq.get('total_expedientes_unicos'):,}")
print(f"Integridad referencial reportada: {dq.get('limpieza_y_saneamiento', {}).get('tasa_integridad_referencial')}")

print("\n=== RESUMEN FINAL ===")
if errors:
    print(f"ERRORES DETECTADOS ({len(errors)}):")
    for e in errors:
        print(" [FAIL]", e)
else:
    print("[PASS] CERO ERRORES. Todos los datos son consistentes, verificados y matemáticamente válidos.")
if warnings:
    print(f"ADVERTENCIAS ({len(warnings)}):")
    for w in warnings:
        print(" [WARN]", w)
