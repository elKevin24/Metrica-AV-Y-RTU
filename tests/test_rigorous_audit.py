import unittest
import json
import glob
import os
import duckdb
import pyarrow.parquet as pq
import numpy as np

class TestRigorousAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.duck_path = "Data/sat_tramites.duckdb"
        cls.parquet_maestro = "Data/maestro_expedientes.parquet"
        cls.parquet_detalle = "Data/detalle_eventos.parquet"
        cls.cubo_path = "public/data/cubo_bitacora.json"
        cls.partition_dir = "public/data/bitacora_partitions"

        cls.con = duckdb.connect(cls.duck_path, read_only=True)
        with open(cls.cubo_path, "r", encoding="utf-8") as f:
            cls.cubo = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls.con.close()

    # -------------------------------------------------------------
    # 1. INVARIANZAS MATEMÁTICAS Y DE CONSERVACIÓN DE EXPEDIENTES
    # -------------------------------------------------------------
    def test_01_conservation_of_approved_subsets(self):
        """FTR + Subsanadas debe ser exactamente igual al total de Aprobadas."""
        row = self.con.execute("""
            SELECT 
                SUM(Es_Aprobada) AS total_aprobadas,
                SUM(Aprobada_Directa) AS ftr_directas,
                SUM(Aprobada_Subsanada) AS subsanadas
            FROM maestro_expedientes
        """).fetchone()
        total_aprob, ftr, sub = row
        self.assertEqual(ftr + sub, total_aprob, f"Falla de conservación: FTR ({ftr}) + Subsanadas ({sub}) != Aprobadas ({total_aprob})")

    def test_02_conservation_of_sla_partitions(self):
        """La partición de rangos de SLA debe sumar exactamente los casos con ciclo medible."""
        row = self.con.execute("""
            SELECT 
                SUM(N_Ciclo_Hab) AS total_medibles,
                SUM(SLA_8h) AS s8,
                SUM(SLA_16h) AS s16,
                SUM(SLA_24h) AS s24,
                SUM(SLA_40h) AS s40,
                SUM(Fuera_SLA_40h) AS s_fuera
            FROM maestro_expedientes
        """).fetchone()
        total_medibles, s8, s16, s24, s40, s_fuera = row
        sla_sum = s8 + s16 + s24 + s40 + s_fuera
        self.assertEqual(sla_sum, total_medibles, f"Partición disjunta de SLAs violada: {sla_sum} != {total_medibles}")

    # -------------------------------------------------------------
    # 2. INVARIANZAS FÍSICAS Y TEMPORALES DE TIEMPOS HÁBILES
    # -------------------------------------------------------------
    def test_03_business_time_never_exceeds_calendar_time(self):
        """El tiempo hábil (8h) NUNCA puede exceder el tiempo calendario total transcurrido."""
        anomalies = self.con.execute("""
            SELECT COUNT(*) 
            FROM maestro_expedientes 
            WHERE Ciclo_Hab_Sec > (Ciclo_Cal_Sec + 60) -- margen de 60s por redondeos
        """).fetchone()[0]
        self.assertEqual(anomalies, 0, f"Se detectaron {anomalies} casos con tiempo hábil mayor al tiempo calendario.")

    def test_04_no_negative_durations(self):
        """Ningún tiempo de ciclo, buzón, bolsón o atención puede ser negativo."""
        anomalies = self.con.execute("""
            SELECT COUNT(*) 
            FROM maestro_expedientes 
            WHERE Buzon_Hab_Sec < 0 
               OR Ciclo_Hab_Sec < 0 
               OR Buzon_Cal_Sec < 0 
               OR Ciclo_Cal_Sec < 0
               OR Bolson_Sec < 0
               OR Atencion_Final_Sec < 0
        """).fetchone()[0]
        self.assertEqual(anomalies, 0, f"Se detectaron {anomalies} casos con tiempos negativos.")

    def test_05_chronological_ordering_integrity(self):
        """La fecha de finalización jamás puede preceder a la fecha de creación."""
        anomalies = self.con.execute("""
            SELECT COUNT(*) 
            FROM maestro_expedientes 
            WHERE FechaFinaliza IS NOT NULL 
              AND FechaCreacion > FechaFinaliza
        """).fetchone()[0]
        self.assertEqual(anomalies, 0, f"Se detectaron {anomalies} casos con FechaCreacion posterior a FechaFinaliza.")

    # -------------------------------------------------------------
    # 3. CONTRATO DE DATOS Y CALIDAD DE IDENTIFICADORES (NIT Y NOGESTIÓN)
    # -------------------------------------------------------------
    def test_06_nit_modulo_11_syntax_compliance(self):
        """Todos los NITs deben ser dígitos limpios con dígito verificador opcional 'K' (Módulo 11 SAT)."""
        import re
        nits = self.con.execute("SELECT DISTINCT NIT FROM maestro_expedientes").fetchall()
        nit_pattern = re.compile(r'^\d+[K]?$')
        invalid_nits = [n[0] for n in nits if not nit_pattern.match(n[0])]
        self.assertEqual(len(invalid_nits), 0, f"NITs inválidos detectados: {invalid_nits[:10]}")

    def test_07_no_nulls_in_mandatory_dimensions(self):
        """Columnas mandatorias deben tener 0 nulos y 0 strings vacíos."""
        null_counts = self.con.execute("""
            SELECT 
                COUNT(CASE WHEN NoGestion IS NULL OR TRIM(NoGestion) = '' THEN 1 END),
                COUNT(CASE WHEN NIT IS NULL OR TRIM(NIT) = '' THEN 1 END),
                COUNT(CASE WHEN Estado IS NULL OR TRIM(Estado) = '' THEN 1 END),
                COUNT(CASE WHEN FechaCreacion IS NULL THEN 1 END),
                COUNT(CASE WHEN Region IS NULL OR TRIM(Region) = '' THEN 1 END)
            FROM maestro_expedientes
        """).fetchone()
        self.assertEqual(sum(null_counts), 0, f"Se encontraron nulos en columnas obligatorias: {null_counts}")

    def test_08_no_duplicate_case_keys_in_master(self):
        """NoGestion debe ser una clave primaria estricta (unicidad 100%)."""
        total_rows = self.con.execute("SELECT COUNT(*) FROM maestro_expedientes").fetchone()[0]
        distinct_keys = self.con.execute("SELECT COUNT(DISTINCT NoGestion) FROM maestro_expedientes").fetchone()[0]
        self.assertEqual(total_rows, distinct_keys, f"Duplicidad de claves: {total_rows} filas vs {distinct_keys} llaves únicas.")

    # -------------------------------------------------------------
    # 4. INTEGRIDAD REFERENCIAL MAESTRO <-> DETALLE
    # -------------------------------------------------------------
    def test_09_zero_orphan_events_in_detail(self):
        """Todo evento en detalle_eventos debe pertenecer a un expediente en maestro_expedientes."""
        orphans = self.con.execute("""
            SELECT COUNT(*) 
            FROM detalle_eventos d
            LEFT JOIN maestro_expedientes m ON d.NoGestion = m.NoGestion
            WHERE m.NoGestion IS NULL
        """).fetchone()[0]
        self.assertEqual(orphans, 0, f"Se encontraron {orphans} eventos huérfanos sin expediente maestro.")

    def test_10_detail_case_universe_equals_master(self):
        """El universo de expedientes en el detalle debe coincidir exactamente con el maestro."""
        det_cases = self.con.execute("SELECT COUNT(DISTINCT NoGestion) FROM detalle_eventos").fetchone()[0]
        mst_cases = self.con.execute("SELECT COUNT(*) FROM maestro_expedientes").fetchone()[0]
        self.assertEqual(det_cases, mst_cases, f"Inconsistencia de universo: {det_cases} en Detalle != {mst_cases} en Maestro.")

    # -------------------------------------------------------------
    # 5. COBERTURA TOTAL DEL HASH PARTITIONING (256 BUCKETS)
    # -------------------------------------------------------------
    def test_11_hash_partitions_256_buckets_complete(self):
        """Deben existir exactamente 256 particiones hash de 00 a ff."""
        expected_buckets = [f"{i:02x}" for i in range(256)]
        actual_files = glob.glob(os.path.join(self.partition_dir, "*.json"))
        actual_buckets = [os.path.splitext(os.path.basename(f))[0].lower() for f in actual_files]
        self.assertEqual(len(actual_files), 256, f"Faltan particiones hash: {len(actual_files)} / 256")
        self.assertEqual(sorted(expected_buckets), sorted(actual_buckets), "Los identificadores de bucket hash difieren de 00-ff.")

    def test_12_hash_partition_case_count_invariance(self):
        """La suma de expedientes en todos los 256 archivos hash debe ser exactamente 182,412."""
        actual_files = glob.glob(os.path.join(self.partition_dir, "*.json"))
        total_in_partitions = 0
        for f in actual_files:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                total_in_partitions += len(data)
        mst_cases = self.con.execute("SELECT COUNT(*) FROM maestro_expedientes").fetchone()[0]
        self.assertEqual(total_in_partitions, mst_cases, f"Discrepancia en particiones: {total_in_partitions} != {mst_cases}")

    # -------------------------------------------------------------
    # 6. CONCORDANCIA MATEMÁTICA CUBO OLAP VS DUCKDB
    # -------------------------------------------------------------
    def test_13_olap_cube_totals_match_duckdb_master(self):
        """Las sumas del cubo OLAP deben ser idénticas al maestro en DuckDB."""
        idx_casos = self.cubo["cols"].index("Casos")
        idx_aprob = self.cubo["cols"].index("Aprobadas")
        idx_ftr = self.cubo["cols"].index("AprobDirectas")
        idx_rech_def = self.cubo["cols"].index("RechDefinitivos")

        cubo_casos = sum(r[idx_casos] for r in self.cubo["rows"])
        cubo_aprob = sum(r[idx_aprob] for r in self.cubo["rows"])
        cubo_ftr = sum(r[idx_ftr] for r in self.cubo["rows"])
        cubo_rech_def = sum(r[idx_rech_def] for r in self.cubo["rows"])

        row_db = self.con.execute("""
            SELECT 
                COUNT(*), 
                SUM(Es_Aprobada), 
                SUM(Aprobada_Directa), 
                SUM(Rechazo_Definitivo) 
            FROM maestro_expedientes
        """).fetchone()

        self.assertEqual(cubo_casos, row_db[0], f"Casos: Cubo ({cubo_casos}) != DB ({row_db[0]})")
        self.assertEqual(cubo_aprob, row_db[1], f"Aprobadas: Cubo ({cubo_aprob}) != DB ({row_db[1]})")
        self.assertEqual(cubo_ftr, row_db[2], f"FTR: Cubo ({cubo_ftr}) != DB ({row_db[2]})")
        self.assertEqual(cubo_rech_def, row_db[3], f"Rechazos Definitivos: Cubo ({cubo_rech_def}) != DB ({row_db[3]})")

    def test_14_weighted_averages_convergence(self):
        """El promedio ponderado de lead time en el cubo debe coincidir con DuckDB (< 0.01h)."""
        idx_sum_sec = self.cubo["cols"].index("Suma_Ciclo_Hab_Sec")
        idx_n_sec = self.cubo["cols"].index("N_Ciclo_Hab")

        total_sec = sum(r[idx_sum_sec] for r in self.cubo["rows"])
        total_n = sum(r[idx_n_sec] for r in self.cubo["rows"])
        avg_cubo_hours = (total_sec / total_n) / 3600.0

        avg_db_hours = self.con.execute("""
            SELECT SUM(Ciclo_Hab_Sec) / SUM(N_Ciclo_Hab) / 3600.0 
            FROM maestro_expedientes 
            WHERE N_Ciclo_Hab > 0
        """).fetchone()[0]

        diff = abs(avg_cubo_hours - avg_db_hours)
        self.assertLess(diff, 0.001, f"Divergencia en promedio ponderado: Cubo={avg_cubo_hours:.4f}h vs DB={avg_db_hours:.4f}h (diff={diff})")

if __name__ == "__main__":
    unittest.main(verbosity=2)
