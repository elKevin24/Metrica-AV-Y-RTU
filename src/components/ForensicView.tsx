import { useEffect, useMemo, useRef, useState } from 'react';

interface ForensicCase {
  i: string;
  t: string;
  r: string;
  e: string;
  fc?: string | null;
  fa?: string | null;
  fr?: string | null;
  ff?: string | null;
  frz?: string | null;
  tc?: number | null;
  tt?: number | null;
  cr?: number;
  sb?: number;
  ft?: number;
  m?: string | null;
  ne?: number;
}

const PAGE_SIZE = 50;
const VALID_REGIONES = ['CENTRAL', 'OCCIDENTE', 'NORORIENTE', 'SUR'];
const ORDER_ESTADOS = ['APROBADA', 'CANCELADA', 'NO CONFIRMADA', 'CREADA', 'RECHAZADA CON REQUERIMIENTO'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type SortField = 'i' | 't' | 'tc';

interface Filters {
  search: string;
  region: string;
  estado: string;
  bottleneck: boolean;
}

interface Sort {
  field: SortField;
  asc: boolean;
}

async function fetchWithRetry(url: string, retries = 3, delay = 400): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (attempt === retries) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function loadChunk(index: number): Promise<unknown> {
  const padded = String(index).padStart(3, '0');
  const res = await fetchWithRetry(`/data/forensic/chunk_${padded}.json`, 3, 400);
  const raw = await res.text();
  const sanitized = raw.replace(/:\s*NaN\b/g, ': null').replace(/:\s*Infinity\b/g, ': null');
  return JSON.parse(sanitized);
}

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getDate().toString().padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function fmtDiff(d1?: string | null, d2?: string | null): string | null {
  if (!d1 || !d2) return null;
  const diff = (new Date(d2).getTime() - new Date(d1).getTime()) / 1000;
  if (diff < 0) return null;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 24) return `${(diff / 3600).toFixed(1)}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtCola(colaH?: number | null): { text: string; cls: string } {
  if (colaH == null) return { text: '-', cls: 'text-slate-500' };
  const text = colaH >= 1 ? colaH.toFixed(1) + 'h' : (colaH * 60).toFixed(0) + 'm';
  if (colaH > 24) return { text, cls: 'text-red-600 font-bold' };
  if (colaH > 8) return { text, cls: 'text-amber-600 font-bold' };
  return { text, cls: 'text-emerald-600' };
}

function badgeForEstado(estado: string): string {
  if (estado === 'APROBADA') return '<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px]">Aprobada</span>';
  if (estado.includes('RECHAZADA')) return '<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-md font-bold text-[10px]">Rechazada</span>';
  if (estado.includes('CANCELADA')) return '<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold text-[10px]">Cancelada</span>';
  if (estado === 'CREADA') return '<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold text-[10px]">Creada</span>';
  if (estado === 'NO CONFIRMADA') return '<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[10px]">No Confirm.</span>';
  return `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[10px]">${estado}</span>`;
}

