// Cargador Asíncrono de Datos Ultrarrápido (Non-Blocking Data Stream)
window.DATA = {
    opciones: { meses: [], regiones: [], estados: [], macro_familias: [] },
    combos: [],
    taxonomia: [],
    muestra_expedientes: [],
    cubo: [],
    loaded: false
};

function getBaseUrl() {
    if (window.BASE_URL) return window.BASE_URL.replace(/\/$/, "");
    const path = window.location.pathname;
    if (path.includes("/Metrica-AV-Y-RTU")) return "/Metrica-AV-Y-RTU";
    return "";
}

window.DATA_READY = (async function loadData() {
    try {
        const baseUrl = getBaseUrl();
        const jsonUrl = `${baseUrl}/data/cubo_compacto.json`.replace(/\/\//g, "/");
        const res = await fetch(jsonUrl);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
        
        if (typeof window.onDataReady === 'function') {
            window.onDataReady(window.DATA);
        }
        
        window.dispatchEvent(new CustomEvent('dataReady', { detail: window.DATA }));
        return window.DATA;
    } catch (e) {
        console.error("Error al cargar cubo_compacto.json:", e);
    }
})();
