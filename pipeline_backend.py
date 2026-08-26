"""
Pipeline Backend Integral:
1. Ingesta a Parquet (data/raw_tramites.parquet) y DuckDB (data/sat_tramites.duckdb).
2. Aplicación del Calendario Oficial de Feriados y Asuetos de SAT Guatemala (2024-2026).
3. Cálculo Vectorizado en C/Numpy con np.busday_count(holidays=SAT_HOLIDAYS).
4. Generación de cubo_compacto.json y versión comprimida.
"""

import os
import glob
import json
import time
import gzip
import pandas as pd
import numpy as np
from python_calamine import CalamineWorkbook
import pyarrow as pa
import pyarrow.parquet as pq
import duckdb

# ==============================================================================
# CALENDARIO OFICIAL DE FERIADOS NACIONALES Y ASUETOS SAT GUATEMALA (2024-2026)
# ==============================================================================
SAT_GUATEMALA_HOLIDAYS = [
    # 2024
    '2024-01-01', # Año Nuevo
    '2024-03-27', # Miércoles Santo
    '2024-03-28', # Jueves Santo
    '2024-03-29', # Viernes Santo
    '2024-05-01', # Día del Trabajo
    '2024-06-30', # Día del Ejército
    '2024-07-01', # Traslado Ejército
    '2024-08-15', # Virgen de la Asunción
    '2024-09-03', # Aniversario SAT / Día del Trabajador Tributario
    '2024-09-15', # Independencia
    '2024-10-20', # Revolución
    '2024-11-01', # Todos los Santos
    '2024-12-24', # Nochebuena
    '2024-12-25', # Navidad
    '2024-12-31', # Fin de Año

    # 2025
    '2025-01-01', # Año Nuevo
    '2025-04-16', # Miércoles Santo
    '2025-04-17', # Jueves Santo
    '2025-04-18', # Viernes Santo
    '2025-05-01', # Día del Trabajo
    '2025-06-30', # Día del Ejército
    '2025-08-15', # Virgen de la Asunción
    '2025-09-03', # Aniversario SAT / Día del Trabajador Tributario
    '2025-09-15', # Independencia
    '2025-10-20', # Revolución
    '2025-11-01', # Todos los Santos
    '2025-12-24', # Nochebuena
    '2025-12-25', # Navidad
    '2025-12-31', # Fin de Año

    # 2026
    '2026-01-01', # Año Nuevo
    '2026-04-01', # Miércoles Santo
    '2026-04-02', # Jueves Santo
    '2026-04-03', # Viernes Santo
    '2026-05-01', # Día del Trabajo
    '2026-06-30', # Día del Ejército
    '2026-08-15', # Virgen de la Asunción
    '2026-09-03', # Aniversario SAT / Día del Trabajador Tributario
    '2026-09-15', # Independencia
    '2026-10-20', # Revolución
    '2026-11-01', # Todos los Santos
    '2026-12-24', # Nochebuena
    '2026-12-25', # Navidad
    '2026-12-31', # Fin de Año
]

NP_HOLIDAYS = np.array(SAT_GUATEMALA_HOLIDAYS, dtype='datetime64[D]')

def convert_excel_to_parquet(data_dir, output_parquet):
    print("=" * 70)
    print("1. INGESTA Y CONVERSIÓN A PARQUET / DUCKDB")
    print("=" * 70)
    t0 = time.time()
    files = sorted(glob.glob(os.path.join(data_dir, "reporteAV_*.xlsx")))
    if not files:
        raise FileNotFoundError("No se encontraron archivos Excel en " + data_dir)
    
    all_dfs = []
    col_names = [
        "NoGestion", "NIT", "Contribuyente", "Gestion", "Region", "Agencia",
        "FechaCreacion", "FechaAsignacion", "FechaRevision", "U1",
        "FechaFinaliza", "U2", "FechaRechazo", "U3", "MotivoRechazo",
        "Total", "Estado", "Observaciones"
    ]
    
    for idx, f in enumerate(files, 1):
        wb = CalamineWorkbook.from_path(f)
        sheet_data = wb.get_sheet_by_index(0).to_python()
        rows = sheet_data[1:]
        clean_rows = []
        for r in rows:
            if len(r) >= 18:
                clean_rows.append(r[:18])
            else:
                clean_rows.append(r + [None] * (18 - len(r)))
        df_part = pd.DataFrame(clean_rows, columns=col_names)
        all_dfs.append(df_part)
        print(f"  [{idx:02d}/{len(files):02d}] {os.path.basename(f)} -> {len(df_part):,} filas")
        
    df_full = pd.concat(all_dfs, ignore_index=True)
    
    for col in ["FechaCreacion", "FechaAsignacion", "FechaRevision", "FechaFinaliza", "FechaRechazo"]:
        df_full[col] = pd.to_datetime(df_full[col], errors='coerce')
        
    for col in ["NoGestion", "NIT", "Contribuyente", "Gestion", "Region", "Agencia", "U1", "U2", "U3", "MotivoRechazo", "Estado", "Observaciones"]:
        df_full[col] = df_full[col].fillna('').astype(str).str.strip()

    df_full.to_parquet(output_parquet, engine='pyarrow', compression='snappy', index=False)
    print(f"\n[OK] Parquet unificado guardado: {output_parquet} ({len(df_full):,} filas en {time.time()-t0:.2f}s)")
    
    duckdb_path = output_parquet.replace('.parquet', '.duckdb')
    con = duckdb.connect(duckdb_path)
    con.execute("CREATE OR REPLACE TABLE tramites AS SELECT * FROM df_full")
    con.close()
    print(f"[OK] Base embebida DuckDB guardada: {duckdb_path}")
    return df_full

