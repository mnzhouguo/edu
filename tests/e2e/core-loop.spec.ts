import { expect,test } from '@playwright/test';

test('runs the V1 core loop and keeps pages scoped to the active student',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'创建孩子档案'}).click();
 await page.getByLabel('姓名或昵称').fill('闭环测试');
 await page.getByLabel('年级').fill('初二');
 await page.getByRole('button',{name:'保存档案'}).click();
 await expect(page.getByRole('heading',{name:'闭环测试的学习工作台'})).toBeVisible();
 await expect(page.getByRole('button',{name:'成绩趋势'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'学习报告'})).toHaveCount(0);
 await expect(page.locator('.sidebar').getByRole('button',{name:'错题本'})).toHaveCount(0);

 await page.locator('.sidebar').getByRole('button',{name:'每周计划'}).click();
 const today=new Date(),weekday=today.getDay()||7,label=['周一','周二','周三','周四','周五','周六','周日'][weekday-1];
 await page.getByTitle(`添加${label}任务`).click();
 await page.getByLabel('学习内容').fill('核心闭环练习');
 await page.getByRole('button',{name:'保存任务'}).click();

 await page.locator('.sidebar').getByRole('button',{name:'今日任务'}).click();
 await expect(page.getByText('核心闭环练习')).toBeVisible();
 await page.locator('.status-task-card').filter({hasText:'核心闭环练习'}).dragTo(page.locator('.status-board-column.status-completed'));
 await page.getByLabel('字迹与过程得分').fill('4');
 await page.getByLabel('专注度得分').fill('3');
 await page.getByLabel('正确率得分').fill('3');
 await page.getByRole('button',{name:'确认完成'}).click();
 await expect(page.locator('.week-overview-metric.highlight')).toContainText('10');

 await page.locator('.sidebar').getByRole('button',{name:'积分兑换'}).click();
 await page.getByRole('button',{name:'新增奖励'}).first().click();
 await page.getByLabel('名称').fill('周末游戏');
 await page.getByLabel('所需积分').fill('10');
 await page.getByRole('button',{name:'保存奖励'}).click();
 await page.getByRole('button',{name:'兑换'}).click();
 await page.getByLabel('兑换数量').fill('1');
 await page.getByRole('button',{name:'确认兑换'}).click();
 const metrics=page.locator('.rewards-points');
 await expect(metrics.locator('article').filter({hasText:'累计获得'})).toContainText('10');
 await expect(metrics.locator('article').filter({hasText:'可兑换'})).toContainText('0');
 await expect(metrics.locator('article').filter({hasText:'本周获得'})).toContainText('10');
 await expect(metrics.locator('article').filter({hasText:'本周已兑'})).toContainText('10');

 await page.locator('.sidebar').getByRole('button',{name:'基础设置'}).click();
 await page.getByRole('button',{name:'新增孩子'}).click();
 await page.getByLabel('姓名或昵称').fill('另一个孩子');
 await page.getByRole('button',{name:'保存档案'}).click();
 await page.locator('.sidebar').getByRole('button',{name:'数据概览'}).click();
 await expect(page.getByRole('heading',{name:'另一个孩子的学习工作台'})).toBeVisible();
 await expect(page.getByText('还没有可统计的学习数据')).toBeVisible();
 await page.locator('.sidebar').getByRole('button',{name:'积分兑换'}).click();
 await expect(page.getByText('周末游戏')).toHaveCount(0);
 await page.locator('.sidebar').getByRole('button',{name:'今日任务'}).click();
 await expect(page.getByText('核心闭环练习')).toHaveCount(0);
 await page.locator('.sidebar').getByRole('button',{name:'每周计划'}).click();
 await expect(page.getByText('核心闭环练习')).toHaveCount(0);
});
