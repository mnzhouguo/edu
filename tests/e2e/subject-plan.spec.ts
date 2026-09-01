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

 const planTabs=page.getByRole('tablist',{name:'规划内容'});
 await planTabs.getByRole('tab',{name:/^辅导资料/}).click();
 await page.getByRole('button',{name:'暂无辅导资料，点击添加'}).click();
 await page.getByLabel('资料名称').fill('《一本阅读》');
 await page.getByRole('button',{name:'保存资料'}).click();
 await expect(page.getByRole('heading',{name:'《一本阅读》',exact:true})).toBeVisible();
 const materialCard=page.locator('.material-card').filter({hasText:'《一本阅读》'});
 await materialCard.hover();
 await expect(materialCard.getByRole('button',{name:'编辑辅导资料《一本阅读》'})).toBeVisible();
 await materialCard.getByRole('button',{name:'编辑辅导资料《一本阅读》'}).click();
 await expect(page.getByRole('heading',{name:'编辑辅导资料'})).toBeVisible();
 await page.getByLabel('用途说明').fill('现代文阅读专项与错题复盘');
 await page.getByRole('button',{name:'保存资料'}).click();
 await expect(page.getByText('现代文阅读专项与错题复盘')).toBeVisible();

 await planTabs.getByRole('tab',{name:/^规划事项/}).click();
 await page.getByRole('button',{name:'还没有规划事项，点击添加'}).click();
 await expect(page.getByRole('heading',{name:'新增规划事项'})).toBeVisible();
 await page.getByLabel('事项名称').fill('一本阅读');
 await page.getByLabel('执行频率').selectOption({label:'每两天'});
 await page.getByLabel('辅导资料').selectOption({label:'《一本阅读》'});
 await page.getByLabel('每次时长').fill('25');
 await page.getByLabel('总分').fill('10');
 await expect(page.getByLabel('字迹与过程名称')).toHaveValue('字迹与过程');
 await expect(page.getByLabel('字迹与过程满分')).toHaveValue('4');
 await expect(page.getByLabel('专注度满分')).toHaveValue('3');
 await expect(page.getByLabel('正确率满分')).toHaveValue('3');
 await page.getByRole('button',{name:'保存事项'}).click();
 await expect(page.getByRole('cell',{name:'一本阅读',exact:true})).toBeVisible();
 await expect(page.getByRole('cell',{name:'每两天'})).toBeVisible();
 await expect(page.getByText('字迹与过程')).toBeVisible();
 await expect(page.getByText('专注度')).toBeVisible();
 await expect(page.getByText('正确率').first()).toBeVisible();

 const planRow=page.locator('.plan-items-table tbody tr').filter({hasText:'一本阅读'});
 await planRow.hover();
 await expect(planRow.getByRole('button',{name:'编辑一本阅读'})).toBeVisible();
 await planRow.getByRole('button',{name:'编辑一本阅读'}).click();
 await expect(page.getByRole('heading',{name:'编辑规划事项'})).toBeVisible();
 await page.getByLabel('总分').fill('10');
 await page.getByRole('button',{name:'保存事项'}).click();
 await expect(page.getByRole('cell',{name:'10'})).toBeVisible();

 await page.getByRole('button',{name:'生成周计划'}).click();
 await expect(page.getByRole('tablist',{name:'本周日期'})).toBeVisible();
 await page.getByRole('tab',{name:/周一/}).click();
 await expect(page.getByText('一本阅读').first()).toBeVisible();
});







