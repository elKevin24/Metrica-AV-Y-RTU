const fs = require('fs');
const path = require('path');

const chunkDir = path.join(__dirname, 'public', 'data', 'forensic');
const files = fs.readdirSync(chunkDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json'));

let count = 0;
let sum_th = 0;
let count_th = 0;
let sum_tc = 0;
let count_tc = 0;
let sum_tth = 0;
let count_tth = 0;
let sum_tt = 0;
let count_tt = 0;
let sum_fa_fr_sec = 0;
let count_fa_fr = 0;

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(chunkDir, file), 'utf8'));
  for (const c of content) {
    count++;
    if (typeof c.th === 'number' && !isNaN(c.th)) { sum_th += c.th; count_th++; }
    if (typeof c.tc === 'number' && !isNaN(c.tc)) { sum_tc += c.tc; count_tc++; }
    if (typeof c.tth === 'number' && !isNaN(c.tth)) { sum_tth += c.tth; count_tth++; }
    if (typeof c.tt === 'number' && !isNaN(c.tt)) { sum_tt += c.tt; count_tt++; }

    if (c.fa && c.fr) {
      const dFa = new Date(c.fa.replace(' ', 'T')).getTime();
      const dFr = new Date(c.fr.replace(' ', 'T')).getTime();
      if (!isNaN(dFa) && !isNaN(dFr) && dFr >= dFa) {
        sum_fa_fr_sec += (dFr - dFa) / 1000;
        count_fa_fr++;
      }
    }
  }
}

const out = [];
out.push('=== REPORTE AUDITADO REGISTRO POR REGISTRO (135,628 CASOS) ===');
out.push('Expedientes totales: ' + count);
out.push('\n1. COLA (fechacreacion -> fechaasignacion):');
out.push('   - Promedio Habil: ' + (sum_th / count_th).toFixed(2) + ' horas');
out.push('   - Promedio Calendario: ' + (sum_tc / count_tc).toFixed(2) + ' horas');

out.push('\n2. BANDEJA DEL AUDITOR / PRIMERA REVISION (fechaasignacion -> fecharevision):');
out.push('   - Promedio Segundos: ' + (sum_fa_fr_sec / count_fa_fr).toFixed(1) + ' seg');
out.push('   - Promedio Minutos: ' + ((sum_fa_fr_sec / count_fa_fr) / 60).toFixed(2) + ' min');

out.push('\n3. CICLO TOTAL (fechacreacion -> fechafinaliza):');
out.push('   - Promedio Habil: ' + (sum_tth / count_tth).toFixed(2) + ' horas');
out.push('   - Promedio Calendario: ' + (sum_tt / count_tt).toFixed(2) + ' horas');

out.push('\n4. TIEMPO OPERATIVO RESTANTE (TOTAL - COLA):');
out.push('   - Habil: ' + ((sum_tth / count_tth) - (sum_th / count_th)).toFixed(2) + ' horas');
out.push('   - Calendario: ' + ((sum_tt / count_tt) - (sum_tc / count_tc)).toFixed(2) + ' horas');

fs.writeFileSync('audit_out.txt', out.join('\n'), 'utf8');
