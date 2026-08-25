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
        const jsonUrl = `${baseUrl}/data/cubo_compacto.json`.replace(/\/\//g, "/");
        
        const res = await fetch(jsonUrl);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        updateSystemStatus("Procesando matriz analítica...", "loading");
        const json = await res.json();
        
        window.DATA.opciones = json.opciones || {};
        window.DATA.meses_lista = json.opciones.meses || json.meses_lista || [];
        window.DATA.combos = json.combos || [];
        window.DATA.taxonomia = json.taxonomia || [];
        window.DATA.muestra_expedientes = json.dataset_muestral_500 || json.muestra_expedientes || [];
        
        const cols = json.cols;
        const rows = json.rows;
        const numRows = rows.length;
        const cubo = new Array(numRows);
        
        for (let i = 0; i < numRows; i++) {
            const r = rows[i];
            const obj = {};
            for (let j = 0; j < cols.length; j++) {
                obj[cols[j]] = r[j];
            }
            cubo[i] = obj;
        }
        
        window.DATA.cubo = cubo;
        window.DATA.loaded = true;
        
        updateSystemStatus("Motor OLAP Listo • 2.57M Registros", "ready");
        
        if (typeof window.onDataReady === 'function') {
            window.onDataReady(window.DATA);
        }
        
        window.dispatchEvent(new CustomEvent('dataReady', { detail: window.DATA }));
        return window.DATA;
    } catch (e) {
        console.error("Error al cargar cubo_compacto.json:", e);
        updateSystemStatus("Error de conexión al cargar datos", "loading");
    }
})();
