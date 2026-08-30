# Subject Plan（学习规划）

状态：ready-for-agent  
日期：2026-08-30  
依据：grill-with-docs 共识及 `CONTEXT.md`

## Problem Statement

家庭已经能用周计划和今日看板安排「今天做什么」，但缺少上一层：按科目拆解「提分要练什么」、挂上辅导资料，再据此生成每周任务。家长仍在凭感觉往周计划里填条目，科目内部的知识模块、资料和提分目标没有固定落点，规划与执行脱节。

## Solution

新增主页面「学习规划」。按 Active Student 进入后，左侧为五科页签；每科维护长期有效的 Subject Plan：Subject Goal、固定 Knowledge Area 清单上的启用/排序/强度、以及挂在模块上的 Study Material。家长显式执行 Subject Plan Generation，把缺失的 Study Task 写入选定周的 Weekly Plan；之后仍走现有 Daily Plan → 提交 → 评价 → 积分闭环。不自动爬网、不接考试成绩、不按错题自动调强度。

## User Stories

1. As a parent, I want a Main Page named 学习规划 before the weekly plan in navigation, so that planning comes before weekly scheduling.
2. As a parent, I want the Subject Plan page to follow the Active Student, so that each child's plans stay separate.
3. As a parent, I want left-hand subject tabs for Chinese, math, English, physics, and history, so that I plan one subject at a time.
4. As a parent, I want each subject to have its own Subject Plan, so that score improvement is managed per subject rather than as one vague note.
5. As a parent, I want to set a Subject Goal on each Subject Plan, so that the subject's improvement target is visible while planning.
6. As a parent, I want Subject Goal to accept a required narrative plus optional current score, target score, and target date, so that I can start with intent and add numbers later.
7. As a parent, I want the Student Profile current goal to remain the overall summary, so that subject goals do not replace the whole-child goal.
8. As a parent, I want each subject to show a fixed product list of Knowledge Areas, so that every family shares the same score-oriented breakdown.
9. As a parent, I want to enable or disable a Knowledge Area, so that only relevant modules drive generation.
10. As a parent, I want to reorder enabled Knowledge Areas within a subject, so that important modules appear first.
11. As a parent, I want to set Knowledge Area Intensity as weekly frequency plus suggested duration, so that generation knows how often and how long to schedule.
12. As a parent, I want to attach one or more Study Materials to a Knowledge Area by name, so that generated tasks can reference the workbook or course in use.
13. As a parent, I want optional material type and note, so that I can distinguish 教辅/课程/讲义 without uploading files.
14. As a parent, I want Subject Plan changes to persist in the Local Database, so that planning survives app restarts.
15. As a parent, I want an explicit Subject Plan Generation action for a chosen week, so that Weekly Plan updates are intentional rather than silent.
16. As a parent, I want generation to create Study Tasks only for gaps against enabled Knowledge Area Intensity, so that re-running generation does not duplicate work.
17. As a parent, I want generation to leave parent-edited and hand-added Weekly Plan tasks alone, so that my manual adjustments are safe.
18. As a parent, I want generated Study Tasks to remember their source Knowledge Area, so that gap-fill and provenance stay reliable.
19. As a parent, I want hand-added Weekly Plan tasks to have no Knowledge Area source, so that temporary school work stays outside generation accounting.
20. As a parent, I want generated task content to use a simple template from the Knowledge Area and Study Material names, so that I get usable tasks without pre-writing templates.
21. As a parent, I want generated tasks to carry suggested duration from Intensity and a product default Base Points, so that they fit the existing Study Task shape.
22. As a parent, I want to still edit, reorder, or delete unsubmitted Weekly Plan tasks after generation, so that the week can match real school load.
23. As a parent, I want Daily Plan generation to keep reading only from the Weekly Plan, so that the already-shipped daily snapshot behavior does not change.
24. As a child, I want generated tasks to appear on today's board like any other Study Task, so that execution does not require a special planning UI.
25. As a parent, I want two students' Subject Plans, materials, and generated tasks to stay isolated, so that siblings never mix.
26. As a family member, I want no Stage Plan, Exam Result, or Mistake Notebook auto-tuning in this feature, so that the first Subject Plan delivery stays focused.
27. As a parent, I want disabled Knowledge Areas to stop contributing new generated tasks on the next generation, so that I can pause a module without deleting its history.
28. As a parent, I want the fixed Knowledge Area catalog to match the agreed junior-high breakdown (see Implementation Decisions), so that planning language stays stable across families.

## Implementation Decisions

