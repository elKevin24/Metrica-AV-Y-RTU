import os, glob, json, gzip, re, time
import duckdb
import pyarrow.parquet as pq

report = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "secciones": {}
}

# 1. AUDITORÍA DE ARCHIVOS EXCEL FUENTE
excel_files = sorted(glob.glob("Data/Excel/*.xlsx"))
total_excel_mb = sum(os.path.getsize(f) for f in excel_files) / (1024 * 1024)
report["secciones"]["1_fuentes_excel"] = {
    "total_archivos": len(excel_files),
    "peso_total_mb": round(total_excel_mb, 2),
    "archivos": [os.path.basename(f) for f in excel_files],
    "estado": "PASS" if len(excel_files) == 16 else "FAIL"
}

# 2. AUDITORÍA DUCKDB & RELACIONAL
con = duckdb.connect("Data/sat_tramites.duckdb")

raw_count = con.execute("SELECT count(*) FROM raw_bitacora").fetchone()[0]
det_count = con.execute("SELECT count(*) FROM detalle_eventos").fetchone()[0]
mst_count = con.execute("SELECT count(*) FROM maestro_expedientes").fetchone()[0]

# Huérfanos
orphans = con.execute("""
    SELECT count(*) FROM detalle_eventos d
    LEFT JOIN maestro_expedientes m ON d.NoGestion = m.NoGestion
    WHERE m.NoGestion IS NULL
""").fetchone()[0]

# Nulos en maestro
null_audit = con.execute("""
    SELECT 
        SUM(CASE WHEN NoGestion IS NULL OR TRIM(NoGestion) = '' THEN 1 ELSE 0 END) as n_null_gestion,
        SUM(CASE WHEN NIT IS NULL OR TRIM(NIT) = '' THEN 1 ELSE 0 END) as n_null_nit,
        SUM(CASE WHEN Estado IS NULL OR TRIM(Estado) = '' THEN 1 ELSE 0 END) as n_null_estado,
        SUM(CASE WHEN FechaCreacion IS NULL THEN 1 ELSE 0 END) as n_null_fechacrea,
        SUM(CASE WHEN Region IS NULL OR TRIM(Region) = '' THEN 1 ELSE 0 END) as n_null_region
    FROM maestro_expedientes
""").fetchone()

# NITs con terminación K
nits_k = con.execute("SELECT count(*) FROM maestro_expedientes WHERE NIT LIKE '%K'").fetchone()[0]

# Inconsistencias de orden cronológico (FechaCreacion > FechaFinaliza)
date_anomalies = con.execute("""
    SELECT count(*) FROM maestro_expedientes
    WHERE FechaFinaliza IS NOT NULL AND FechaCreacion > FechaFinaliza
""").fetchone()[0]

# Métricas de negocio consolidadas
biz_metrics = con.execute("""
    SELECT 
        COUNT(*) as total_expedientes,
        SUM(Es_Aprobada) as total_aprobadas,
        SUM(Aprobada_Directa) as ftr_directas,
        SUM(Aprobada_Subsanada) as aprobadas_subsanadas,
        SUM(Es_Rechazo) as total_rechazos_observaciones,
        SUM(Rechazo_Definitivo) as rechazos_definitivos,
        SUM(Es_NoConfirmada) as no_confirmadas,
        ROUND(AVG(Buzon_Hab_Sec)/3600.0, 2) as avg_buzon_horas,
        ROUND(AVG(Ciclo_Hab_Sec)/3600.0, 2) as avg_ciclo_horas,
        ROUND(SUM(SLA_8h)*100.0/COUNT(*), 2) as pct_sla_8h,
        COUNT(DISTINCT U1) as operadores_u1_activos,
        COUNT(DISTINCT Region) as regiones_activas
    FROM maestro_expedientes
""").fetchone()

con.close()

