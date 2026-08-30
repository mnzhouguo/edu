import { expect,test } from '@playwright/test';

test('plans a subject, generates the week, and keeps siblings isolated',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'创建孩子档案'}).click();
 await page.getByLabel('姓名或昵称').fill('规划测试');
 await page.getByRole('button',{name:'保存档案'}).click();

 await page.locator('.sidebar').getByRole('button',{name:'学习规划'}).click();
 await expect(page.getByRole('heading',{name:'学习规划'})).toBeVisible();
 await page.getByRole('button',{name:'英语'}).click();
 await page.getByLabel('目标说明').fill('英语提分');
 await page.getByLabel('目标说明').blur();
 const vocabulary=page.locator('article').filter({hasText:'单词短语'});
 await vocabulary.getByRole('checkbox').check();
 await vocabulary.getByLabel('每周次数').fill('3');
 await page.getByLabel('知识模块').selectOption({label:'单词短语'});
 await page.getByLabel('名称').fill('词汇手册');
 await page.getByRole('button',{name:'添加资料'}).click();
 await expect(vocabulary.getByText('词汇手册')).toBeVisible();
 await page.getByRole('button',{name:'生成本周'}).click();
 await expect(page.getByText(/已生成本周任务/)).toBeVisible();

 await page.locator('.sidebar').getByRole('button',{name:'周计划'}).click();
 await expect(page.getByText(/单词短语：词汇手册/).first()).toBeVisible();

 await page.getByRole('button',{name:'新增孩子'}).click();
 await page.getByLabel('姓名或昵称').fill('另一个孩子');
 await page.getByRole('button',{name:'保存档案'}).click();
 await page.locator('.sidebar').getByRole('button',{name:'学习规划'}).click();
 await page.getByRole('button',{name:'英语'}).click();
 await expect(page.getByLabel('目标说明')).toHaveValue('');
 await expect(page.locator('article').filter({hasText:'单词短语'}).getByRole('checkbox')).not.toBeChecked();
 await page.locator('.sidebar').getByRole('button',{name:'周计划'}).click();
 await expect(page.getByText(/单词短语：词汇手册/)).toHaveCount(0);
});
