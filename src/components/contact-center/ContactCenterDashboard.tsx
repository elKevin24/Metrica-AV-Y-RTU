import React, { useState, useMemo } from 'react';
import initialCasesData from '../../data/contactCenterInitialData.json';
import chatStatsData from '../../data/contactCenterChatStats.json';
import type { ChatStatsSummary, SpecialCase, SpecialCaseTimeMetrics } from '../../types/contactCenter';
import { Header } from './Header';
import { TimeOverviewView } from './TimeOverviewView';
import { CaseDetailModal } from './CaseDetailModal';
import { DataUploadModal } from './DataUploadModal';
import { ExportModal } from './ExportModal';
import { calculateComprehensiveStats } from '../../utils/contactCenter/timeStats';

const DEFAULT_CASES = initialCasesData as SpecialCase[];
const CHAT_STATS = chatStatsData as ChatStatsSummary;

export const ContactCenterDashboard: React.FC = () => {
  const [allCases, setAllCases] = useState<SpecialCase[]>(DEFAULT_CASES);
  const [isCustomDataset, setIsCustomDataset] = useState(false);

  const [selectedCase, setSelectedCase] = useState<SpecialCase | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const timeMetrics: SpecialCaseTimeMetrics = useMemo(() => {
    const stats = calculateComprehensiveStats(allCases);

    const totalCases = allCases.length;
    const resolvedCases = allCases.filter((c) => c.estado === 'Resuelto').length;
    const pendingCases = totalCases - resolvedCases;
    const resolutionRate = totalCases > 0 ? Number(((resolvedCases / totalCases) * 100).toFixed(1)) : 0;

    const tipifTimes: Record<string, { sumHours: number; count: number }> = {};
    allCases.forEach((c) => {
      if (!tipifTimes[c.tipificacion]) tipifTimes[c.tipificacion] = { sumHours: 0, count: 0 };
      tipifTimes[c.tipificacion].sumHours += Math.round(c.tiempoSolucionDias * 8);
      tipifTimes[c.tipificacion].count += 1;
    });

    const rankedTipifs = Object.entries(tipifTimes)
      .map(([name, data]) => ({
        name,
        avgHours: Number((data.sumHours / data.count).toFixed(2)),
        count: data.count,
      }))
      .filter((t) => t.count >= 3)
      .sort((a, b) => b.avgHours - a.avgHours);

    const topSlowTipificacion = rankedTipifs[0] || { name: 'N/A', avgHours: 0, count: 0 };
    const topFastTipificacion = rankedTipifs[rankedTipifs.length - 1] || { name: 'N/A', avgHours: 0, count: 0 };

    const areaTimes: Record<string, { sumHours: number; count: number }> = {};
    allCases.forEach((c) => {
      const area = c.areaResolucion || 'No asignada';
      if (!areaTimes[area]) areaTimes[area] = { sumHours: 0, count: 0 };
      areaTimes[area].sumHours += Math.round(c.tiempoSolucionDias * 8);
      areaTimes[area].count += 1;
    });

    const rankedAreas = Object.entries(areaTimes)
      .map(([name, data]) => ({
        name,
        avgHours: Number((data.sumHours / data.count).toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => b.avgHours - a.avgHours);

    const topSlowArea = rankedAreas[0] || { name: 'N/A', avgHours: 0, count: 0 };

    const supTimes: Record<string, { sumHours: number; count: number }> = {};
    allCases.forEach((c) => {
      const sup = c.supervisor || 'No asignado';
      if (!supTimes[sup]) supTimes[sup] = { sumHours: 0, count: 0 };
      supTimes[sup].sumHours += Math.round(c.tiempoSolucionDias * 8);
      supTimes[sup].count += 1;
    });

    const rankedSups = Object.entries(supTimes)
      .map(([name, data]) => ({
        name,
        avgHours: Number((data.sumHours / data.count).toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.avgHours - b.avgHours);

    const topFastSupervisor = rankedSups[0] || { name: 'N/A', avgHours: 0, count: 0 };

    return {
      totalCases,
      resolvedCases,
      pendingCases,
      resolutionRate,
      topSlowTipificacion,
      topFastTipificacion,
      topSlowArea,
      topFastSupervisor,
      stats,
    };
  }, [allCases]);

  return (
    <div className="space-y-6">
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onExport={() => setIsExportOpen(true)}
        totalCases={allCases.length}
        totalSumHours={timeMetrics.stats.sumHours}
        isCustomDataset={isCustomDataset}
      />

      <TimeOverviewView
        cases={allCases}
        metrics={timeMetrics}
        chatStats={CHAT_STATS}
        onSelectCase={(c) => setSelectedCase(c)}
      />

      <CaseDetailModal caseItem={selectedCase} onClose={() => setSelectedCase(null)} />

      <DataUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpdateSpecialCases={(newCases) => {
          setAllCases(newCases);
          setIsCustomDataset(true);
        }}
        onResetToDefaults={() => {
          setAllCases(DEFAULT_CASES);
          setIsCustomDataset(false);
        }}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredCases={allCases}
      />
    </div>
  );
};

export default ContactCenterDashboard;