report["secciones"]["2_duckdb_relacional"] = {
    "raw_bitacora_filas": raw_count,
    "detalle_eventos_filas": det_count,
    "maestro_expedientes_filas": mst_count,
    "eventos_huerfanos": orphans,
    "nulos_en_campos_criticos": sum(null_audit),
    "desglose_nulos": {
        "gestion": null_audit[0],
        "nit": null_audit[1],
        "estado": null_audit[2],
        "fecha_creacion": null_audit[3],
        "region": null_audit[4]
    },
    "nits_con_verificador_k": nits_k,
    "anomalias_cronologicas": date_anomalies,
    "estado": "PASS" if orphans == 0 and sum(null_audit) == 0 and date_anomalies == 0 else "FAIL"
}

report["secciones"]["3_metricas_negocio"] = {
    "total_expedientes": biz_metrics[0],
    "aprobadas": biz_metrics[1],
    "aprobadas_ftr_directas": biz_metrics[2],
    "aprobadas_subsanadas": biz_metrics[3],
    "total_observaciones_rechazo": biz_metrics[4],
    "rechazos_definitivos": biz_metrics[5],
    "no_confirmadas_caducadas": biz_metrics[6],
    "tiempo_medio_buzon_horas": biz_metrics[7],
    "lead_time_medio_ciclo_horas": biz_metrics[8],
    "cumplimiento_sla_8h_pct": biz_metrics[9],
    "revisores_u1_activos": biz_metrics[10],
    "regiones_activas": biz_metrics[11]
}

# 4. AUDITORÍA DEL CUBO OLAP & PARTICIONES
cubo_path = "public/data/cubo_bitacora.json"
with open(cubo_path, "r", encoding="utf-8") as f:
    cubo = json.load(f)

idx_casos = cubo["cols"].index("Casos")
idx_aprob = cubo["cols"].index("Aprobadas")
idx_ftr = cubo["cols"].index("AprobDirectas")
cubo_casos = sum(r[idx_casos] for r in cubo["rows"])
cubo_aprob = sum(r[idx_aprob] for r in cubo["rows"])
cubo_ftr = sum(r[idx_ftr] for r in cubo["rows"])

part_files = glob.glob("public/data/bitacora_partitions/*.json")
total_indexed_cases = 0
for pf in part_files:
    with open(pf, "r", encoding="utf-8") as f:
        total_indexed_cases += len(json.load(f))

report["secciones"]["4_cubo_olap_y_particiones"] = {
    "cubo_filas_agregadas": len(cubo["rows"]),
    "cubo_columnas": len(cubo["cols"]),
    "cubo_total_casos": cubo_casos,
    "discrepancia_cubo_vs_maestro": cubo_casos - mst_count,
    "total_particiones_hash": len(part_files),
    "total_expedientes_en_particiones": total_indexed_cases,
    "discrepancia_particiones_vs_maestro": total_indexed_cases - mst_count,
    "estado": "PASS" if (cubo_casos == mst_count and total_indexed_cases == mst_count and len(part_files) == 256) else "FAIL"
}

# 5. AUDITORÍA DE ARCHIVOS Y RUTAS WEB
report["secciones"]["5_archivos_y_persistencia"] = {
    "maestro_parquet_public_mb": round(os.path.getsize("public/data/maestro_expedientes.parquet") / (1024 * 1024), 2),
    "maestro_parquet_data_mb": round(os.path.getsize("Data/maestro_expedientes.parquet") / (1024 * 1024), 2),
    "detalle_parquet_mb": round(os.path.getsize("Data/detalle_eventos.parquet") / (1024 * 1024), 2),
    "cubo_gz_kb": round(os.path.getsize("public/data/cubo_bitacora.json.gz") / 1024, 2),
    "package_lock_presente": os.path.exists("package-lock.json"),
    "ci_cd_workflow_presente": os.path.exists(".github/workflows/deploy.yml")
}

print(json.dumps(report, indent=2, ensure_ascii=False))
