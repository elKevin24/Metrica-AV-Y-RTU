import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface OperatorData {
  name: string;
  volume: number;
  rejectRate: number;
  avgSeconds: number;
  category: 'benchmark' | 'strict' | 'permissive' | 'learning';
}

const DEFAULT_OPERATORS: OperatorData[] = [
  { name: 'FOMONZON', volume: 16420, rejectRate: 28.4, avgSeconds: 1.8, category: 'benchmark' },
  { name: 'AMHERNAN', volume: 14890, rejectRate: 26.9, avgSeconds: 1.9, category: 'benchmark' },
  { name: 'JJCOTOMM', volume: 13250, rejectRate: 27.8, avgSeconds: 1.7, category: 'benchmark' },
  { name: 'EESAMAYO', volume: 12100, rejectRate: 29.1, avgSeconds: 2.0, category: 'benchmark' },
  { name: 'MRCANO', volume: 11400, rejectRate: 25.5, avgSeconds: 1.8, category: 'benchmark' },
  { name: 'CAGUTIERREZ', volume: 9850, rejectRate: 28.0, avgSeconds: 2.1, category: 'benchmark' },
  { name: 'LELOPEZ', volume: 8900, rejectRate: 31.2, avgSeconds: 2.4, category: 'benchmark' },
  { name: 'DMVARELA', volume: 8450, rejectRate: 24.8, avgSeconds: 1.9, category: 'benchmark' },
  { name: 'JAPEREZ', volume: 7600, rejectRate: 27.3, avgSeconds: 2.2, category: 'benchmark' },
  { name: 'RMMORALES', volume: 6800, rejectRate: 33.5, avgSeconds: 2.8, category: 'benchmark' },
  { name: 'OPERADOR_ESTRICTO_1', volume: 5400, rejectRate: 46.2, avgSeconds: 4.5, category: 'strict' },
  { name: 'OPERADOR_ESTRICTO_2', volume: 4900, rejectRate: 42.8, avgSeconds: 5.1, category: 'strict' },
  { name: 'OPERADOR_RAPIDO_1', volume: 8200, rejectRate: 11.4, avgSeconds: 1.4, category: 'permissive' },
  { name: 'OPERADOR_RAPIDO_2', volume: 6500, rejectRate: 13.8, avgSeconds: 1.6, category: 'permissive' },
  { name: 'APOYO_TEMPORAL_1', volume: 850, rejectRate: 34.0, avgSeconds: 95.0, category: 'learning' },
  { name: 'APOYO_TEMPORAL_2', volume: 420, rejectRate: 38.5, avgSeconds: 144.0, category: 'learning' },
  { name: 'APOYO_TEMPORAL_3', volume: 610, rejectRate: 29.2, avgSeconds: 110.0, category: 'learning' },
];

export default function OperatorScatterChart() {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const seriesData = DEFAULT_OPERATORS.map(op => {
      let color = '#10B981';
      if (op.category === 'strict') color = '#3B82F6';
      if (op.category === 'permissive') color = '#F59E0B';
      if (op.category === 'learning') color = '#EF4444';

      return {
        value: [op.volume, op.rejectRate, op.avgSeconds, op.name, op.category],
        itemStyle: {
          color: color,
          opacity: 0.85,
          borderColor: '#1E293B',
          borderWidth: 1
        }
      };
    });

    const option: echarts.EChartsOption = {
      title: {
        text: 'Matriz de Dispersión: Rendimiento vs Severidad de Operadores (4 Cuadrantes)',
        subtext: 'Burbujas: Tamaño = Tiempo Medio en Pantalla (s) | Ejes: Volumen vs % Rechazo',
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
        subtextStyle: { fontSize: 11, color: '#64748B' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const d = params.value;
          const name = d[3];
          const vol = d[0].toLocaleString();
          const rech = d[1].toFixed(1);
          const sec = d[2].toFixed(1);
          const cat = d[4];

          let catLabel = '🟢 Benchmark (Alta Productividad & Rigor Óptimo)';
          if (cat === 'strict') catLabel = '🔵 Alta Severidad (Auditoría Estricta)';
          if (cat === 'permissive') catLabel = '🟡 Alerta de Calidad (Posible Permisividad)';
          if (cat === 'learning') catLabel = '🔴 Curva de Aprendizaje / Apoyo Ocasional';

          return `
            <div style="font-size:12px; line-height: 1.5; padding: 4px;">
              <strong style="font-size:13px; color:#1E293B;">👤 Operador: ${name}</strong><br/>
              <span style="color:#64748B;">Clasificación:</span> <strong>${catLabel}</strong><br/>
              <hr style="margin:4px 0; border:0; border-top:1px solid #E2E8F0;"/>
              📊 <strong>Volumen Atendido:</strong> ${vol} trámites<br/>
              🔴 <strong>Tasa de Rechazo:</strong> ${rech}%<br/>
              ⏱️ <strong>Tiempo Medio en Pantalla:</strong> ${sec} seg
            </div>
          `;
        }
      },
      grid: { left: '4%', right: '5%', bottom: '10%', top: '20%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Volumen de Trámites Procesados',
        nameLocation: 'middle',
        nameGap: 30,
        axisLine: { lineStyle: { color: '#94A3B8' } },
        splitLine: { lineStyle: { color: '#F1F5F9' } }
      },
      yAxis: {
        type: 'value',
        name: 'Tasa de Rechazo (%)',
        min: 0,
        max: 60,
        axisLabel: { formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F1F5F9' } }
      },
      series: [
        {
          name: 'Operadores',
          type: 'scatter',
          data: seriesData,
          symbolSize: (data: any) => {
            const sec = data[2];
            if (sec <= 5) return 16;
            if (sec <= 30) return 24;
            return Math.min(45, Math.max(28, sec / 3));
          },
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed', color: '#94A3B8' },
            data: [
              { yAxis: 27.5, name: 'Media Rechazo (27.5%)' },
              { xAxis: 4000, name: 'Umbral Titulares (4k)' }
            ],
            label: {
              formatter: '{b}: {c}',
              position: 'insideEndTop',
              fontSize: 10,
              color: '#64748B'
            }
          }
        }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div ref={chartRef} className="w-full h-96" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
          <span className="font-bold text-emerald-900 block text-xs">🟢 Benchmark (&gt;4k casos | ~27% rech)</span>
          <span className="text-emerald-700 text-[11px] mt-0.5 block">Alta velocidad (1.8s) con control de calidad óptimo.</span>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl">
          <span className="font-bold text-blue-900 block text-xs">🔵 Alta Severidad (&gt;40% rechazo)</span>
          <span className="text-blue-700 text-[11px] mt-0.5 block">Criterio estricto; auditan a fondo cada expediente.</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
          <span className="font-bold text-amber-900 block text-xs">🟡 Alerta Calidad (&lt;15% rechazo)</span>
          <span className="text-amber-700 text-[11px] mt-0.5 block">Riesgo de aprobación superficial o permisividad.</span>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
          <span className="font-bold text-rose-900 block text-xs">🔴 Curva de Aprendizaje (&gt;60s tiempo)</span>
          <span className="text-rose-700 text-[11px] mt-0.5 block">Personal ocasional que requiere estandarización.</span>
        </div>
      </div>
    </div>
  );
}