def compute_business_seconds_fast(s_series, e_series, holidays=NP_HOLIDAYS):
    valid_mask = s_series.notna() & e_series.notna() & (e_series >= s_series)
    out = np.zeros(len(s_series), dtype=np.float64)
    if not valid_mask.any():
        return out
        
    s_valid = s_series[valid_mask]
    e_valid = e_series[valid_mask]
    
    s_dt = s_valid.values.astype('datetime64[s]')
    e_dt = e_valid.values.astype('datetime64[s]')
    
    s_dates = s_dt.astype('datetime64[D]')
    e_dates = e_dt.astype('datetime64[D]')
    
    s_day_secs = (s_dt - s_dates.astype('datetime64[s]')).astype(np.int64)
    e_day_secs = (e_dt - e_dates.astype('datetime64[s]')).astype(np.int64)
    
    s_clamped = np.clip(s_day_secs, 28800, 57600)
    e_clamped = np.clip(e_day_secs, 28800, 57600)
    
    same_day = (s_dates == e_dates)
    is_busday_s = np.is_busday(s_dates, holidays=holidays)
    
    out_valid = np.zeros(len(s_valid), dtype=np.float64)
    
    # Mismo día
    m_same = same_day & is_busday_s
    out_valid[m_same] = np.maximum(0, e_clamped[m_same] - s_clamped[m_same])
    
    # Días distintos
    m_diff = ~same_day
    if m_diff.any():
        s_d_diff = s_dates[m_diff]
        e_d_diff = e_dates[m_diff]
        is_bus_s = is_busday_s[m_diff]
        is_bus_e = np.is_busday(e_d_diff, holidays=holidays)
        
        first_day_secs = np.where(is_bus_s, np.maximum(0, 57600 - s_clamped[m_diff]), 0)
        last_day_secs = np.where(is_bus_e, np.maximum(0, e_clamped[m_diff] - 28800), 0)
        
        full_days = np.busday_count(s_d_diff + np.timedelta64(1, 'D'), e_d_diff, holidays=holidays)
        intermediate_secs = full_days * 28800
        
        out_valid[m_diff] = first_day_secs + intermediate_secs + last_day_secs
        
    out[valid_mask.values] = out_valid
    return out

