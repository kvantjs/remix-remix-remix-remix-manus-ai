const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Maximum update') || msg.text().includes('Warning:')) {
      console.log('CONSOLE:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGEERROR CAUGHT:');
    console.log(err.message);
    console.log(err.stack);
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Test 1: Click all tabs in Workspace
  console.log('Testing Workspace tabs...');
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.innerText().catch(() => '');
    if (text.includes('Computador') || text.includes('Home.tsx') || text.includes('Código') || text.includes('Preview') || text.includes('Terminal')) {
      console.log('Clicking button:', text.replace(/\n/g, ' '));
      await btn.click().catch(() => {});
      await page.waitForTimeout(600);
    }
  }

  // Test 2: Try typing in Chat and sending a message
  console.log('Testing Chat Send...');
  const textarea = page.locator('textarea');
  if (await textarea.count() > 0) {
    await textarea.first().fill('Acesse https://www.google.com pelo computador');
    const sendBtn = page.locator('button:has(svg)').last();
    console.log('Clicking send...');
    await sendBtn.click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Test 3: Try clicking suggestion buttons
  console.log('Testing Suggestions...');
  const suggestions = await page.locator('div[role="button"], button').all();
  for (const s of suggestions) {
    const text = await s.innerText().catch(() => '');
    if (text.includes('Pesquisar na web')) {
      console.log('Clicking suggestion:', text.slice(0, 30));
      await s.click().catch(() => {});
      await page.waitForTimeout(4000);
      break;
    }
  }

  await page.waitForTimeout(4000);
  console.log('Done testing.');
  await browser.close();
})();
