import { expect,test } from '@playwright/test';

test('adds recurring subject plan items directly in the list',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'创建孩子档案'}).click();
 await page.getByLabel('姓名或昵称').fill('规划测试');
 await page.getByRole('button',{name:'保存档案'}).click();
 await page.locator('.sidebar').getByRole('button',{name:'学习规划'}).click();
 await expect(page.getByRole('heading',{name:'语文长期学习事项'})).toBeVisible();
 await page.getByRole('button',{name:'新增科目'}).click();
 await expect(page.getByRole('heading',{name:'新增科目'})).toBeVisible();
 await page.getByLabel('科目名称').fill('化学');
 await page.getByRole('button',{name:'保存科目'}).click();
 await expect(page.getByRole('heading',{name:'化学长期学习事项'})).toBeVisible();
 await expect(page.getByRole('tab',{name:/化学/})).toBeVisible();
 await page.getByRole('tab',{name:'语文'}).click();

 await page.getByRole('button',{name:'编辑目标'}).click();
 await expect(page.getByRole('heading',{name:'设置科目总目标',exact:true})).toBeVisible();
 await page.getByLabel('目标说明').fill('建立语文阅读与文言文学习体系');
 await page.getByLabel('当前分').fill('72');
 await page.getByLabel('目标分').fill('88');
 await page.getByLabel('目标日期').fill('2026-11-01');
 await page.getByRole('button',{name:'保存目标'}).click();
 await expect(page.getByRole('heading',{name:'建立语文阅读与文言文学习体系',exact:true})).toBeVisible();
 await expect(page.locator('.goal-metric.highlight')).toContainText('88');
 await expect(page.getByText('目标分',{exact:true})).toBeVisible();

 await page.getByRole('button',{name:'新增教材'}).click();
 await page.getByLabel('教材名称').fill('《一本阅读》');
 await page.getByLabel('知识方向').selectOption({label:'现代文阅读'});
 await page.getByRole('button',{name:'保存教材'}).click();
 await expect(page.getByRole('cell',{name:'《一本阅读》',exact:true})).toBeVisible();
 const materialRow=page.locator('.material-list-table tbody tr').filter({hasText:'《一本阅读》'});
 await materialRow.hover();
 await expect(materialRow.getByRole('button',{name:'编辑教材《一本阅读》'})).toBeVisible();
 await materialRow.getByRole('button',{name:'编辑教材《一本阅读》'}).click();
 await expect(page.getByRole('heading',{name:'编辑教材'})).toBeVisible();
 await page.getByLabel('用途说明').fill('现代文阅读专项与错题复盘');
 await page.getByRole('button',{name:'保存教材'}).click();
 await expect(page.getByRole('cell',{name:'现代文阅读专项与错题复盘'})).toBeVisible();

 await page.getByRole('button',{name:'新增事项'}).click();
 await expect(page.getByRole('heading',{name:'新增规划事项'})).toBeVisible();
 await page.getByLabel('事项名称').fill('一本阅读');
 await page.getByLabel('执行频率').selectOption({label:'每两天'});
 await page.getByLabel('使用教材').selectOption({label:'《一本阅读》'});
 await page.getByLabel('每次时长').fill('25');
 await page.getByLabel('总分').fill('10');
 await page.getByLabel('字迹名称').fill('字迹');
 await page.getByLabel('字迹满分').fill('5');
 await page.getByLabel('字迹档位说明').nth(0).fill('字迹优美');
 await page.getByLabel('字迹档位得分').nth(0).fill('5');
 await page.getByLabel('字迹档位说明').nth(1).fill('不够工整');
 await page.getByLabel('字迹档位得分').nth(1).fill('3');
 await page.getByLabel('字迹档位说明').nth(2).fill('非常潦草');
 await page.getByLabel('字迹档位得分').nth(2).fill('0');
 await page.getByLabel('正确率名称').fill('正确率');
 await page.getByLabel('正确率满分').fill('5');
 await page.getByRole('button',{name:'保存事项'}).click();
 await expect(page.getByRole('cell',{name:'一本阅读',exact:true})).toBeVisible();
 await expect(page.getByRole('cell',{name:'每两天'})).toBeVisible();
 await expect(page.getByText('字迹优美')).toBeVisible();
 await expect(page.getByText('正确率').first()).toBeVisible();

 const planRow=page.locator('.plan-items-table tbody tr').filter({hasText:'一本阅读'});
 await planRow.hover();
 await expect(planRow.getByRole('button',{name:'编辑一本阅读'})).toBeVisible();
 await planRow.getByRole('button',{name:'编辑一本阅读'}).click();
 await expect(page.getByRole('heading',{name:'编辑规划事项'})).toBeVisible();
 await page.getByLabel('总分').fill('10');
 await page.getByRole('button',{name:'保存事项'}).click();
 await expect(page.getByRole('cell',{name:'10'})).toBeVisible();
});







