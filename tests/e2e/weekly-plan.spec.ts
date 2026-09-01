import { expect,test } from '@playwright/test';
test('creates a weekly task, generates today, filters, and reorders',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'创建孩子档案'}).click();await page.getByLabel('姓名或昵称').fill('计划测试');await page.getByRole('button',{name:'保存档案'}).click(); await page.getByRole('button',{name:'每周计划',exact:true}).click();
 const today=new Date(),weekday=today.getDay()||7,label=['周一','周二','周三','周四','周五','周六','周日'][weekday-1];
 await page.getByRole('tab',{name:new RegExp(label)}).click();
 async function add(content:string,subject:string){await page.getByTitle(`添加${label}任务`).click();await page.getByLabel('科目',{exact:true}).selectOption(subject);await page.getByLabel('学习内容').fill(content);await page.getByRole('button',{name:'保存任务'}).click();await expect(page.getByText(content,{exact:true})).toBeVisible()}
 await add('语文复习任务','chinese');await add('数学练习任务一','math');await add('数学练习任务二','math');
 await page.locator('.sidebar').getByRole('button',{name:'今日任务'}).click();
 await expect(page.getByRole('region',{name:'状态看板'})).toBeVisible();
 await expect(page.locator('.status-task-card')).toHaveCount(3);
 await page.getByRole('button',{name:/数学\s*2/}).click();
 await expect(page.locator('.status-task-card')).toHaveCount(2);
 await expect(page.locator('.status-board')).toContainText('数学练习任务一');
 await expect(page.locator('.status-board')).toContainText('数学练习任务二');
 await page.getByRole('button',{name:/全部任务/}).click();
 await expect(page.locator('.status-task-card')).toHaveCount(3);
 await page.getByRole('tab',{name:'列表'}).click();
 await expect(page.locator('.week-day-table tbody tr')).toHaveCount(3);
 await expect(page.locator('.week-overview-metric').filter({hasText:'可获积分'})).toContainText('30');
 await page.getByRole('button',{name:'完成语文复习任务'}).click();
 await page.getByLabel('字迹与过程得分').fill('4');
 await page.getByLabel('专注度得分').fill('3');
 await page.getByLabel('正确率得分').fill('3');
 await page.getByRole('button',{name:'确认完成'}).click();
 await expect(page.locator('.week-overview-metric').filter({hasText:'可获积分'})).toContainText('20');
 await expect(page.locator('.week-overview-metric.highlight')).toContainText('10');
});
