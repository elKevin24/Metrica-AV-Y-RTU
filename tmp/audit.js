const fs = require('fs');
const zlib = require('zlib');

const gz = fs.readFileSync('public/data/forensic_cases.json.gz');
const cases = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));

let cola_hab = [];
let cola_cal = [];
let total_hab = [];
let total_cal = [];
let asig_rev_sec = [];
let rev_fin_sec = [];

for (const c of cases) {
  if (c.th != null && !isNaN(c.th)) cola_hab.push(c.th);
  if (c.tc != null && !isNaN(c.tc)) cola_cal.push(c.tc);
  if (c.tth != null && !isNaN(c.tth)) total_hab.push(c.tth);
  if (c.tt != null && !isNaN(c.tt)) total_cal.push(c.tt);

  if (c.fa && c.fr) {
    const dFa = new Date(c.fa.replace(' ', 'T')).getTime();
    const dFr = new Date(c.fr.replace(' ', 'T')).getTime();
    if (!isNaN(dFa) && !isNaN(dFr) && dFr >= dFa) {
      asig_rev_sec.push((dFr - dFa) / 1000);
    }
  }

  if (c.fr && c.ff) {
    const dFr = new Date(c.fr.replace(' ', 'T')).getTime();
    const dFf = new Date(c.ff.replace(' ', 'T')).getTime();
    if (!isNaN(dFr) && !isNaN(dFf) && dFf >= dFr) {
      rev_fin_sec.push((dFf - dFr) / 1000);
    }
  }
}

const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

console.log('=== AUDITORIA DIRECTA DE TODAS LAS GESTIONES ===');
console.log('1. COLA (Creacion -> Asignacion):');
console.log('   Habil Promedio:', avg(cola_hab).toFixed(2), 'horas');
console.log('   Calendario Promedio:', avg(cola_cal).toFixed(2), 'horas');

console.log('\n2. ASIGNACION -> PRIMERA REVISION (fa -> fr):');
console.log('   Promedio Segundos:', avg(asig_rev_sec).toFixed(1), 'seg');
console.log('   Promedio Minutos:', (avg(asig_rev_sec) / 60).toFixed(2), 'min');

console.log('\n3. TOTAL CICLO (Creacion -> Finalizacion):');
console.log('   Habil Promedio:', avg(total_hab).toFixed(2), 'horas');
console.log('   Calendario Promedio:', avg(total_cal).toFixed(2), 'horas');