1. Add a Main Page「学习规划」in the shared shell navigation, ordered before「周计划」and after or with the existing execution pages as: 学习规划 → 周计划 → 今日看板 (exact relative order: 学习规划 immediately before 周计划).
2. Domain vocabulary must follow `CONTEXT.md`: Subject Plan, Subject Goal, Knowledge Area, Knowledge Area Intensity, Study Material, Subject Plan Generation. Do not introduce competing terms such as curriculum, knowledge point tree, or silent auto-sync.
3. Subject Plan is scoped by Student Profile + subject. It is long-lived; it is not a calendar week and not a Stage Plan.
4. Subject Goal fields: required narrative text; optional current score, target score, and target date. No hard requirement that scores exist before saving the plan.
5. Knowledge Areas are a fixed product catalog per subject. Parents enable, order, set intensity, and attach materials; they do not create or rename catalog entries in this delivery.
6. Fixed Knowledge Area catalog (labels may be shown in Chinese in UI; stable ids in English slug form):
   - chinese: basics, poetry_recitation, classical_in_class, modern_reading, composition
   - math: lesson_review, basic_drills, mid_drills, mistake_redo, topic_training
   - english: vocabulary, sentence_patterns, reading, cloze, listening, writing_sentences
   - physics: concepts, formulas, typical_problems, experiments, mistake_correction
   - history: timeline, figures_events, memorization, multiple_choice, material_questions
7. Knowledge Area Intensity: integer sessions-per-week (>0 when enabled) and suggested duration in minutes (>0). Disabled areas do not generate.
8. Study Material: required name; optional type enum (workbook, course, handout, other) and free-text note; multiple materials per Knowledge Area allowed; no file upload and no mandatory URL in this delivery.
9. Subject Plan Generation is an explicit API/UI action for one student + one weekStart (Monday). It writes Weekly Plan Study Tasks only. It must not insert Daily Plan rows.
10. Gap-fill semantics: for each enabled Knowledge Area, if the chosen week already has fewer sourced tasks than the configured weekly frequency, create only the missing count. Existing sourced tasks are kept even if content was edited. Tasks without a Knowledge Area source are ignored by the counter and never deleted by generation.
11. Weekday placement default: prefer weekdays; distribute N sessions across Mon–Fri first; use weekend only when N > 5. (Detail algorithm may be refined in implementation as long as this preference holds and results are deterministic.)
12. Generated Study Task defaults: content template from Knowledge Area label + primary or first Study Material name (or a subject-neutral default practice phrase if no material); Completion Standard from a short editable product default sentence; suggestedDuration from Intensity; Base Points from a single product default constant; Task Order appended after existing tasks for that weekday.
13. Persist a source Knowledge Area reference on generated weekly tasks (nullable for hand-added tasks). Evaluation, submission, and points flows remain unchanged.
14. SQLite schema gains versioned migrations for subject plans, per-area settings (enabled, order, intensity), study materials, subject goals, and weekly_task source linkage. All queries remain student-scoped.
15. HTTP surface extends the existing local API style: read/update Subject Plan by student+subject; CRUD Study Materials under an area; run Subject Plan Generation for a week; list results via existing weekly-task endpoints.
16. UI: left subject tabs + main panel for goal, area list with enable/order/intensity/materials, and a clear「生成本周」control that targets the week currently relevant to Weekly Plan (same week-start convention as the weekly plan page).
17. Do not remove or bypass manual Weekly Plan CRUD. Generation is an additional source of tasks.

## Testing Decisions

1. Good tests assert observable HTTP behavior and durable state on a temporary SQLite database. They do not assert private helpers, SQL shape, or React component internals.
2. Primary seam: local backend application/API (same as existing `tests/api/*`). Cover Subject Plan persistence, material attachment, generation gap-fill, source linkage, idempotent re-generation, student isolation, and that Daily Plan still materializes only from Weekly Plan.
3. Secondary seam: one browser end-to-end path — open 学习规划, enable an area with intensity, generate the week, confirm tasks appear in weekly plan / today board; switch Active Student and confirm plans do not leak.
4. Prior art: `tests/api/plans.test.ts` for weekly/daily generation idempotency; `tests/e2e/weekly-plan.spec.ts` and `tests/e2e/core-loop.spec.ts` for navigation and Active Student scoping.
5. Prefer extending the existing API test harness over adding a second test framework or deep UI unit suite.

## Out of Scope

1. Stage Plan, Stage Goal, Stage Plan Mode, and exam-date-driven sprints.
2. Exam Result entry, score charts, and automatic distance-to-Subject-Goal from exams.
3. Mistake Notebook–driven intensity changes or auto-prioritization of Knowledge Areas.
4. Parent-authored custom Knowledge Area trees or renaming the fixed catalog.
5. Study Material file upload, PDF library, or mandatory external links / crawling.
6. Fine-grained Knowledge Points beneath Knowledge Areas.
7. Replacing Weekly Plan or writing Daily Plan directly from Subject Plan.
8. Silent auto-generation on page load or on every plan edit.
9. Full overwrite / reset of the week's sourced tasks on re-generation (gap-fill only).
10. AI-generated plans, materials, or tasks.
11. Changing Evaluation, Points ledger, Reward, or Redemption behavior.

## Further Notes

1. This feature sits above the shipped V1 execution loop: Subject Plan → Weekly Plan → Daily Plan → Submission → Evaluation → Points → Reward.
2. Unresolved micro-details (exact weekday distribution function, exact default Completion Standard copy, default Base Points constant) may use the defaults in Implementation Decisions; product can tweak copy without changing the seam.
3. Glossary updates already live in `CONTEXT.md`; keep implementation and UI copy aligned with those terms.
