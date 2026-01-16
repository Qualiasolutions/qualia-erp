import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('Navigating to app...');
await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');

// Take initial screenshot
await page.screenshot({ path: '/tmp/qualia-initial.png', fullPage: true });
console.log('Screenshot saved to /tmp/qualia-initial.png');

// Find all buttons on page
const buttons = await page.locator('button').all();
console.log(`\nFound ${buttons.length} buttons on page`);

// Print all buttons for inspection
console.log('\nButtons on page:');
for (let i = 0; i < Math.min(buttons.length, 25); i++) {
  const btn = buttons[i];
  const text = (await btn.innerText()).slice(0, 40).replace(/\n/g, ' ');
  const ariaLabel = await btn.getAttribute('aria-label') || '';
  if (text || ariaLabel) {
    console.log(`  ${i}: "${text}" aria="${ariaLabel}"`);
  }
}

// Look for chat-related elements in the DOM
const html = await page.content();
const chatMatches = html.match(/ai-assistant|AIAssistant|chat-widget|ChatWidget/gi) || [];
console.log(`\nChat-related class matches: ${chatMatches.length}`);

await browser.close();