export default function ForensicView() {
  const allCases = useRef<ForensicCase[]>([]);
  const totalChunks = useRef(0);
  const started = useRef(false);
  const isLoading = useRef(false);
  const tableWrap = useRef<HTMLDivElement>(null);

  const [dataVersion, setDataVersion] = useState(0);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [regions, setRegions] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: '', region: 'TODAS', estado: 'TODOS', bottleneck: false });
  const [sort, setSort] = useState<Sort>({ field: 'tc', asc: false });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bump = () => {
    setDataVersion(v => v + 1);
    const pct = Math.min(100, Math.round((allCases.current.length / (totalChunks.current * 5000 || 1)) * 100));
    setProgress({ loaded: allCases.current.length, total: totalChunks.current * 5000 });
  };

  const loadAuditoriaFallback = async () => {
    try {
      const fallbackRes = await fetchWithRetry('/data/auditoria_muestra.json', 3, 500);
      const fallbackData = await fallbackRes.json();
      const rawMuestra = fallbackData.muestra_expedientes || [];
      allCases.current = rawMuestra.map((m: Record<string, unknown>) => ({
        i: m.NumeroGestion || '',
        t: m.Gestion || '',
        r: m.Region || '',
        e: m.Estado || '',
        fc: (m.FC as string) || ((m.FR as string) || null),
        fa: (m.FA as string) || ((m.FR as string) || null),
        fr: (m.FR as string) || null,
        ff: (m.FF as string) || null,
        frz: (m.FRech as string) || null,
        tc: typeof m.Ciclo_Habil_Hrs === 'number' ? (m.Ciclo_Habil_Hrs as number) : null,
        tt: typeof m.Ciclo_Habil_Hrs === 'number' ? (m.Ciclo_Habil_Hrs as number) : null,
        cr: m.FRech ? 1 : 0,
        sb: m.Ronda_Revision === '2DA_SUBSANADA' ? 1 : 0,
        ft: m.Estado === 'APROBADA' && !m.FRech ? 1 : 0,
        m: (m.MacroFamilia as string) || null,
        ne: (m.Eventos as number) || 4,
      }));
      totalChunks.current = 1;
      setProgress({ loaded: allCases.current.length, total: allCases.current.length });
      setDataVersion(v => v + 1);
      populateFilters();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const populateFilters = () => {
    const regiones = new Set<string>();
    const estadosSet = new Set<string>();
    allCases.current.forEach(c => {
      if (c.r) regiones.add(c.r);
      if (c.e) estadosSet.add(c.e);
    });
    setRegions(
      Array.from(regiones)
        .sort()
        .filter(r => VALID_REGIONES.includes(r))
        .map(r => r.charAt(0) + r.slice(1).toLowerCase())
    );
    setEstados(ORDER_ESTADOS.filter(e => estadosSet.has(e)).map(e => e.charAt(0) + e.slice(1).toLowerCase()));
  };

  const loadForensicData = async () => {
    if (isLoading.current && allCases.current.length > 0) return;
    isLoading.current = true;

    let idx: { total?: number; chunks?: number } | null = null;
    try {
      const idxRes = await fetchWithRetry('/data/forensic/index.json', 2, 300);
      idx = await idxRes.json();
    } catch (idxErr) {
      console.warn('[ForensicView] No se pudo cargar index.json, usando fallback:', idxErr);
    }

    if (!idx || !idx.chunks) {
      await loadAuditoriaFallback();
      isLoading.current = false;
      return;
    }

    totalChunks.current = idx.chunks || 28;
    const firstBatch = Math.min(3, totalChunks.current);
    for (let i = 0; i < firstBatch; i++) {
      try {
        const chunk = await loadChunk(i);
        if (Array.isArray(chunk) && chunk.length > 0) {
          allCases.current = allCases.current.concat(chunk);
        }
      } catch (chunkErr) {
        console.warn(`[ForensicView] Error en chunk inicial ${i}:`, chunkErr);
      }
    }

    if (allCases.current.length === 0) {
      console.warn('[ForensicView] Chunks no disponibles, cargando auditoria_muestra.json');
      await loadAuditoriaFallback();
      isLoading.current = false;
      return;
    }

    populateFilters();
    setProgress({ loaded: allCases.current.length, total: idx.total || 135628 });
    setDataVersion(v => v + 1);

    (async () => {
      for (let i = firstBatch; i < totalChunks.current; i++) {
        try {
          const chunk = await loadChunk(i);
          if (Array.isArray(chunk) && chunk.length > 0) {
            allCases.current = allCases.current.concat(chunk);
            bump();
          }
        } catch (chunkErr) {
          console.warn(`[ForensicView] Error no fatal cargando chunk ${i}:`, chunkErr);
        }
      }
      setStatus('ready');
      isLoading.current = false;
    })();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void loadForensicData();
  }, []);

  useEffect(() => {
    const onLoad = () => {
      if (!started.current) {
        started.current = true;
        void loadForensicData();
      }
    };
    window.addEventListener('forensic:load', onLoad);
    return () => window.removeEventListener('forensic:load', onLoad);
  }, []);

  useEffect(() => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, [selectedId, dataVersion, page]);

  const filtered = useMemo(() => {
    return allCases.current.filter(c => {
      const query = filters.search.toLowerCase().trim();
      if (query && !(c.i || '').toLowerCase().includes(query)) return false;
      if (filters.region !== 'TODAS' && c.r !== filters.region) return false;
      if (filters.estado !== 'TODOS' && c.e !== filters.estado) return false;
      if (filters.bottleneck && (!c.tc || c.tc <= 8)) return false;
      return true;
    });
  }, [filters, dataVersion]);

  const sorted = useMemo(() => {
    const cmp = (a: ForensicCase, b: ForensicCase) => {
      let va: string | number | null | undefined = a[sort.field];
      let vb: string | number | null | undefined = b[sort.field];
      if (va == null) va = sort.asc ? Infinity : -Infinity;
      if (vb == null) vb = sort.asc ? Infinity : -Infinity;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    };
    return [...filtered].sort(cmp);
  }, [filtered, sort]);

  const stats = useMemo(() => {
    const total = sorted.length;
    const conRechazo = sorted.filter(c => c.cr === 1).length;
    const aprobadas = sorted.filter(c => c.ft === 1).length;
    const avgCola = sorted.reduce((s, c) => s + (c.tc || 0), 0) / (total || 1);
    return { total, conRechazo, aprobadas, avgCola };
  }, [sorted]);

  useEffect(() => {
    if (page > 1 && (page - 1) * PAGE_SIZE >= sorted.length) setPage(1);
  }, [sorted.length, page]);

  const onSort = (field: SortField) => {
    setSort(s => (s.field === field ? { field, asc: !s.asc } : field === 'i' ? { field, asc: true } : { field, asc: false }));
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
      tableWrap.current?.scrollTo?.({ top: 0 });
    }
  };

  const nextPage = () => {
    if (page < Math.ceil(sorted.length / PAGE_SIZE)) {
      setPage(page + 1);
      tableWrap.current?.scrollTo?.({ top: 0 });
    }
  };

  const start = (page - 1) * PAGE_SIZE;
  const pageData = sorted.slice(start, start + PAGE_SIZE);
  const selectedCase = selectedId ? allCases.current.find(x => x.i === selectedId) : null;

  const sortIndicator = (field: SortField, display: string) => (
    <span id={'sort-' + field} className="text-slate-300">
      {sort.field === field ? (sort.asc ? '▲' : '▼') : display}
    </span>
  );

  const selectCase = (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      document.getElementById('forensicDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="glass-card rounded-2xl flex flex-col h-auto md:h-[calc(100vh-170px)] min-h-[550px] overflow-hidden transition-all duration-300">
      <div className="border-b border-slate-200/60 bg-white/70 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative w-full sm:w-72">
            <i data-lucide="search" className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar ID expediente..."
              value={filters.search}
              onChange={e => {
                setFilters(f => ({ ...f, search: e.target.value }));
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200/80 bg-white/80 backdrop-blur-md rounded-xl pl-9 pr-3 py-2 sm:py-1.5 focus:outline-blue-500 font-mono shadow-2xs"
            />
          </div>

          <select
            value={filters.region}
            onChange={e => {
              setFilters(f => ({ ...f, region: e.target.value }));
              setPage(1);
            }}
            className="text-xs border border-slate-200/80 bg-white/80 backdrop-blur-md rounded-xl px-2.5 py-2 sm:py-1.5 focus:outline-blue-500 font-medium shadow-2xs flex-1 sm:flex-none"
          >
            <option value="TODAS">Todas las Regiones</option>
            {regions.map(r => (
              <option key={r} value={r.toUpperCase()}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={filters.estado}
            onChange={e => {
              setFilters(f => ({ ...f, estado: e.target.value }));
              setPage(1);
            }}
            className="text-xs border border-slate-200/80 bg-white/80 backdrop-blur-md rounded-xl px-2.5 py-2 sm:py-1.5 focus:outline-blue-500 font-medium shadow-2xs flex-1 sm:flex-none"
          >
            <option value="TODOS">Todos los Estados</option>
            {estados.map(e => (
              <option key={e} value={e.toUpperCase()}>
                {e}
              </option>
            ))}
          </select>

          <label className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium shrink-0">
            <input
              type="checkbox"
              checked={filters.bottleneck}
              onChange={e => {
                setFilters(f => ({ ...f, bottleneck: e.target.checked }));
                setPage(1);
              }}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Solo cuellos de botella (&gt;8h)
          </label>
        </div>

        <div id="forensicStats" className="text-[11px] text-slate-500 font-mono shrink-0 flex items-center justify-between sm:justify-end">
          {status === 'error' ? (
            <button
              onClick={() => {
                isLoading.current = false;
                void loadForensicData();
              }}
              className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-semibold cursor-pointer flex items-center gap-1"
            >
              <i data-lucide="refresh-cw" className="w-3 h-3" /> Reintentar
            </button>
          ) : status === 'loading' ? (
            <span className="inline-flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {progress.loaded === 0
                ? 'Cargando datos...'
                : `${progress.loaded.toLocaleString()} expedientes ${progress.total > progress.loaded ? `(${Math.min(100, Math.round((progress.loaded / progress.total) * 100))}%)` : 'cargados'}`}
            </span>
          ) : (
            <span className="font-bold text-slate-700">{stats.total.toLocaleString()}</span>
          )}
          {status === 'ready' && (
            <>
              <span className="mx-1">•</span>
              <span className="text-emerald-600 font-bold">{stats.aprobadas.toLocaleString()}</span> FTR
              <span className="mx-1">•</span>
              <span className="text-rose-600 font-bold">{stats.conRechazo.toLocaleString()}</span> rechazos
              <span className="mx-1">•</span>
              Cola avg: <span className="font-bold text-slate-700">{stats.avgCola.toFixed(1)}h</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="w-full md:w-3/5 border-b md:border-b-0 md:border-r border-slate-200/60 flex flex-col bg-white/40 backdrop-blur-md min-h-[360px] md:min-h-0">
          <div ref={tableWrap} className="overflow-y-auto flex-1 min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/90 backdrop-blur-md sticky top-0 shadow-2xs z-10 border-b border-slate-200/60">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 cursor-pointer hover:text-blue-600" onClick={() => onSort('i')}>
                    ID Gestión {sortIndicator('i', '↕')}
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 cursor-pointer hover:text-blue-600" onClick={() => onSort('t')}>
                    Trámite {sortIndicator('t', '↕')}
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 cursor-pointer hover:text-blue-600 text-right" onClick={() => onSort('tc')}>
                    T. Cola {sortIndicator('tc', '↕')}
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                      {status === 'loading' && allCases.current.length === 0 ? 'Cargando expedientes...' : 'No se encontraron expedientes'}
                    </td>
                  </tr>
                ) : (
                  pageData.map(c => {
                    const id = c.i || '';
                    const tramite = c.t || '-';
                    const cola = fmtCola(c.tc);
                    const estado = c.e || '-';
                    const isSelected = id === selectedId;
                    return (
                      <tr
                        key={id}
                        className={`${isSelected ? 'bg-blue-50/80 hover:bg-blue-50' : 'hover:bg-slate-50'} cursor-pointer transition-colors`}
                        onClick={() => selectCase(id)}
                      >
                        <td className={`px-3 py-2.5 font-mono font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-700'} ${isSelected ? 'border-l-3 border-blue-600' : 'border-l-3 border-transparent'}`}>
                          {id}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 truncate max-w-[140px]">{tramite}</td>
                        <td className={`px-3 py-2.5 text-right font-mono ${cola.cls}`}>{cola.text}</td>
                        <td className="px-3 py-2.5 text-center" dangerouslySetInnerHTML={{ __html: badgeForEstado(estado) }} />
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="h-10 border-t border-slate-200/60 bg-white/60 backdrop-blur-md flex items-center justify-between px-3 text-[10px] text-slate-500 font-medium shrink-0">
            <span>
              {sorted.length > 0 ? `Mostrando ${start + 1}-${Math.min(start + PAGE_SIZE, sorted.length)} de ${sorted.length.toLocaleString()}` : '—'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={prevPage} className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200/80 hover:bg-white font-bold transition-all cursor-pointer">
                ← Ant
              </button>
              <span className="px-2 py-1 font-mono font-bold text-blue-700">{page}</span>
              <button onClick={nextPage} className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200/80 hover:bg-white font-bold transition-all cursor-pointer">
                Sig →
              </button>
            </div>
          </div>
        </div>

        <div id="forensicDetail" className="w-full md:w-2/5 flex flex-col bg-white/20 backdrop-blur-md border-t md:border-t-0 md:border-l border-slate-200/60 min-h-[300px]">
          <div className="p-3 border-b border-slate-200/60 bg-white/60 backdrop-blur-md shadow-2xs shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Trazabilidad de Expediente</div>
            <div className="font-mono text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>{selectedCase ? selectedCase.i : 'Seleccione un expediente'}</span>
              {selectedCase && (
                <span
                  className={
                    selectedCase.ft === 1
                      ? 'text-[11px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'
                      : selectedCase.sb === 1
                        ? 'text-[11px] font-sans font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200'
                        : selectedCase.cr === 1
                          ? 'text-[11px] font-sans font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200'
                          : 'text-[11px] font-sans font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200'
                  }
                >
                  {selectedCase.ft === 1
                    ? 'FTR (1ra vez)'
                    : selectedCase.sb === 1
                      ? 'Subsanada'
                      : selectedCase.cr === 1
                        ? 'Rechazada'
                        : selectedCase.e || '-'}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedCase ? renderTimeline(selectedCase) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
                <i data-lucide="mouse-pointer-click" className="w-10 h-10 text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-500">Seleccione un expediente</p>
                  <p className="text-xs text-slate-400 mt-1">Haga clic en una fila de la tabla para ver la trazabilidad completa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderTimeline(c: ForensicCase) {
  const steps: { color: string; title: string; date: string | null; detail: string | null }[] = [];

  if (c.fc) {
    steps.push({ color: 'slate', title: 'Ingreso al Sistema', date: fmtDate(c.fc), detail: `Trámite: ${c.t || '-'} | Región: ${regionLabel(c.r)}` });
  }

  const delayColor = c.tc != null ? (c.tc > 24 ? 'rose' : c.tc > 8 ? 'amber' : 'emerald') : null;
  const delayDetail = c.fc && c.fa ? fmtDiff(c.fc, c.fa) || (c.tc != null ? c.tc.toFixed(1) + 'h' : '-') : null;

  if (c.fa) {
    steps.push({ color: 'blue', title: 'Asignación a Revisor', date: fmtDate(c.fa), detail: 'Revisor recibió el expediente' });
  }

  if (c.fr && c.fa) {
    steps.push({ color: 'indigo', title: 'Revisión en Bandeja', date: fmtDate(c.fr), detail: `Tiempo activo: ${fmtDiff(c.fa, c.fr) || '-'}` });
  }

  if (c.cr === 1 && c.frz) {
    steps.push({ color: 'rose', title: 'Revisión de Rechazo', date: fmtDate(c.frz), detail: c.m ? `Motivo: ${c.m}` : 'Sin motivo registrado' });
  }

  if (c.ff) {
    let fc = 'emerald', ft = 'Revisión Final: Aprobado';
    if (c.e && c.e.includes('RECHAZADA')) { fc = 'rose'; ft = 'Revisión Final: Rechazado'; }
    else if (c.e && c.e.includes('CANCELADA')) { fc = 'amber'; ft = 'Revisión Final: Cancelado'; }
    else if (c.e === 'NO CONFIRMADA') { fc = 'slate'; ft = 'Sin Confirmar'; }
    else if (c.e === 'CREADA') { fc = 'blue'; ft = 'Solo Creada'; }
    steps.push({ color: fc, title: ft, date: fmtDate(c.ff), detail: `Ciclo total: ${c.tt != null ? c.tt.toFixed(1) + 'h' : '-'}` });
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
        <i data-lucide="file-question" className="w-10 h-10 text-slate-300" />
        <div>
          <p className="text-sm font-semibold text-slate-500">Sin datos de trazabilidad</p>
          <p className="text-xs text-slate-400 mt-1">Este expediente no tiene fechas registradas</p>
        </div>
      </div>
    );
  }

  let bc = 'emerald';
  if (c.e && c.e.includes('RECHAZADA')) bc = 'rose';
  else if (c.e && c.e.includes('CANCELADA')) bc = 'amber';
  const bgCard = bc === 'rose' ? 'bg-rose-50 border-rose-200' : bc === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
  const textTitle = bc === 'rose' ? 'text-rose-800' : bc === 'amber' ? 'text-amber-800' : 'text-emerald-800';

  return (
    <>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 ${dotColor(s.color)} rounded-full mt-1`} />
            {i < steps.length - 1 && <div className="w-px h-full bg-slate-200 my-1" />}
          </div>
          <div className="pb-2">
            <div className="text-[10px] font-bold text-slate-400">{s.date}</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">{s.title}</div>
            <div className="text-[11px] text-slate-500">{s.detail}</div>
          </div>
        </div>
      ))}

      {c.fc && c.fa && c.tc != null && delayColor && (
        <div className="flex gap-3 -my-1">
          <div className="flex flex-col items-center">
            <div className={`w-px h-[28px] border-l-2 border-dashed ${lineClass(delayColor)}`} />
          </div>
          <div className="flex flex-col gap-1">
            <span className={`${badgeClass(delayColor)} border text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1`}>
              <i data-lucide="clock" className={`w-3 h-3 ${iconColor(delayColor)}`} /> {c.tc.toFixed(1)}h en cola de servidor
            </span>
            <span className="text-[10px] text-slate-400 pl-1">Creación → Asignación: {delayDetail}</span>
          </div>
        </div>
      )}

      {c.ff && (
        <div className={`mt-4 p-3 ${bgCard} border rounded-xl text-center`}>
          <div className={`text-[10px] font-bold ${textTitle} uppercase tracking-wider`}>Resumen del Expediente</div>
          <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-500">Cola</div>
              <div className="font-mono font-bold text-slate-800">{c.tc != null ? c.tc.toFixed(1) + 'h' : '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Ciclo Total</div>
              <div className="font-mono font-bold text-slate-800">{c.tt != null ? c.tt.toFixed(1) + 'h' : '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Eventos</div>
              <div className="font-mono font-bold text-slate-800">{c.ne || '-'}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function regionLabel(r: string): string {
  const map: Record<string, string> = { CENTRAL: 'Central', OCCIDENTE: 'Occidente', NORORIENTE: 'Nororiente', SUR: 'Sur' };
  return map[r] || r || '-';
}

function dotColor(color: string): string {
  return color === 'rose' ? 'bg-rose-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'indigo' ? 'bg-indigo-500' : color === 'blue' ? 'bg-blue-500' : 'bg-slate-500';
}

function lineClass(color: string): string {
  return color === 'rose' ? 'border-rose-400' : color === 'amber' ? 'border-amber-400' : color === 'emerald' ? 'border-emerald-400' : 'border-slate-300';
}

function badgeClass(color: string): string {
  return color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' : color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' : color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200';
}

function iconColor(color: string): string {
  return color === 'rose' ? 'text-rose-500' : color === 'amber' ? 'text-amber-500' : color === 'emerald' ? 'text-emerald-500' : 'text-slate-400';
}