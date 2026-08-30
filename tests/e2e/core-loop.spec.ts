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

 await page.locator('.sidebar').getByRole('button',{name:'周计划'}).click();
 const today=new Date(),weekday=today.getDay()||7,label=['周一','周二','周三','周四','周五','周六','周日'][weekday-1];
 await page.getByTitle(`添加${label}任务`).click();
 await page.getByLabel('学习内容').fill('核心闭环练习');
 await page.getByLabel('衡量标准').fill('完成练习并达到80%正确率');
 await page.getByRole('button',{name:'保存任务'}).click();

 await page.locator('.sidebar').getByRole('button',{name:'今日看板'}).click();
 await expect(page.locator('.execution-task')).toContainText('核心闭环练习');
 await page.getByRole('button',{name:'提交'}).click();
 await page.getByLabel('备注').fill('已完成');
 await page.getByRole('button',{name:'标记已提交'}).click();
 await expect(page.getByText('待评价')).toBeVisible();

 await page.getByRole('button',{name:'评价'}).click();
 await page.getByLabel('完成结果').selectOption('completed');
 await page.getByRole('button',{name:'确认评价'}).click();
 await expect(page.getByText('积分余额 10')).toBeVisible();

 await page.locator('.sidebar').getByRole('button',{name:'积分奖励'}).click();
 await page.getByRole('button',{name:'新增奖励'}).click();
 await page.getByLabel('名称').fill('周末游戏');
 await page.getByLabel('分类').selectOption('game_time');
 await page.getByLabel('所需积分').fill('10');
 await page.getByRole('button',{name:'保存奖励'}).click();
 await page.getByRole('button',{name:'申请兑换'}).click();
 await page.getByRole('button',{name:'批准'}).click();
 await expect(page.getByText('积分余额 0')).toBeVisible();

 await page.locator('.sidebar').getByRole('button',{name:'错题本'}).click();
 await page.getByRole('button',{name:'新增错题'}).click();
 await page.getByLabel('题目摘要').fill('一次函数错题');
 await page.getByRole('button',{name:'保存错题'}).click();
 await expect(page.getByRole('heading',{name:'一次函数错题'})).toBeVisible();

 await page.getByRole('button',{name:'新增孩子'}).click();
 await page.getByLabel('姓名或昵称').fill('另一个孩子');
 await page.getByRole('button',{name:'保存档案'}).click();
 await page.locator('.sidebar').getByRole('button',{name:'数据概览'}).click();
 await expect(page.getByRole('heading',{name:'另一个孩子的学习工作台'})).toBeVisible();
 await expect(page.getByText('还没有可统计的学习数据')).toBeVisible();
 await page.locator('.sidebar').getByRole('button',{name:'积分奖励'}).click();
 await expect(page.getByText('周末游戏')).toHaveCount(0);
 await page.locator('.sidebar').getByRole('button',{name:'错题本'}).click();
 await expect(page.getByText('一次函数错题')).toHaveCount(0);
 await page.locator('.sidebar').getByRole('button',{name:'今日看板'}).click();
 await expect(page.getByText('核心闭环练习')).toHaveCount(0);
 await page.locator('.sidebar').getByRole('button',{name:'周计划'}).click();
 await expect(page.getByText('核心闭环练习')).toHaveCount(0);
});