# Taxonomía Oficial Intacta
RAW_TAXONOMIA = [
    {"ID_Macro": "MAC-01", "Macro_Familia": "Fallas en Video y Declaración", "ID_Sub": "SUB-01", "Subcategoria": "Video: Audio Inaudible o Sin Sonido", "Keywords": ["AUDIO", "ESCUCHA", "INAUDIBLE", "SONIDO", "VOZ", "VOLUMEN", "OIR", "MUDO", "SILENCIO"]},
    {"ID_Macro": "MAC-01", "Macro_Familia": "Fallas en Video y Declaración", "ID_Sub": "SUB-02", "Subcategoria": "Video: Omisión de Fecha del Día", "Keywords": ["FECHA", "DIA", "HOY", "ANO", "MES", "INDICAR LA FECHA", "DICE LA FECHA", "MENCIONA LA FECHA"]},
    {"ID_Macro": "MAC-01", "Macro_Familia": "Fallas en Video y Declaración", "ID_Sub": "SUB-03", "Subcategoria": "Video: Omisión de Frase de Solicitud", "Keywords": ["FRASE", "DECLARACION", "SOLICITO", "PALABRAS", "TEXTO", "ORACION", "PRONUNCIAR", "LEER"]},
    {"ID_Macro": "MAC-01", "Macro_Familia": "Fallas en Video y Declaración", "ID_Sub": "SUB-04", "Subcategoria": "Video: Rostro Cubierto o Ilegible", "Keywords": ["ROSTRO", "CARA", "LENTES", "GORRA", "MASCARILLA", "CUBIERTO", "OSCURO", "BORROSO", "ILUMINACION", "SOMBRA"]},
    {"ID_Macro": "MAC-01", "Macro_Familia": "Fallas en Video y Declaración", "ID_Sub": "SUB-05", "Subcategoria": "Video: Lectura/Apoyo no Autorizado", "Keywords": ["TERCERA PERSONA", "ALGUIEN MAS", "ACOMPANADO", "SUSURRO", "LEER PAPEL", "PANTALLA", "DIRIGIDO"]},
    {"ID_Macro": "MAC-01", "Macro_Familia": "Fallas en Video y Declaración", "ID_Sub": "SUB-06", "Subcategoria": "Video: Archivo Dañado o Cortado", "Keywords": ["CORTO", "SE CORTA", "INCOMPLETO", "DURACION", "FORMATO", "DANO", "REPRODUCIR", "SUBIO MAL", "PESO", "ERROR AL CARGAR"]},
    {"ID_Macro": "MAC-02", "Macro_Familia": "Problemas de Documento de Identificación (DPI)", "ID_Sub": "SUB-07", "Subcategoria": "DPI: Imagen Borrosa o Ilegible", "Keywords": ["DPI BORROSO", "NO SE LEE", "ILEGIBLE", "DESENFOCADO", "PIXELADO", "CALIDAD", "CLARO", "DISTORSION"]},
    {"ID_Macro": "MAC-02", "Macro_Familia": "Problemas de Documento de Identificación (DPI)", "ID_Sub": "SUB-08", "Subcategoria": "DPI: Reflejos de Luz o Flash", "Keywords": ["REFLEJO", "FLASH", "LUZ", "BRILLO", "DESTILLO", "ENCANDILA", "TAPA"]},
    {"ID_Macro": "MAC-02", "Macro_Familia": "Problemas de Documento de Identificación (DPI)", "ID_Sub": "SUB-09", "Subcategoria": "DPI: Imagen Recortada o Incompleta", "Keywords": ["RECORTADO", "CORTADO", "BORDES", "ESQUINAS", "NO COMPLETO", "PARCIAL", "MARGENES", "FALTA LADO"]},
    {"ID_Macro": "MAC-02", "Macro_Familia": "Problemas de Documento de Identificación (DPI)", "ID_Sub": "SUB-10", "Subcategoria": "DPI: Fotocopia en lugar de Original", "Keywords": ["FOTOCOPIA", "COPIA", "NO ORIGINAL", "BLANCO Y NEGRO", "SCANNER COPIA", "IMPRESION"]},
    {"ID_Macro": "MAC-02", "Macro_Familia": "Problemas de Documento de Identificación (DPI)", "ID_Sub": "SUB-11", "Subcategoria": "DPI: Falta Reverso / Ambos Lados", "Keywords": ["REVERSO", "ATRAS", "AMBOS LADOS", "LADO B", "POSTERIOR", "FALTA LA OTRA CARA"]},
    {"ID_Macro": "MAC-02", "Macro_Familia": "Problemas de Documento de Identificación (DPI)", "ID_Sub": "SUB-12", "Subcategoria": "DPI: Vencido o No Vigente", "Keywords": ["VENCIDO", "CADUCADO", "VIGENCIA", "RENOVAR", "NO VIGENTE", "EXPIRADO"]},
    {"ID_Macro": "MAC-03", "Macro_Familia": "Fallas de Correo Electrónico", "ID_Sub": "SUB-13", "Subcategoria": "Correo: Ya Vinculado a Otro NIT", "Keywords": ["VINCULADO", "ASOCIADO", "REGISTRADO", "OTRO NIT", "YA EXISTE", "EN USO", "DUPLICADO", "PERTENECE A OTRO"]},
    {"ID_Macro": "MAC-03", "Macro_Familia": "Fallas de Correo Electrónico", "ID_Sub": "SUB-14", "Subcategoria": "Correo: Dominio Inválido o Error de Sintaxis", "Keywords": ["DOMINIO", "SINTAXIS", "ARROBA", "COM", "ESPACIOS", "CARACTERES", "MAL ESCRITO", "FORMATO CORREO", "GMAIL", "HOTMAIL"]},
    {"ID_Macro": "MAC-03", "Macro_Familia": "Fallas de Correo Electrónico", "ID_Sub": "SUB-15", "Subcategoria": "Correo: No Coincide con Solicitud", "Keywords": ["NO COINCIDE", "DIFERENTE", "DISTINTO", "CORREO INDICADO", "FORMULARIO"]},
    {"ID_Macro": "MAC-04", "Macro_Familia": "Incongruencia de Datos Personales", "ID_Sub": "SUB-16", "Subcategoria": "Datos: Nombre No Coincide con RENAP", "Keywords": ["NOMBRE", "APELLIDO", "RENAP", "PADRON", "REGISTRO", "CASADA", "LETRAS", "DIFERENCIA"]},
    {"ID_Macro": "MAC-04", "Macro_Familia": "Incongruencia de Datos Personales", "ID_Sub": "SUB-17", "Subcategoria": "Datos: CUI/DPI Incorrecto o Inexistente", "Keywords": ["CUI", "NUMERO DE DPI", "CODIGO UNICO", "DIGITOS", "INEXISTENTE", "NO COINCIDE CUI"]},
    {"ID_Macro": "MAC-04", "Macro_Familia": "Incongruencia de Datos Personales", "ID_Sub": "SUB-18", "Subcategoria": "Datos: Fecha de Nacimiento Errónea", "Keywords": ["NACIMIENTO", "FECHA DE NACIMIENTO", "EDAD", "FECHA INCORRECTA"]},
    {"ID_Macro": "MAC-04", "Macro_Familia": "Incongruencia de Datos Personales", "ID_Sub": "SUB-19", "Subcategoria": "Datos: NIT Inexistente o Inválido", "Keywords": ["NIT", "NUMERO TRIBUTARIO", "DIGITO VERIFICADOR", "NO REGISTRADO"]},
    {"ID_Macro": "MAC-05", "Macro_Familia": "Documentación Complementaria", "ID_Sub": "SUB-20", "Subcategoria": "Doc: Falta Nombramiento / Rep. Legal", "Keywords": ["NOMBRAMIENTO", "REPRESENTANTE", "REPRESENTACION", "ACTA", "MANDATO", "PODER", "GERENTE", "ADMINISTRADOR"]},
    {"ID_Macro": "MAC-05", "Macro_Familia": "Documentación Complementaria", "ID_Sub": "SUB-21", "Subcategoria": "Doc: Nombramiento Vencido / No Razonado", "Keywords": ["NOMBRAMIENTO VENCIDO", "RAZON", "REGISTRO MERCANTIL", "INSCRIPCION", "VIGENCIA PODER"]},
    {"ID_Macro": "MAC-05", "Macro_Familia": "Documentación Complementaria", "ID_Sub": "SUB-22", "Subcategoria": "Doc: Falta Factura / Recibo de Servicios", "Keywords": ["FACTURA", "RECIBO", "LUZ", "AGUA", "TELEFONO", "DIRECCION", "UBICACION", "ESTABLECIMIENTO"]},
    {"ID_Macro": "MAC-05", "Macro_Familia": "Documentación Complementaria", "ID_Sub": "SUB-23", "Subcategoria": "Doc: Documento Adicional Ilegible", "Keywords": ["DOCUMENTO ADICIONAL", "ADJUNTO", "NO LEGIBLE", "ILEGIBLE", "BORROSO"]},
    {"ID_Macro": "MAC-06", "Macro_Familia": "Validaciones del Sistema", "ID_Sub": "SUB-24", "Subcategoria": "Sistema: Solicitud Duplicada en Trámite", "Keywords": ["DUPLICADA", "YA TIENE UNA GESTION", "EN TRAMITE", "EN PROCESO", "SIMULTANEA", "SOLICITUD PREVIA"]},
    {"ID_Macro": "MAC-06", "Macro_Familia": "Validaciones del Sistema", "ID_Sub": "SUB-25", "Subcategoria": "Sistema: Contribuyente Fallecido", "Keywords": ["FALLECIDO", "DEFUNCION", "MUERTE", "HEREDEROS", "MORTUAL"]},
    {"ID_Macro": "MAC-06", "Macro_Familia": "Validaciones del Sistema", "ID_Sub": "SUB-26", "Subcategoria": "Sistema: Bloqueo Administrativo / Fiscal", "Keywords": ["BLOQUEADO", "BLOQUEO", "OMISO", "INFRACCION", "ADMINISTRATIVO", "INVESTIGACION", "EXPEDIENTE JUDICIAL"]}
]

