import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface Props {
  months: string[];
  central: (number | null)[];
  occidente: (number | null)[];
  sur: (number | null)[];
  nororiente: (number | null)[];
  title?: string;
  yAxisName?: string;
}

export default function RegionalTrendsChart({
  months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02'],
  central = [4.1, 3.8, 3.9, 4.2, 3.7],
  occidente = [3.5, 3.4, 3.6, 3.9, 3.3],
  sur = [4.3, 4.1, 4.4, 4.6, 4.0],
  nororiente = [3.8, 3.7, 3.8, 4.0, 3.6],
  title = "Espera en Cola (Horas Hábiles) por Región",
  yAxisName = "Horas Hábiles"
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
        left: 'left'
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let res = `<strong>${params[0].name}</strong><br/>`;
          params.forEach((p: any) => {
            res += `${p.marker} ${p.seriesName}: <strong>${p.value != null ? p.value + ' h' : '-'}</strong><br/>`;
          });
          return res;
        }
      },
      legend: {
        data: ['Central', 'Occidente', 'Sur', 'Nororiente'],
        top: 25,
        icon: 'circle'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '25%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLine: { lineStyle: { color: '#94A3B8' } }
      },
      yAxis: {
        type: 'value',
        name: yAxisName,
        splitLine: { lineStyle: { color: '#F1F5F9' } }
      },
      series: [
        { name: 'Central', type: 'line', data: central, smooth: true, itemStyle: { color: '#EF4444' }, lineStyle: { width: 3 } },
        { name: 'Occidente', type: 'line', data: occidente, smooth: true, itemStyle: { color: '#3B82F6' }, lineStyle: { width: 3 } },
        { name: 'Sur', type: 'line', data: sur, smooth: true, itemStyle: { color: '#F59E0B' }, lineStyle: { width: 3 } },
        { name: 'Nororiente', type: 'line', data: nororiente, smooth: true, itemStyle: { color: '#10B981' }, lineStyle: { width: 3 } }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [months, central, occidente, sur, nororiente, title]);

  return <div ref={chartRef} className="w-full h-80 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm" />;
}
