import { expect,test } from '@playwright/test';
test('creates and switches active students',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'创建孩子档案'}).click();
 await page.getByLabel('姓名或昵称').fill('小周'); await page.getByLabel('学校').fill('长沙市实验中学'); await page.getByLabel('当前目标').fill('进入年级前100名'); await page.getByRole('button',{name:'保存档案'}).click();
 await expect(page.getByRole('heading',{name:'小周的学习工作台'})).toBeVisible();
 await page.getByRole('button',{name:'新增孩子'}).click(); await page.getByLabel('姓名或昵称').fill('小雨'); await page.getByLabel('年级').fill('初一'); await page.getByRole('button',{name:'保存档案'}).click();
 await expect(page.getByRole('heading',{name:'小雨的学习工作台'})).toBeVisible();
 await page.getByLabel('当前孩子').selectOption({label:'小周 · 初二'}); await page.reload(); await expect(page.getByRole('heading',{name:'小周的学习工作台'})).toBeVisible();
});
