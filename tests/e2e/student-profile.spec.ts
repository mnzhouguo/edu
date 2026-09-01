import { expect,test } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';

const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

test('creates and switches active students',async({page})=>{
 mkdirSync('test-results',{recursive:true});
 const avatarFile=join('test-results','e2e-avatar.png');
 writeFileSync(avatarFile,tinyPng);
 await page.goto('/');
 await page.getByRole('button',{name:'创建孩子档案'}).click();
 await page.getByLabel('姓名或昵称').fill('小周'); await page.getByLabel('学校').fill('长沙市实验中学'); await page.getByLabel('当前目标').fill('进入年级前100名');
 await page.getByLabel('头像').setInputFiles(avatarFile);
 await page.getByRole('button',{name:'保存档案'}).click();
 await expect(page.getByRole('heading',{name:'小周的学习工作台'})).toBeVisible();
 await expect(page.locator('.student-switcher-trigger .student-avatar img')).toBeVisible();
 await page.locator('.sidebar').getByRole('button',{name:'基础设置'}).click();
 await expect(page.getByRole('button',{name:'编辑当前孩子'})).toBeVisible();
 await page.getByRole('button',{name:'编辑当前孩子'}).click();
 await page.getByLabel('当前目标').fill('进入年级前50名');
 await page.getByRole('button',{name:'保存档案'}).click();
 await expect(page.locator('.settings-student-goal')).toHaveText('进入年级前50名');
 await page.getByRole('button',{name:'新增孩子'}).click(); await page.getByLabel('姓名或昵称').fill('小雨'); await page.getByLabel('年级').fill('初一'); await page.getByRole('button',{name:'保存档案'}).click();
 await page.locator('.sidebar').getByRole('button',{name:'数据概览'}).click();
 await expect(page.getByRole('heading',{name:'小雨的学习工作台'})).toBeVisible();
 await page.getByLabel('当前孩子').click(); await page.getByRole('option',{name:'小周 · 初二'}).click(); await page.reload(); await expect(page.getByRole('heading',{name:'小周的学习工作台'})).toBeVisible();
});
