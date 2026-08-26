// Cargador Asíncrono de Datos con Visibilidad de Estado del Sistema
window.DATA = {
    opciones: { meses: [], anios: [], gestiones: [], regiones: [], estados: [], macro_familias: [] },
    combos: [],
    taxonomia: [],
    muestra_expedientes: [],
    cubo: [],
    loaded: false
};

function updateSystemStatus(text, state = 'loading') {
    const pill = document.getElementById('statusMotorPill');
    const dot = document.getElementById('statusMotorDot');
    const txt = document.getElementById('statusMotorTxt');
    const bar = document.getElementById('topProgressBar');
    
    if (!pill || !txt) return;
    txt.innerText = text;
    
    if (state === 'loading') {
        pill.className = 'flex items-center gap-2 text-[11px] text-blue-300 bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-all duration-300';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-blue-400 animate-ping';
        if (bar) { bar.style.width = '65%'; bar.style.opacity = '1'; }
    } else if (state === 'ready') {
        pill.className = 'flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all duration-300';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        if (bar) {
            bar.style.width = '100%';
            setTimeout(() => { bar.style.opacity = '0'; }, 300);
        }
    } else if (state === 'computing') {
        pill.className = 'flex items-center gap-2 text-[11px] text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-all duration-300';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse';
    } else if (state === 'error') {
        pill.className = 'flex items-center gap-2 text-[11px] text-rose-300 bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-500/40 shadow-sm';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-ping';
        if (bar) { bar.style.width = '100%'; bar.style.backgroundColor = '#EF4444'; }
    }
}

window.updateSystemStatus = updateSystemStatus;

function getBaseUrl() {
    if (window.BASE_URL) return window.BASE_URL.replace(/\/$/, "");
    const path = window.location.pathname;
    if (path.includes("/Metrica-AV-Y-RTU")) return "/Metrica-AV-Y-RTU";
    return "";
}

window.DATA_READY = (async function loadData() {
    try {
        updateSystemStatus("Descargando 2.57M trámites...", "loading");
        const baseUrl = getBaseUrl();
        let json;

        try {
            const gzUrl = `${baseUrl}/data/cubo_compacto.json.gz`.replace(/\/\//g, "/");
            const resGz = await fetch(gzUrl);
            if (resGz.ok && typeof DecompressionStream !== 'undefined') {
                const ds = new DecompressionStream('gzip');
                const decompressedStream = resGz.body.pipeThrough(ds);
                const resp = new Response(decompressedStream);
                json = await resp.json();
            } else {
                throw new Error("GZIP no disponible");
            }
        } catch (gzErr) {
            const jsonUrl = `${baseUrl}/data/cubo_compacto.json`.replace(/\/\//g, "/");
            const res = await fetch(jsonUrl);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            json = await res.json();
        }
        
        updateSystemStatus("Procesando matriz analítica...", "loading");
        
        window.DATA.opciones = json.opciones || {};
        window.DATA.meses_lista = json.opciones.meses || json.meses_lista || [];
        window.DATA.combos = json.combos || [];
        window.DATA.taxonomia = json.taxonomia || [];
        window.DATA.muestra_expedientes = json.dataset_muestral_500 || json.muestra_expedientes || [];
        window.DATA.operadores_productividad_8h = json.operadores_productividad_8h || [];
        
        const cols = json.cols;
        const rows = json.rows;
        const numRows = rows.length;
        const cubo = new Array(numRows);
        
        // Mapeo de índices de columnas para construcción ultrarrápida
        const idxGestion = cols.indexOf('Gestion');
        const idxMes = cols.indexOf('Mes');
        const idxAnio = cols.indexOf('Anio');
        const idxRegion = cols.indexOf('Region');
        const idxEstado = cols.indexOf('Estado');
        const idxAprobadas = cols.indexOf('Aprobadas');
        const idxFinalizadas = cols.indexOf('Finalizadas');
        const idxRechazos = cols.indexOf('Rechazos');
        
        for (let i = 0; i < numRows; i++) {
            const r = rows[i];
            const obj = {};
            for (let j = 0; j < cols.length; j++) {
                obj[cols[j]] = r[j];
            }
            
            // Pre-cómputo de banderas para filtrado OLAP ultrarrápido O(1)
            const g = r[idxGestion] || '';
            const gUpper = g.toUpperCase();
            obj._isReinicio = gUpper.includes('REINICIO');
            obj._isActivacion = gUpper.includes('ACTIVAC');
            obj._isCorreo = gUpper.includes('CORREO');
            
            const m = r[idxMes];
            if (m && m !== 'NaT' && m.length >= 7) {
                const mNum = m.substring(5, 7);
                obj._mesNum = mNum;
                obj._trimestre = (mNum <= '03') ? 'Q1' : ((mNum <= '06') ? 'Q2' : ((mNum <= '09') ? 'Q3' : 'Q4'));
            } else {
                obj._mesNum = null;
                obj._trimestre = null;
            }
            
            obj._anioStr = String(r[idxAnio] || '');
            
            const rech = r[idxRechazos] || 0;
            const est = r[idxEstado] || '';
            const aprob = (r[idxAprobadas] || 0) + (r[idxFinalizadas] || 0);
            obj._isNoRech = (rech === 0 && (est === 'APROBADA' || est === 'FINALIZADA' || aprob > 0));
            
            cubo[i] = obj;
        }
        
        // Pre-procesar flags en dataset muestral
        if (Array.isArray(window.DATA.muestra_expedientes)) {
            window.DATA.muestra_expedientes.forEach(e => {
                const g = (e.Gestion || '').toUpperCase();
                e._isReinicio = g.includes('REINICIO');
                e._isActivacion = g.includes('ACTIVAC');
                e._isCorreo = g.includes('CORREO');
                if (e.FechaCreacion && e.FechaCreacion.length >= 7) {
                    const mNum = e.FechaCreacion.substring(5, 7);
                    e._trimestre = (mNum <= '03') ? 'Q1' : ((mNum <= '06') ? 'Q2' : ((mNum <= '09') ? 'Q3' : 'Q4'));
                }
            });
        }
        
        window.DATA.cubo = cubo;
        window.DATA.loaded = true;
        
        updateSystemStatus("Motor OLAP Listo • 2.57M Registros", "ready");
        
        document.querySelectorAll('[data-skeleton]').forEach(el => el.classList.remove('skeleton-text'));
        
        if (typeof window.onDataReady === 'function') {
            window.onDataReady(window.DATA);
        }
        
        window.dispatchEvent(new CustomEvent('dataReady', { detail: window.DATA }));
        return window.DATA;
    } catch (e) {
        console.error("Error al cargar cubo_compacto.json:", e);
        updateSystemStatus("Error al cargar datos", "error");
        const errBanner = document.getElementById('dataErrorBanner');
        if (errBanner) {
            errBanner.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
        }
    }
})();
