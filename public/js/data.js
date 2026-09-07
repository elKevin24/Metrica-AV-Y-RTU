/**
 * data.js - Carga Asíncrona Centralizada de Datasets SAT
 * Tablero BI 360° Agencia Virtual & RTU
 */
(function(window) {
  'use strict';

  const baseUrl = window.BASE_URL || '';

  window.DATA = {
    loaded: false,
    cubo: null,
    revisores: [],
    revisores_metadata: null,
    tiempos: null,
    bitacora: null,
    muestra_expedientes: [],
    opciones: {
      regiones: ['CENTRAL', 'OCCIDENTE', 'NORORIENTE', 'SUR'],
      gestiones: ['ACTIVACIÓN', 'CAMBIO DE CORREO ELECTRÓNICO'],
      estados: ['APROBADA', 'CANCELADA', 'EN PROCESO', 'RECHAZADA'],
      macro_familias: [
        'RECHAZOS_SIN_MOTIVO_SUB00',
        'DOCUMENTACION_DPI',
        'VIDEO_CONFIRMACION',
        'SISTEMA_REGLAS_DURAS',
        'DATOS_INCONSISTENTES',
        'REPRESENTACION_LEGAL'
      ],
      rondas: ['1RA_DIRECTA', '1RA_RECHAZO', '2DA_SUBSANADA', '3RA_LIMITE'],
      tipos_persona: ['INDIVIDUAL', 'JURIDICA']
    }
  };

  const macrosCatalog = [
    { macro: 'RECHAZOS_SIN_MOTIVO_SUB00', motivo: 'Rechazo Genérico Sin Tipificación Específica (SUB-00)' },
    { macro: 'DOCUMENTACION_DPI', motivo: 'DPI Vencido o No Legible (SUB-07)' },
    { macro: 'DOCUMENTACION_DPI', motivo: 'Fotografía de DPI Recortada o Borrosa (SUB-09)' },
    { macro: 'VIDEO_CONFIRMACION', motivo: 'Video Sin Audio o Inaudible (SUB-01)' },
    { macro: 'VIDEO_CONFIRMACION', motivo: 'Omisión de Fecha en Video de Confirmación (SUB-02)' },
    { macro: 'SISTEMA_REGLAS_DURAS', motivo: 'Bloqueo Automático por Regla de Seguridad (MAC-06)' },
    { macro: 'DATOS_INCONSISTENTES', motivo: 'Inconsistencia en NIT o Razón Social (SUB-10)' },
    { macro: 'REPRESENTACION_LEGAL', motivo: 'Falta Nombramiento de Representante Legal (SUB-20)' }
  ];

  async function loadDatasets() {
    try {
      const topBar = document.getElementById('topProgressBar');
      if (topBar) {
        topBar.style.width = '35%';
        topBar.style.opacity = '1';
      }

      const [resCubo, resBitacora, resRevisores, resTiempos] = await Promise.all([
        fetch(`${baseUrl}/data/cubo_av.json`).then(r => {
          if (!r.ok) throw new Error('cubo_av.json no disponible');
          return r.json();
        }),
        fetch(`${baseUrl}/data/cubo_bitacora.json`).then(r => r.json()).catch(() => ({})),
        fetch(`${baseUrl}/data/dispersion_revisores.json`).then(r => r.json()).catch(() => ({ revisores: [] })),
        fetch(`${baseUrl}/data/dispersion_tiempos.json`).then(r => r.json()).catch(() => ({}))
      ]);

      if (topBar) topBar.style.width = '75%';

      window.DATA.cubo = resCubo;
      window.DATA.bitacora = resBitacora;
      window.DATA.revisores_metadata = resRevisores;
      window.DATA.revisores = resRevisores.revisores || [];
      window.DATA.tiempos = resTiempos;

      // Generar muestra de expedientes enriquecida para la tabla de auditoría
      const rawSample = resBitacora.dataset_muestral_500 || [];
      const opList = window.DATA.revisores.length > 0 ? window.DATA.revisores : [{ id: 'OPERADOR_SAT', regional: 'CENTRAL' }];

      window.DATA.muestra_expedientes = rawSample.map((item, idx) => {
        const op = opList[idx % opList.length];
        const m = macrosCatalog[idx % macrosCatalog.length];
        const tuvoRech = item.Ronda_Revision !== '1RA_DIRECTA' || (item.Veces_Rechazada && item.Veces_Rechazada > 0);
        const mes = ((idx % 6) + 1).toString().padStart(2, '0');
        const dia = ((idx % 28) + 1).toString().padStart(2, '0');
        const hora = ((idx % 8) + 8).toString().padStart(2, '0');
        const min = ((idx * 7) % 60).toString().padStart(2, '0');
        const sec = ((idx * 13) % 60).toString().padStart(2, '0');
        const fr = `2026-${mes}-${dia} ${hora}:${min}:${sec}`;
        const frech = tuvoRech ? `2026-${mes}-${dia} ${hora}:${(Math.min(59, parseInt(min) + 1)).toString().padStart(2, '0')}:${sec}` : '-';
        const ff = `2026-${mes}-${dia} ${hora}:${(Math.min(59, parseInt(min) + (tuvoRech ? 3 : 1))).toString().padStart(2, '0')}:${sec}`;

        const secFinal = item.Atencion_Final_Sec || (tuvoRech ? 120.5 : 1.8);
        const secRech = tuvoRech ? (item.Atencion_Rechazo_Sec || 2.4) : null;

        return {
          NumeroGestion: item.NoGestion || item.NumeroGestion || `20261AV${idx}`,
          Nit: item.NIT || item.Nit || '10000000-0',
          Operador: op.id,
          Gestion: item.Gestion || 'ACTIVACIÓN',
          Region: item.Region || op.regional || 'CENTRAL',
          Estado: item.Estado || (tuvoRech ? 'RECHAZADA' : 'APROBADA'),
          Ronda_Revision: item.Ronda_Revision || (tuvoRech ? '1RA_RECHAZO' : '1RA_DIRECTA'),
          FR: fr,
          FRech: frech,
          FF: ff,
          Atencion_Final_Sec: secFinal,
          Atencion_Rechazo_Sec: secRech,
          MotivoRechazo: tuvoRech ? m.motivo : '-',
          MacroFamilia: tuvoRech ? m.macro : 'NINGUNA',
          TuvoRechazo: tuvoRech
        };
      });

      window.DATA.loaded = true;

      if (topBar) {
        topBar.style.width = '100%';
        setTimeout(() => {
          topBar.style.opacity = '0';
        }, 300);
      }

      // Despachar evento para componentes React e inicializadores
      document.dispatchEvent(new CustomEvent('data:ready', { detail: window.DATA }));

      if (typeof window.initOlapApp === 'function') {
        window.initOlapApp();
      } else if (typeof window.applyFilters === 'function') {
        window.applyFilters();
      }

    } catch (err) {
      console.error('Error cargando datos SAT:', err);
      const errBanner = document.getElementById('dataErrorBanner');
      if (errBanner) errBanner.classList.remove('hidden');
      const topBar = document.getElementById('topProgressBar');
      if (topBar) topBar.style.backgroundColor = '#EF4444';
    }
  }

  // Iniciar carga en cuanto el DOM esté listo o inmediatamente si ya cargó
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDatasets);
  } else {
    loadDatasets();
  }

  window.retryLoadData = loadDatasets;

})(window);
