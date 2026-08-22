import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/busqu/.gemini/antigravity/brain/d5782407-d810-4fe4-9d35-f0fc8428c067';

async function runAudit() {
  console.log('[1/4] Iniciando Chromium con Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  console.log('[2/4] Navegando a http://127.0.0.1:4321/Metrica-AV-Y-RTU/...');
  const startTime = Date.now();
  await page.goto('http://127.0.0.1:4321/Metrica-AV-Y-RTU/', { waitUntil: 'domcontentloaded' });
  const loadTime = Date.now() - startTime;
  console.log(`[OK] Página cargada en ${loadTime} ms`);

  // Esperar a que los datos estén listos
  await page.waitForFunction(() => window.DATA && window.DATA.loaded, { timeout: 10000 });
  await page.waitForTimeout(400);

  const tabs = [
    { id: 'tab-macro', btnId: 'btn-macro', name: 'tab_01_vision', title: '01. Visión & Balance' },
    { id: 'tab-operativo', btnId: 'btn-operativo', name: 'tab_02_rendimiento', title: '02. Rendimiento & Regionales' },
    { id: 'tab-tiempos', btnId: 'btn-tiempos', name: 'tab_03_slas', title: '03. Jornada 8h & SLAs' },
    { id: 'tab-calidad', btnId: 'btn-calidad', name: 'tab_04_calidad', title: '04. Calidad, Rechazos & Fricción' },
    { id: 'tab-gestion', btnId: 'btn-gestion', name: 'tab_05_operadores', title: '05. Operadores & Dispersión' },
    { id: 'tab-auditoria', btnId: 'btn-auditoria', name: 'tab_06_auditoria', title: '06. Auditoría en Horas (DataTables)' },
    { id: 'tab-hallazgos', btnId: 'btn-hallazgos', name: 'tab_07_hallazgos', title: '07. Hallazgos & Conclusiones' }
  ];

  console.log('[3/4] Auditando y capturando cada pestaña...');
  const auditResults = [];

  for (const tab of tabs) {
    console.log(`\n👉 Evaluando: ${tab.title}...`);
    await page.click(`#${tab.btnId}`);
    await page.waitForTimeout(600);

    const screenshotPath = path.join(ARTIFACTS_DIR, `${tab.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const state = await page.evaluate((tabId) => {
      const section = document.getElementById(tabId);
      const isVisible = section && !section.classList.contains('hidden');
      const canvases = section ? Array.from(section.querySelectorAll('canvas')).map(c => ({
        id: c.id,
        width: c.clientWidth,
        height: c.clientHeight
      })) : [];
      const tables = section ? section.querySelectorAll('table').length : 0;
      const textPreview = section ? section.innerText.slice(0, 140).replace(/\s+/g, ' ') : '';

      return { isVisible, canvases, tables, textPreview };
    }, tab.id);

    console.log(`   ✓ Visible: ${state.isVisible}`);
    console.log(`   ✓ Canvases: ${state.canvases.length} (${state.canvases.map(c => `${c.id}: ${c.width}x${c.height}`).join(', ') || 'N/A'})`);
    console.log(`   ✓ Tablas: ${state.tables}`);
    console.log(`   📸 Captura guardada: ${tab.name}.png`);

    auditResults.push({
      tab: tab.title,
      ...state,
      screenshot: `${tab.name}.png`
    });
  }

  await browser.close();

  console.log('\n[4/4] Resumen de la Auditoría con Playwright:');
  console.log(`Total pestañas verificadas: ${tabs.length}`);
  console.log(`Errores de consola: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errores:', consoleErrors);
  }
}

runAudit().catch(console.error);
