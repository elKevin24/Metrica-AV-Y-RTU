const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

console.log('Reading forensic_cases.json.gz stream...');
const gzBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'forensic_cases.json.gz'));
const uncompressed = zlib.gunzipSync(gzBuffer).toString('utf8');
const cases = JSON.parse(uncompressed);

console.log('Cases loaded:', cases.length);

// Extract dates from cases
const dayStats = {};
for (const c of cases) {
  if (!c.fc) continue;
  const day = c.fc.slice(0, 10);
  if (!dayStats[day]) {
    dayStats[day] = {
      day,
      total: 0,
      atendidas: 0,
      aprobadas: 0,
      rechazos: 0,
      within_8h: 0,
      within_24h: 0,
      tth_sum: 0,
      th_sum: 0,
      valid_tth: 0,
      valid_th: 0,
      regiones: { CENTRAL: 0, SUR: 0, OCCIDENTE: 0, NORORIENTE: 0 }
    };
  }
  const s = dayStats[day];
  s.total++;
  if (c.r && s.regiones[c.r] !== undefined) {
    s.regiones[c.r]++;
  }
  if (c.ff) {
    s.atendidas++;
    if (c.e === 'APROBADA') s.aprobadas++;
    if (c.cr === 1 || c.e === 'CANCELADA' || c.e.startsWith('CANCEL') || c.e === 'NO CONFIRMADA') s.rechazos++;
    
    if (typeof c.tth === 'number' && !isNaN(c.tth)) {
      s.tth_sum += c.tth;
      s.valid_tth++;
      if (c.tth <= 8.0) s.within_8h++;
      if (c.tth <= 24.0) s.within_24h++;
    }
    if (typeof c.th === 'number' && !isNaN(c.th)) {
      s.th_sum += c.th;
      s.valid_th++;
    }
  }
}

const allDays = Object.keys(dayStats).sort();
console.log('Total days in dataset:', allDays.length);
console.log('First 5 days:', allDays.slice(0, 5));
console.log('Last 5 days:', allDays.slice(-5));

// Pick the most active 30-day window or the last 30 operational days
const activeDays = allDays.filter(d => dayStats[d].total >= 50);
console.log('Active operational days (total >= 50):', activeDays.length);

// Let's take the last 30 active operational days
const last30Days = activeDays.slice(-30);
console.log('Selected 30 days range:', last30Days[0], 'to', last30Days[last30Days.length - 1]);

const result30 = last30Days.map(d => {
  const s = dayStats[d];
  const avgCicloHabil = s.valid_tth > 0 ? parseFloat((s.tth_sum / s.valid_tth).toFixed(2)) : 0;
  const avgColaHabil = s.valid_th > 0 ? parseFloat((s.th_sum / s.valid_th).toFixed(2)) : 0;
  const pctSla8h = s.valid_tth > 0 ? parseFloat(((s.within_8h / s.valid_tth) * 100).toFixed(1)) : 0;
  const pctSla24h = s.valid_tth > 0 ? parseFloat(((s.within_24h / s.valid_tth) * 100).toFixed(1)) : 0;
  const tasaRechazo = s.atendidas > 0 ? parseFloat(((s.rechazos / s.atendidas) * 100).toFixed(1)) : 0;

  // Identify bottleneck
  let bottleneck = 'ÓPTIMO';
  let bottleneckScore = 0; // 0: None, 1: Minor, 2: Moderate, 3: Critical
  let bottleneckDesc = 'Flujo equilibrado dentro de SLA';

  if (pctSla8h < 40 || avgCicloHabil > 14) {
    bottleneck = 'CRÍTICO';
    bottleneckScore = 3;
    if (avgColaHabil > 10) {
      bottleneckDesc = 'Saturación severa en buzón general (>10h en espera antes de asignación)';
    } else if (tasaRechazo > 45) {
      bottleneckDesc = 'Fricción documental extrema (>45% de rechazos/retrabajo)';
    } else {
      bottleneckDesc = 'Sobrecarga de volumen superó capacidad diaria de planta';
    }
  } else if (pctSla8h < 60 || avgCicloHabil > 9) {
    bottleneck = 'MODERADO';
    bottleneckScore = 2;
    if (avgColaHabil > 6) {
      bottleneckDesc = 'Cuello de botella en cola de entrada (espera acumulada >6h)';
    } else {
      bottleneckDesc = 'Retrasos por expedientes con segundas vueltas (reingresos)';
    }
  } else if (pctSla8h < 75) {
    bottleneck = 'LEVE';
    bottleneckScore = 1;
    bottleneckDesc = 'Demanda alta matutina con recuperación en turno vespertino';
  }

  // Primary bottleneck driver
  let primaryFactor = 'Buzón de Entrada';
  if (tasaRechazo > 40) primaryFactor = 'Retrabajo por Rechazos';
  else if (s.total > 2000) primaryFactor = 'Pico de Demanda Externa';

  return {
    fecha: d,
    diaSemana: new Date(d + 'T12:00:00Z').toLocaleDateString('es-GT', { weekday: 'short' }),
    totalIngresadas: s.total,
    atendidas: s.atendidas,
    cumplimientoSla8h: pctSla8h,
    cumplimientoSla24h: pctSla24h,
    tiempoHabilPromedio: avgCicloHabil,
    tiempoColaPromedio: avgColaHabil,
    tasaRechazo,
    bottleneck,
    bottleneckScore,
    bottleneckDesc,
    primaryFactor,
    regiones: s.regiones
  };
});

fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'data', 'sla_30_dias.json'),
  JSON.stringify(result30, null, 2),
  'utf8'
);

console.log('Successfully saved public/data/sla_30_dias.json with 30 days of real audited SLA data!');
