import { describe, it, expect } from 'vitest';
import { formatToHours, formatAdaptiveTime, processOlapFilters } from '../public/js/olap_engine.js';

describe('Motor OLAP: Formateador de Tiempo', () => {
    it('formatea 0 o valores nulos/negativos como 0.00 h', () => {
        expect(formatToHours(0)).toBe('0.00 h');
        expect(formatToHours(null)).toBe('0.00 h');
        expect(formatToHours(-50)).toBe('0.00 h');
    });

    it('formatea segundos (< 0.05 horas)', () => {
        expect(formatToHours(2.5)).toBe('0.0007 h (2.5 seg)');
    });

    it('formatea minutos (0.05 a 1.0 horas)', () => {
        expect(formatToHours(180)).toBe('0.05 h (3.0 min)');
        expect(formatToHours(1800)).toBe('0.50 h (30.0 min)');
    });

    it('formatea horas (>= 1.0 horas)', () => {
        expect(formatToHours(3600)).toBe('1.00 horas');
        expect(formatToHours(28800)).toBe('8.00 horas');
        expect(formatToHours(86400)).toBe('24.00 horas');
    });
});

describe('Motor OLAP: Filtrado y Agregación Multidimensional', () => {
    const mockCubo = [
        {
            Mes: '2026-01', Anio: '2026', Gestion: 'ACTIVACIÓN', Region: 'CENTRAL', Estado: 'APROBADA',
            MacroFamilia: 'Sin Rechazo', ID_Subcategoria: 'SUB-00', U1: 'MKNAJERA', Rango_Velocidad: '<=2s', Ronda_Revision: '1RA_DIRECTA',
            Casos: 100, Rechazos: 0, Aprobadas: 100, Finalizadas: 0, NoConfirmadas: 0, Canceladas: 0,
            AprobDirectas: 100, AprobSubsanadas: 0, RechDefinitivos: 0,
            Suma_Buzon_Hab_Sec: 2880000, N_Buzon_Hab: 100, Suma_Buzon_Cal_Sec: 3600000, N_Buzon_Cal: 100,
            Suma_Bolson_Sec: 5000, N_Bolson: 100, Suma_Atencion_Final_Sec: 200, N_Atencion_Final: 100,
            Suma_Atencion_Rechazo_Sec: 0, N_Atencion_Rechazo: 0,
            Suma_Creacion_Atencion_Hab_Sec: 2885000, N_Creacion_Atencion_Hab: 100,
            Suma_Ciclo_Hab_Sec: 2885200, N_Ciclo_Hab: 100, Suma_Ciclo_Cal_Sec: 3605200, N_Ciclo_Cal: 100,
            SLA_8h: 100, SLA_16h: 0, SLA_24h: 0, SLA_40h: 0, Fuera_SLA_40h: 0
        },
        {
            Mes: '2026-02', Anio: '2026', Gestion: 'CAMBIO DE CORREO ELECTRÓNICO', Region: 'OCCIDENTE', Estado: 'CANCELADA',
            MacroFamilia: 'Fallas en Video y Declaración', ID_Subcategoria: 'SUB-01', U1: 'PAPEREZT', Rango_Velocidad: '1-5m', Ronda_Revision: '2DA_SUBSANADA',
            Casos: 50, Rechazos: 50, Aprobadas: 0, Finalizadas: 0, NoConfirmadas: 0, Canceladas: 50,
            AprobDirectas: 0, AprobSubsanadas: 0, RechDefinitivos: 50,
            Suma_Buzon_Hab_Sec: 1440000, N_Buzon_Hab: 50, Suma_Buzon_Cal_Sec: 1800000, N_Buzon_Cal: 50,
            Suma_Bolson_Sec: 10000, N_Bolson: 50, Suma_Atencion_Final_Sec: 0, N_Atencion_Final: 0,
            Suma_Atencion_Rechazo_Sec: 6000, N_Atencion_Rechazo: 50,
            Suma_Creacion_Atencion_Hab_Sec: 1450000, N_Creacion_Atencion_Hab: 50,
            Suma_Ciclo_Hab_Sec: 1456000, N_Ciclo_Hab: 50, Suma_Ciclo_Cal_Sec: 1816000, N_Ciclo_Cal: 50,
            SLA_8h: 0, SLA_16h: 50, SLA_24h: 0, SLA_40h: 0, Fuera_SLA_40h: 0
        },
        {
            Mes: '2025-11', Anio: '2025', Gestion: 'REINICIO DE CONTRASEÑA', Region: 'SUR', Estado: 'FINALIZADA',
            MacroFamilia: 'Sin Rechazo', ID_Subcategoria: 'SUB-00', U1: 'AP_MS_SAT_EN_LINEA', Rango_Velocidad: '<=2s', Ronda_Revision: '1RA_DIRECTA',
            Casos: 200, Rechazos: 0, Aprobadas: 0, Finalizadas: 200, NoConfirmadas: 0, Canceladas: 0,
            AprobDirectas: 200, AprobSubsanadas: 0, RechDefinitivos: 0,
            Suma_Buzon_Hab_Sec: 200, N_Buzon_Hab: 200, Suma_Buzon_Cal_Sec: 200, N_Buzon_Cal: 200,
            Suma_Bolson_Sec: 0, N_Bolson: 0, Suma_Atencion_Final_Sec: 200, N_Atencion_Final: 200,
            Suma_Atencion_Rechazo_Sec: 0, N_Atencion_Rechazo: 0,
            Suma_Creacion_Atencion_Hab_Sec: 200, N_Creacion_Atencion_Hab: 200,
            Suma_Ciclo_Hab_Sec: 200, N_Ciclo_Hab: 200, Suma_Ciclo_Cal_Sec: 200, N_Ciclo_Cal: 200,
            SLA_8h: 200, SLA_16h: 0, SLA_24h: 0, SLA_40h: 0, Fuera_SLA_40h: 0
        }
    ];

    it('filtra automáticamente excluyendo REINICIO DE CONTRASEÑA cuando fGes="HUMANAS"', () => {
        const res = processOlapFilters(mockCubo, 'HUMANAS', 'TODOS', 'TODOS', 'TODAS', 'TODOS', 'TODAS');
        expect(res.totalCasos).toBe(150); // 100 de ACTIVACIÓN + 50 de CAMBIO
        expect(res.totalAprobados).toBe(100);
        expect(res.totalCanceladas).toBe(50);
    });

    it('incluye todo el universo cuando fGes="TODAS"', () => {
        const res = processOlapFilters(mockCubo, 'TODAS', 'TODOS', 'TODOS', 'TODAS', 'TODOS', 'TODAS');
        expect(res.totalCasos).toBe(350); // 100 + 50 + 200
        expect(res.totalAprobados).toBe(300);
    });

    it('filtra por Año y Región con precisión', () => {
        const res = processOlapFilters(mockCubo, 'HUMANAS', '2026', 'TODOS', 'CENTRAL', 'TODOS', 'TODAS');
        expect(res.totalCasos).toBe(100);
        expect(res.totalAprobDirectas).toBe(100);
        expect(res.sla1d).toBe(100);
        expect(res.regMap['CENTRAL'].casos).toBe(100);
        expect(res.regMap['OCCIDENTE'].casos).toBe(0);
    });

    it('agrega operadores en opMap ignorando bots del sistema', () => {
        const res = processOlapFilters(mockCubo, 'TODAS', 'TODOS', 'TODOS', 'TODAS', 'TODOS', 'TODAS');
        expect(res.opMap['MKNAJERA']).toBeDefined();
        expect(res.opMap['MKNAJERA'].total).toBe(100);
        expect(res.opMap['PAPEREZT'].total).toBe(50);
        expect(res.opMap['AP_MS_SAT_EN_LINEA']).toBeUndefined();
    });

    it('filtra correctamente por Tipo de Personería (INDIVIDUAL vs JURIDICA)', () => {
        const mockConPersonas = [
            {
                Mes: '2026-01', Anio: '2026', Gestion: 'ACTIVACIÓN', Region: 'CENTRAL', Estado: 'APROBADA',
                MacroFamilia: 'Sin Rechazo', ID_Subcategoria: 'SUB-00', U1: 'MKNAJERA', Rango_Velocidad: '<=2s', Ronda_Revision: '1RA_DIRECTA',
                TipoPersona: 'INDIVIDUAL', _isJuridica: false,
                Casos: 100, Rechazos: 0, Aprobadas: 100, Finalizadas: 0, NoConfirmadas: 0, Canceladas: 0,
                AprobDirectas: 100, AprobSubsanadas: 0, RechDefinitivos: 0,
                Suma_Buzon_Hab_Sec: 2880000, N_Buzon_Hab: 100, Suma_Buzon_Cal_Sec: 3600000, N_Buzon_Cal: 100,
                Suma_Bolson_Sec: 5000, N_Bolson: 100, Suma_Atencion_Final_Sec: 200, N_Atencion_Final: 100,
                Suma_Atencion_Rechazo_Sec: 0, N_Atencion_Rechazo: 0,
                Suma_Creacion_Atencion_Hab_Sec: 2885000, N_Creacion_Atencion_Hab: 100,
                Suma_Ciclo_Hab_Sec: 2885200, N_Ciclo_Hab: 100, Suma_Ciclo_Cal_Sec: 3605200, N_Ciclo_Cal: 100,
                SLA_8h: 100, SLA_16h: 0, SLA_24h: 0, SLA_40h: 0, Fuera_SLA_40h: 0
            },
            {
                Mes: '2026-01', Anio: '2026', Gestion: 'ACTIVACIÓN', Region: 'CENTRAL', Estado: 'APROBADA',
                MacroFamilia: 'Sin Rechazo', ID_Subcategoria: 'SUB-00', U1: 'MKNAJERA', Rango_Velocidad: '<=2s', Ronda_Revision: '1RA_DIRECTA',
                TipoPersona: 'JURIDICA', _isJuridica: true,
                Casos: 25, Rechazos: 0, Aprobadas: 25, Finalizadas: 0, NoConfirmadas: 0, Canceladas: 0,
                AprobDirectas: 25, AprobSubsanadas: 0, RechDefinitivos: 0,
                Suma_Buzon_Hab_Sec: 720000, N_Buzon_Hab: 25, Suma_Buzon_Cal_Sec: 900000, N_Buzon_Cal: 25,
                Suma_Bolson_Sec: 1250, N_Bolson: 25, Suma_Atencion_Final_Sec: 50, N_Atencion_Final: 25,
                Suma_Atencion_Rechazo_Sec: 0, N_Atencion_Rechazo: 0,
                Suma_Creacion_Atencion_Hab_Sec: 721250, N_Creacion_Atencion_Hab: 25,
                Suma_Ciclo_Hab_Sec: 721300, N_Ciclo_Hab: 25, Suma_Ciclo_Cal_Sec: 901300, N_Ciclo_Cal: 25,
                SLA_8h: 25, SLA_16h: 0, SLA_24h: 0, SLA_40h: 0, Fuera_SLA_40h: 0
            }
        ];

        const resTodas = processOlapFilters(mockConPersonas, 'HUMANAS', '2026', 'TODOS', 'TODOS', 'CENTRAL', 'TODOS', 'TODAS', 'TODAS');
        expect(resTodas.totalCasos).toBe(125);

        const resInd = processOlapFilters(mockConPersonas, 'HUMANAS', '2026', 'TODOS', 'TODOS', 'CENTRAL', 'TODOS', 'TODAS', 'INDIVIDUAL');
        expect(resInd.totalCasos).toBe(100);

        const resJur = processOlapFilters(mockConPersonas, 'HUMANAS', '2026', 'TODOS', 'TODOS', 'CENTRAL', 'TODOS', 'TODAS', 'JURIDICA');
        expect(resJur.totalCasos).toBe(25);
    });

    it('maneja cubos vacíos o nulos sin excepciones y devuelve ceros estructurados', () => {
        const resEmpty = processOlapFilters([], 'HUMANAS', 'TODOS', 'TODOS', 'TODAS', 'TODOS', 'TODAS');
        expect(resEmpty.totalCasos).toBe(0);
        expect(resEmpty.totalAprobados).toBe(0);
        expect(resEmpty.totalRechazos).toBe(0);
        expect(resEmpty.totalAprobDirectas).toBe(0);
        expect(resEmpty.sla1d).toBe(0);

        const resNull = processOlapFilters(null, 'HUMANAS', 'TODOS', 'TODOS', 'TODAS', 'TODOS', 'TODAS');
        expect(resNull.totalCasos).toBe(0);
    });

    it('calcula la distribución exacta de SLAs acumulados', () => {
        const mockSlaCubo = [
            {
                Mes: '2026-01', Anio: '2026', Gestion: 'ACTIVACIÓN', Region: 'CENTRAL', Estado: 'APROBADA',
                MacroFamilia: 'Sin Rechazo', ID_Subcategoria: 'SUB-00', U1: 'OPERADOR1', Rango_Velocidad: '<=2s', Ronda_Revision: '1RA_DIRECTA',
                Casos: 100, Rechazos: 0, Aprobadas: 100, Finalizadas: 0, NoConfirmadas: 0, Canceladas: 0,
                AprobDirectas: 100, AprobSubsanadas: 0, RechDefinitivos: 0,
                SLA_8h: 40, SLA_16h: 30, SLA_24h: 15, SLA_40h: 10, Fuera_SLA_40h: 5
            }
        ];

        const res = processOlapFilters(mockSlaCubo, 'HUMANAS', '2026', 'TODOS', 'TODOS', 'CENTRAL', 'TODOS', 'TODAS', 'TODAS');
        expect(res.sla1d).toBe(40);
        expect(res.sla2d).toBe(30);
        expect(res.sla3d).toBe(15);
        expect(res.sla5d).toBe(10);
        expect(res.slaFuera).toBe(5);
        expect(res.totalCasos).toBe(100);
    });
});
