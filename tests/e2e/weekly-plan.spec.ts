import { expect,test } from '@playwright/test';
test('creates a weekly task, generates today, filters, and reorders',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'创建孩子档案'}).click();await page.getByLabel('姓名或昵称').fill('计划测试');await page.getByRole('button',{name:'保存档案'}).click();await page.getByRole('button',{name:'周计划',exact:true}).click();
 const today=new Date(),weekday=today.getDay()||7,label=['周一','周二','周三','周四','周五','周六','周日'][weekday-1];
 async function add(content:string,subject:string,order:string){await page.getByTitle(`添加${label}任务`).click();await page.getByLabel('科目').selectOption(subject);await page.getByLabel('学习内容').fill(content);await page.getByLabel('衡量标准').fill('完成练习并达到80%正确率');await page.getByLabel('执行顺序').fill(order);await page.getByRole('button',{name:'保存任务'}).click();await expect(page.getByText(content,{exact:true})).toBeVisible()}
 await add('语文复习任务','chinese','1');await add('数学练习任务一','math','2');await add('数学练习任务二','math','3');
 await page.locator('.sidebar').getByRole('button',{name:'今日看板'}).click();await expect(page.locator('.execution-task')).toHaveCount(3);
 await page.getByRole('button',{name:/数学\s*2/}).click();await expect(page.locator('.execution-task')).toHaveCount(2);await page.locator('.execution-task').nth(1).dragTo(page.locator('.execution-task').nth(0));
 await page.getByRole('button',{name:/全部任务/}).click();await expect(page.locator('.execution-task').nth(0)).toContainText('语文复习任务');await expect(page.locator('.execution-task').nth(1)).toContainText('数学练习任务二');
 await page.reload();await page.locator('.sidebar').getByRole('button',{name:'今日看板'}).click();await expect(page.locator('.execution-task').nth(1)).toContainText('数学练习任务二');
});
