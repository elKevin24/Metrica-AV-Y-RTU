const fs = require('fs');
const path = require('path');

const chunkDir = path.join(__dirname, 'public', 'data', 'forensic');
const files = fs.readdirSync(chunkDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json'));

let totalCases = 0;
let cola_hab = [];
let cola_cal = [];
let total_hab = [];
let total_cal = [];
let fa_fr_sec = [];
let fr_ff_sec = [];

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(chunkDir, file), 'utf8'));
  for (const c of content) {
    totalCases++;
    if (c.th != null && !isNaN(c.th)) cola_hab.push(c.th);
    if (c.tc != null && !isNaN(c.tc)) cola_cal.push(c.tc);
    if (c.tth != null && !isNaN(c.tth)) total_hab.push(c.tth);
    if (c.tt != null && !isNaN(c.tt)) total_cal.push(c.tt);

    if (c.fa && c.fr) {
      const dFa = new Date(c.fa.replace(' ', 'T')).getTime();
      const dFr = new Date(c.fr.replace(' ', 'T')).getTime();
      if (!isNaN(dFa) && !isNaN(dFr) && dFr >= dFa) {
        fa_fr_sec.push((dFr - dFa) / 1000);
      }
    }

    if (c.fr && c.ff) {
      const dFr = new Date(c.fr.replace(' ', 'T')).getTime();
      const dFf = new Date(c.ff.replace(' ', 'T')).getTime();
      if (!isNaN(dFr) && !isNaN(dFf) && dFf >= dFr) {
        fr_ff_sec.push((dFf - dFr) / 1000);
      }
    }
  }
}

const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const median = arr => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid-1]+s[mid])/2;
};

const lines = [];
lines.push('=== VALIDACION FORENSE OFICIAL (135,628 EXPEDIENTES ATENDIDOS) ===');
lines.push(`Total expedientes analizados: ${totalCases}`);

lines.push('\n1. TIEMPO EN COLA / BUZON (fechacreacion -> fechaasignacion):');
lines.push(`   - Promedio Habil: ${avg(cola_hab).toFixed(2)} horas (${Math.floor(avg(cola_hab))}h ${Math.round((avg(cola_hab)%1)*60)}m)`);
lines.push(`   - Mediana Habil: ${median(cola_hab).toFixed(2)} horas`);
lines.push(`   - Promedio Calendario: ${avg(cola_cal).toFixed(2)} horas (~${(avg(cola_cal)/24).toFixed(1)} dias)`);
lines.push(`   - Mediana Calendario: ${median(cola_cal).toFixed(2)} horas`);

lines.push('\n2. BANDEJA ACTIVA DEL REVISOR / PRIMERA REVISION (fechaasignacion -> fecharevision):');
lines.push(`   - Promedio Segundos: ${avg(fa_fr_sec).toFixed(1)} s (${(avg(fa_fr_sec)/60).toFixed(2)} minutos)`);
lines.push(`   - Mediana Segundos: ${median(fa_fr_sec).toFixed(1)} s`);

lines.push('\n3. SUBSANACION / RESOLUCION TRAS RECHAZO (fecharevision -> fechafinaliza):');
lines.push(`   - Promedio Horas Calendario: ${(avg(fr_ff_sec)/3600).toFixed(2)} horas`);

lines.push('\n4. CICLO TOTAL DE LA GESTION (fechacreacion -> fechafinaliza):');
lines.push(`   - Promedio Habil: ${avg(total_hab).toFixed(2)} horas (${Math.floor(avg(total_hab))}h ${Math.round((avg(total_hab)%1)*60)}m)`);
lines.push(`   - Mediana Habil: ${median(total_hab).toFixed(2)} horas`);
lines.push(`   - Promedio Calendario: ${avg(total_cal).toFixed(2)} horas (~${(avg(total_cal)/24).toFixed(1)} dias)`);
lines.push(`   - Mediana Calendario: ${median(total_cal).toFixed(2)} horas`);

const diffHab = avg(total_hab) - avg(cola_hab);
const diffCal = avg(total_cal) - avg(cola_cal);
lines.push('\n5. TIEMPO TOTAL EN MANOS DE AUDITORIA/SUBSANACION (Ciclo Total - Cola):');
lines.push(`   - Promedio Habil Restante: ${diffHab.toFixed(2)} horas (${Math.floor(diffHab)}h ${Math.round((diffHab%1)*60)}m)`);
lines.push(`   - Promedio Calendario Restante: ${diffCal.toFixed(2)} horas (~${(diffCal/24).toFixed(1)} dias)`);

fs.writeFileSync('audit_result.txt', lines.join('\n'), 'utf8');
console.log('AUDIT_COMPLETED_SUCCESSFULLY');
