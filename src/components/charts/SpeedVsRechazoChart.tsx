import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function SpeedVsRechazoChart() {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      title: {
        text: 'Tiempo de Revisión en Pantalla vs % de Rechazo',
        subtext: 'Los trámites con problemas tardan minutos en auditarse y se rechazan masivamente',
        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
        subtextStyle: { fontSize: 11, color: '#64748B' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: <strong>{c}% de rechazo</strong>'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '22%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['≤ 2 seg', '2 - 5 seg', '5 - 15 seg', '15 - 60 seg', '1 - 5 min', '> 5 min']
      },
      yAxis: {
        type: 'value',
        name: '% Tasa de Rechazo',
        max: 100,
        splitLine: { lineStyle: { color: '#F1F5F9' } }
      },
      series: [{
        name: '% Rechazo',
        type: 'bar',
        data: [
          { value: 25.0, itemStyle: { color: '#10B981' } },
          { value: 26.5, itemStyle: { color: '#3B82F6' } },
          { value: 20.3, itemStyle: { color: '#6366F1' } },
          { value: 26.4, itemStyle: { color: '#8B5CF6' } },
          { value: 85.9, itemStyle: { color: '#F59E0B' } },
          { value: 98.6, itemStyle: { color: '#EF4444' } }
        ],
        barWidth: '45%',
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          fontWeight: 'bold',
          fontSize: 11
        }
      }]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return <div ref={chartRef} className="w-full h-80 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm" />;
}