import unicodedata

def normalizar_rapido(s):
    if not s: return ""
    s_clean = unicodedata.normalize('NFKD', str(s)).encode('ASCII', 'ignore').decode('utf-8')
    return s_clean.upper()

def clasificar_motivos(motivos_unicos):
    cat_map = {}
    for m in motivos_unicos:
        if not m or m in ['-', 'NONE', 'NAN', ' ']:
            cat_map[m] = ("Sin Rechazo", "SUB-00")
            continue
        norm = normalizar_rapido(m)
        matched = False
        for item in RAW_TAXONOMIA:
            for kw in item["Keywords"]:
                if kw in norm:
                    cat_map[m] = (item["Macro_Familia"], item["ID_Sub"])
                    matched = True
                    break
            if matched:
                break
        if not matched:
            cat_map[m] = ("Validaciones del Sistema", "SUB-26")
    return cat_map

def main():
    data_dir = r"C:\Users\busqu\Documents\GitHub\Metrica AV Y RTU\Data"
    output_parquet = r"C:\Users\busqu\Documents\GitHub\Metrica AV Y RTU\data\raw_tramites.parquet"
    os.makedirs(os.path.dirname(output_parquet), exist_ok=True)
    
    # 1. Ingesta a Parquet
    if not os.path.exists(output_parquet):
        df = convert_excel_to_parquet(data_dir, output_parquet)
    else:
        print(f"Cargando Parquet existente desde {output_parquet}...")
        t0 = time.time()
        df = pd.read_parquet(output_parquet)
        print(f"[OK] {len(df):,} filas cargadas desde Parquet en {time.time()-t0:.2f}s (Cero Descompresión XML)")

    # 2. Normalización de Campos
    print("\n2. NORMALIZACIÓN Y PREPARACIÓN")
    t0 = time.time()
    df["Mes"] = df["FechaCreacion"].dt.strftime('%Y-%m')
    df["Anio"] = df["FechaCreacion"].dt.year.fillna(0).astype(int).astype(str)
    
    df["Gestion"] = df["Gestion"].str.upper()
    df["Region"] = df["Region"].str.upper()
    valid_regs = {'CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'}
    df["Region"] = df["Region"].apply(lambda x: x if x in valid_regs else 'CENTRAL')
    
    df["Estado"] = df["Estado"].str.upper()
    df["U1"] = df["U1"].fillna('SIN_OPERADOR').replace({'': 'SIN_OPERADOR'})

    # Clasificación de Tipo de Persona (Persona Individual / Natural vs Persona Jurídica / Sociedades)
    pattern_juridica = (
        r'(?i)\b(S\.?\s*A\.?|SOCIEDAD|SOCIEDADES|S\.?\s*C\.?|S\.?\s*EN\s*C\.?|LTDA|LIMITADA|'
        r'ASOCIACI[OÓ]N|ASOCIACIN|ASOC|FUNDACI[OÓ]N|FUNDACIN|COOPERATIVA|R\.?\s*L\.?|'
        r'IGLESIA|CONDOMINIO|ENTIDAD|CORPORACI[OÓ]N|INVERSIONES|COMERCIAL|DISTRIBUIDORA|'
        r'CONSORCIO|COMPA[NÑ][IÍ]A|SERVICIOS\s+INTEGRALES|TRANSPORTES|CIA\.?|CORP)\b'
    )
    df["TipoPersona"] = np.where(df["NIT"].astype(str).str.contains(pattern_juridica, regex=True), 'JURIDICA', 'INDIVIDUAL')
    print(f"  [OK] Tipo de Persona clasificado: {len(df[df['TipoPersona']=='JURIDICA']):,} Jurídicas / Sociedades, {len(df[df['TipoPersona']=='INDIVIDUAL']):,} Individuales")
    
    # 3. Clasificación de Rechazos
    print("\n3. CLASIFICACIÓN TAXONÓMICA")
    motivos_unicos = df["MotivoRechazo"].unique()
    cat_map = clasificar_motivos(motivos_unicos)
    
    macro_list = [cat_map[m][0] for m in df["MotivoRechazo"]]
    subcat_list = [cat_map[m][1] for m in df["MotivoRechazo"]]
    df["MacroFamilia"] = macro_list
    df["ID_Subcategoria"] = subcat_list
    print(f"[OK] {len(motivos_unicos):,} motivos únicos clasificados en {time.time()-t0:.2f}s")
    
    # 4. Cálculo Vectorizado de Horas Hábiles con Feriados SAT
    print("\n4. CÁLCULO VECTORIZADO EN C/NUMPY CON FERIADOS SAT GUATEMALA")
    t0 = time.time()
    df["Buzon_Hab_Sec"] = compute_business_seconds_fast(df["FechaCreacion"], df["FechaAsignacion"])
    df["Ciclo_Hab_Sec"] = compute_business_seconds_fast(df["FechaCreacion"], df["FechaFinaliza"])
    df["Creacion_Atencion_Hab_Sec"] = compute_business_seconds_fast(df["FechaCreacion"], df["FechaRevision"])
    
    # Calendario
    df["Buzon_Cal_Sec"] = np.maximum(0, (df["FechaAsignacion"] - df["FechaCreacion"]).dt.total_seconds().fillna(0).values)
    df["Ciclo_Cal_Sec"] = np.maximum(0, (df["FechaFinaliza"] - df["FechaCreacion"]).dt.total_seconds().fillna(0).values)
    df["Bolson_Sec"] = np.maximum(0, (df["FechaRevision"] - df["FechaAsignacion"]).dt.total_seconds().fillna(0).values)
    df["Atencion_Final_Sec"] = np.maximum(0, (df["FechaFinaliza"] - df["FechaRevision"]).dt.total_seconds().fillna(0).values)
    df["Atencion_Rechazo_Sec"] = np.maximum(0, (df["FechaRechazo"] - df["FechaRevision"]).dt.total_seconds().fillna(0).values)
    
    # Rango Velocidad
    conds = [
        df["Atencion_Final_Sec"] <= 2,
        (df["Atencion_Final_Sec"] > 2) & (df["Atencion_Final_Sec"] <= 5),
        (df["Atencion_Final_Sec"] > 5) & (df["Atencion_Final_Sec"] <= 15),
        (df["Atencion_Final_Sec"] > 15) & (df["Atencion_Final_Sec"] <= 60),
        (df["Atencion_Final_Sec"] > 60) & (df["Atencion_Final_Sec"] <= 300),
        df["Atencion_Final_Sec"] > 300
    ]
    choices = ['<=2s', '2-5s', '5-15s', '15-60s', '1-5m', '>5m']
    df["Rango_Velocidad"] = np.select(conds, choices, default='<=2s')
    
    # Rondas
    df["Ronda_Revision"] = np.where(df["FechaRechazo"].isna(), '1RA_DIRECTA', '2DA_SUBSANADA')
    
    # Flags
    df["Aprobada_Directa"] = ((df["Estado"] == 'APROBADA') & (df["Ronda_Revision"] == '1RA_DIRECTA')).astype(int)
    df["Aprobada_Subsanada"] = ((df["Estado"] == 'APROBADA') & (df["Ronda_Revision"] == '2DA_SUBSANADA')).astype(int)
    df["Rechazo_Definitivo"] = (df["Estado"].str.startswith('CANCELADA')).astype(int)
    df["Es_Rechazo"] = df["FechaRechazo"].notna().astype(int)
    df["Es_Aprobada"] = (df["Estado"] == 'APROBADA').astype(int)
    df["Es_Finalizada"] = (df["Estado"] == 'FINALIZADA').astype(int)
    df["Es_NoConfirmada"] = (df["Estado"] == 'NO CONFIRMADA').astype(int)
    df["Es_Cancelada"] = (df["Estado"].str.contains('CANCELADA')).astype(int)
    
    # SLAs
    df["SLA_8h"] = ((df["Ciclo_Hab_Sec"] > 0) & (df["Ciclo_Hab_Sec"] <= 28800)).astype(int)
    df["SLA_16h"] = ((df["Ciclo_Hab_Sec"] > 28800) & (df["Ciclo_Hab_Sec"] <= 57600)).astype(int)
    df["SLA_24h"] = ((df["Ciclo_Hab_Sec"] > 57600) & (df["Ciclo_Hab_Sec"] <= 86400)).astype(int)
    df["SLA_40h"] = ((df["Ciclo_Hab_Sec"] > 86400) & (df["Ciclo_Hab_Sec"] <= 144000)).astype(int)
    df["Fuera_SLA_40h"] = (df["Ciclo_Hab_Sec"] > 144000).astype(int)
    
    df["N_Buzon_Hab"] = (df["Buzon_Hab_Sec"] > 0).astype(int)
    df["N_Buzon_Cal"] = (df["Buzon_Cal_Sec"] > 0).astype(int)
    df["N_Bolson"] = (df["Bolson_Sec"] > 0).astype(int)
    df["N_Atencion_Final"] = (df["Atencion_Final_Sec"] > 0).astype(int)
    df["N_Atencion_Rechazo"] = (df["Atencion_Rechazo_Sec"] > 0).astype(int)
    df["N_Creacion_Atencion_Hab"] = (df["Creacion_Atencion_Hab_Sec"] > 0).astype(int)
    df["N_Ciclo_Hab"] = (df["Ciclo_Hab_Sec"] > 0).astype(int)
    df["N_Ciclo_Cal"] = (df["Ciclo_Cal_Sec"] > 0).astype(int)
    print(f"[OK] Métricas vectorizadas calculadas en {time.time()-t0:.2f}s")
    
    # 5. Agregación OLAP
    print("\n5. AGREGACIÓN MULTIDIMENSIONAL OLAP")
    t0 = time.time()
    group_cols = ['Mes', 'Anio', 'Gestion', 'Region', 'Estado', 'MacroFamilia', 'ID_Subcategoria', 'U1', 'Rango_Velocidad', 'Ronda_Revision', 'TipoPersona']
    
    agg_dict = {
        'NoGestion': 'count',
        'Es_Rechazo': 'sum',
        'Es_Aprobada': 'sum',
        'Es_Finalizada': 'sum',
        'Es_NoConfirmada': 'sum',
        'Es_Cancelada': 'sum',
        'Aprobada_Directa': 'sum',
        'Aprobada_Subsanada': 'sum',
        'Rechazo_Definitivo': 'sum',
        'Buzon_Hab_Sec': 'sum',
        'N_Buzon_Hab': 'sum',
        'Buzon_Cal_Sec': 'sum',
        'N_Buzon_Cal': 'sum',
        'Bolson_Sec': 'sum',
        'N_Bolson': 'sum',
        'Atencion_Final_Sec': 'sum',
        'N_Atencion_Final': 'sum',
        'Atencion_Rechazo_Sec': 'sum',
        'N_Atencion_Rechazo': 'sum',
        'Creacion_Atencion_Hab_Sec': 'sum',
        'N_Creacion_Atencion_Hab': 'sum',
        'Ciclo_Hab_Sec': 'sum',
        'N_Ciclo_Hab': 'sum',
        'Ciclo_Cal_Sec': 'sum',
        'N_Ciclo_Cal': 'sum',
        'SLA_8h': 'sum',
        'SLA_16h': 'sum',
        'SLA_24h': 'sum',
        'SLA_40h': 'sum',
        'Fuera_SLA_40h': 'sum'
    }
    
    cubo_df = df.groupby(group_cols, as_index=False).agg(agg_dict)
    
    cubo_cols = [
        "Mes", "Anio", "Gestion", "Region", "Estado", "MacroFamilia", "ID_Subcategoria", "U1", "Rango_Velocidad", "Ronda_Revision", "TipoPersona",
        "Casos", "Rechazos", "Aprobadas", "Finalizadas", "NoConfirmadas", "Canceladas",
        "AprobDirectas", "AprobSubsanadas", "RechDefinitivos",
        "Suma_Buzon_Hab_Sec", "N_Buzon_Hab", "Suma_Buzon_Cal_Sec", "N_Buzon_Cal",
        "Suma_Bolson_Sec", "N_Bolson", "Suma_Atencion_Final_Sec", "N_Atencion_Final",
        "Suma_Atencion_Rechazo_Sec", "N_Atencion_Rechazo",
        "Suma_Creacion_Atencion_Hab_Sec", "N_Creacion_Atencion_Hab",
        "Suma_Ciclo_Hab_Sec", "N_Ciclo_Hab", "Suma_Ciclo_Cal_Sec", "N_Ciclo_Cal",
        "SLA_8h", "SLA_16h", "SLA_24h", "SLA_40h", "Fuera_SLA_40h"
    ]
    cubo_df.columns = cubo_cols
    print(f"[OK] Cubo OLAP compactado: {len(cubo_df):,} celdas agregadas en {time.time()-t0:.2f}s")
    
    # 6. Serialización JSON y Gzip
    meses_sorted = sorted([m for m in df["Mes"].unique() if m and m != 'NaT'])
    anios_sorted = sorted([a for a in df["Anio"].unique() if a and a != '0'])
    gestiones_sorted = sorted([g for g in df["Gestion"].unique() if g])
    regiones_sorted = ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE']
    estados_sorted = sorted([e for e in df["Estado"].unique() if e])
    macros_sorted = sorted([m for m in df["MacroFamilia"].unique() if m])
    
    opciones = {
        "meses": meses_sorted,
        "anios": anios_sorted,
        "gestiones": gestiones_sorted,
        "regiones": regiones_sorted,
        "estados": estados_sorted,
        "macro_familias": macros_sorted,
        "tipos_persona": ["TODAS", "INDIVIDUAL", "JURIDICA"]
    }
    
    tax_export = [{"ID_Macro": item["ID_Macro"], "Macro_Familia": item["Macro_Familia"], "ID_Sub": item["ID_Sub"], "Subcategoria": item["Subcategoria"]} for item in RAW_TAXONOMIA]
    
    top_ops = df[df["U1"].notna() & ~df["U1"].isin(['AP_MS_SAT_EN_LINEA', 'SIN_OPERADOR'])]["U1"].value_counts().head(20).to_dict()
    ranking_operadores = [{"operador": op, "casos": cnt} for op, cnt in top_ops.items()]
    
    muestral_cols = ["NoGestion", "NIT", "Gestion", "Region", "FechaCreacion", "FechaFinaliza", "U1", "Estado", "MotivoRechazo", "MacroFamilia", "TipoPersona"]
    muestra_500 = df[muestral_cols].sample(min(500, len(df)), random_state=42).copy()
    muestra_500["FechaCreacion"] = muestra_500["FechaCreacion"].dt.strftime('%Y-%m-%d %H:%M:%S').fillna('')
    muestra_500["FechaFinaliza"] = muestra_500["FechaFinaliza"].dt.strftime('%Y-%m-%d %H:%M:%S').fillna('')
    dataset_muestral_500 = muestra_500.to_dict(orient='records')
    
    # 5B. Capacidad Diaria y Métricas de Productividad por Revisor (Jornada 8h)
    print("  Calculando capacidad diaria de operadores en jornada 8h...")
    con = duckdb.connect()
    con.execute("CREATE OR REPLACE TABLE tramites_mem AS SELECT * FROM df")
    
    op_cap_query = """
    WITH base AS (
        SELECT 
            Region,
            CAST(Anio AS VARCHAR) AS Anio,
            strftime(COALESCE(FechaFinaliza, FechaRechazo, FechaRevision), '%Y-%m-%d') AS Dia,
            U1 AS Revisor,
            Estado,
            EXTRACT(dow FROM COALESCE(FechaFinaliza, FechaRechazo, FechaRevision)) AS dow,
            EXTRACT(hour FROM COALESCE(FechaFinaliza, FechaRechazo, FechaRevision)) AS hr
        FROM tramites_mem
        WHERE U1 NOT IN ('AP_MS_SAT_EN_LINEA', 'NO_ASIGNADO', 'SIN_OPERADOR', '', 'None', 'nan')
          AND Gestion != 'REINICIO DE CONTRASEÑA'
    ),
    jornada_8h AS (
        SELECT * FROM base
        WHERE dow BETWEEN 1 AND 5
          AND hr BETWEEN 8 AND 15
    ),
    dia_counts AS (
        SELECT 
            Region,
            Anio,
            Revisor,
            Dia,
            COUNT(*) as Casos_Dia
        FROM jornada_8h
        GROUP BY Region, Anio, Revisor, Dia
    ),
    agg_combos AS (
        -- Por Región y Año
        SELECT 
            Region,
            Anio,
            Revisor,
            SUM(Casos_Dia) as Total_8h,
            COUNT(DISTINCT Dia) as Dias_Activos,
            ROUND(AVG(Casos_Dia), 1) as Promedio_Diario,
            ROUND(MEDIAN(Casos_Dia), 1) as Mediana_Diaria,
            MAX(Casos_Dia) as Record_Dia
        FROM dia_counts
        GROUP BY Region, Anio, Revisor
        
        UNION ALL
        
        -- Por Región (Todos los Años)
        SELECT 
            Region,
            'TODOS' as Anio,
            Revisor,
            SUM(Casos_Dia) as Total_8h,
            COUNT(DISTINCT Dia) as Dias_Activos,
            ROUND(AVG(Casos_Dia), 1) as Promedio_Diario,
            ROUND(MEDIAN(Casos_Dia), 1) as Mediana_Diaria,
            MAX(Casos_Dia) as Record_Dia
        FROM dia_counts
        GROUP BY Region, Revisor

        UNION ALL
        
        -- Nacional por Año
        SELECT 
            'TODAS' as Region,
            Anio,
            Revisor,
            SUM(Casos_Dia) as Total_8h,
            COUNT(DISTINCT Dia) as Dias_Activos,
            ROUND(AVG(Casos_Dia), 1) as Promedio_Diario,
            ROUND(MEDIAN(Casos_Dia), 1) as Mediana_Diaria,
            MAX(Casos_Dia) as Record_Dia
        FROM dia_counts
        GROUP BY Anio, Revisor

        UNION ALL
        
        -- Nacional Global
        SELECT 
            'TODAS' as Region,
            'TODOS' as Anio,
            Revisor,
            SUM(Casos_Dia) as Total_8h,
            COUNT(DISTINCT Dia) as Dias_Activos,
            ROUND(AVG(Casos_Dia), 1) as Promedio_Diario,
            ROUND(MEDIAN(Casos_Dia), 1) as Mediana_Diaria,
            MAX(Casos_Dia) as Record_Dia
        FROM dia_counts
        GROUP BY Revisor
    )
    SELECT * FROM agg_combos ORDER BY Total_8h DESC;
    """
    df_op_cap = con.execute(op_cap_query).df()
    operadores_productividad_8h = df_op_cap.to_dict(orient='records')
    print(f"  [OK] {len(operadores_productividad_8h):,} métricas de capacidad diaria generadas.")

    cubo_dict = {
        "opciones": opciones,
        "taxonomia": tax_export,
        "ranking_operadores": ranking_operadores,
        "operadores_productividad_8h": operadores_productividad_8h,
        "dataset_muestral_500": dataset_muestral_500,
        "cols": cubo_cols,
        "rows": cubo_df.values.tolist()
    }
    
    output_json = r"C:\Users\busqu\Documents\GitHub\Metrica AV Y RTU\public\data\cubo_compacto.json"
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(cubo_dict, f, ensure_ascii=False)
        
    output_json_gz = output_json + ".gz"
    with gzip.open(output_json_gz, 'wb') as f_gz:
        f_gz.write(json.dumps(cubo_dict, ensure_ascii=False).encode('utf-8'))
        
    json_mb = os.path.getsize(output_json) / (1024 * 1024)
    gz_mb = os.path.getsize(output_json_gz) / (1024 * 1024)
    print(f"\n[OK] JSON escrito: {output_json} ({json_mb:.2f} MB)")
    print(f"[OK] GZIP escrito: {output_json_gz} ({gz_mb:.2f} MB - Reducción del {(1 - gz_mb/json_mb)*100:.1f}%)")
    print("=" * 70)
    print("PIPELINE BACKEND FINALIZADO CON ÉXITO")
    print("=" * 70)

if __name__ == '__main__':
    main()
