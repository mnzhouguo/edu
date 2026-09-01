import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const out = 'docs/product/screenshots';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20000);

async function shot(name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  console.log('saved', name);
}

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

await page.locator('.sidebar').getByRole('button', { name: '今日任务' }).click();
await page.locator('.week-day-panel').waitFor();
const cardTab = page.getByRole('tab', { name: '卡片' });
if (await cardTab.count()) {
  await cardTab.click();
  await page.getByRole('region', { name: '状态看板' }).waitFor();
}
await shot('01-today-board');

await page.locator('.sidebar').getByRole('button', { name: '学习规划' }).click();
await page.getByRole('heading', { name: /长期学习事项/ }).waitFor();
await shot('02-subject-plan');

await page.locator('.sidebar').getByRole('button', { name: '每周计划' }).click();
await page.locator('.week-plan-page').waitFor();
await shot('03-weekly-plan');

await page.locator('.sidebar').getByRole('button', { name: '积分兑换' }).click();
await page.locator('.rewards-page').waitFor();
await shot('04-rewards');

const earnTab = page.getByRole('tab', { name: /积分获取/ });
if (await earnTab.count()) {
  await earnTab.click();
  await page.waitForTimeout(300);
  await shot('05-points-earn');
}

await page.locator('.sidebar').getByRole('button', { name: '数据概览' }).click();
await page.locator('.dash-page').waitFor();
await shot('06-dashboard');

await page.locator('.sidebar').getByRole('button', { name: '基础设置' }).click();
await page.locator('.settings-page').waitFor();
await shot('07-settings');

await page.locator('.sidebar').getByRole('button', { name: '今日任务' }).click();
await page.locator('.week-day-panel').waitFor();
const listTab = page.getByRole('tab', { name: '列表' });
if (await listTab.count()) await listTab.click();
await page.waitForTimeout(300);
const complete = page.locator('button[title="完成并打分"]').first();
if (await complete.count()) {
  await complete.click();
  await page.locator('.side-drawer, .drawer-body').first().waitFor();
  await shot('08-complete-score');
  const cancel = page.getByRole('button', { name: '取消' });
  if (await cancel.count()) await cancel.click();
}

await browser.close();
console.log('done');
