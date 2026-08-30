# 学习进度与积分奖励系统 V1 开发规格

状态：待开发  
日期：2026-08-30  
依据：`requirements.md` 第17章及 `CONTEXT.md`

## Problem Statement

家长目前依赖纸面计划、口头提醒和零散记录管理孩子的日常学习，难以清楚回答以下问题：孩子今天应该完成什么、是否真正完成、完成质量如何、本周执行情况怎样，以及奖励是否与实际学习表现一致。

孩子处于初二阶段，学习任务需要按语文、数学、英语、物理、历史分别管理，并拆分为有明确 Completion Standard、Suggested Duration 和 Points 的 Study Task。系统必须让孩子能够主动提交完成结果，让家长进行最终 Evaluation，并通过可持续积累的 Points 和可兑换 Reward 形成正向反馈。

第一版需要先验证一个完整、可日常使用的核心闭环，而不是一次实现所有计划、分析、提醒和智能化能力。

## Solution

建设一个无需登录即可在家庭电脑上使用的 Local Web App。家长可以建立多个 Student Profile，在顶部选择 Active Student，并为每个孩子按周、日期和科目制定 Weekly Plan。系统将周计划生成具体 Daily Plan，并在今日看板中按照 Task Order 展示 Study Task。

孩子完成任务后发起 Student Submission，并可上传 Photo Evidence。家长随后记录完成状态、Accuracy Band 和附加表现。只有家长确认的 Evaluation 才能产生正式 Points，并写入积分流水。孩子可以用 Points Balance 申请现金、游戏时间、电影、活动或礼物等奖励，家长审批后才扣除积分。

系统同时提供简化的 Mistake Notebook 和 Parent Dashboard，使家长能够看到今日完成率、本周完成率、积分变化和当前 Points Balance。

## User Stories

1. As a parent, I want to create a Student Profile, so that each child's learning data is managed independently.
2. As a parent, I want to record a child's name or nickname, grade, school, and current goal, so that I can identify the learning context.
3. As a parent, I want to switch the Active Student from the top of the app, so that every Main Page shows the selected child's data.
4. As a parent, I want the app to open without a login or password, so that it is convenient for trusted family use.
5. As a parent, I want Chinese, math, English, physics, and history to be independent subjects, so that plans and progress can be reviewed by subject.
6. As a parent, I want to create a Weekly Plan for a specific week, so that daily learning is prepared in advance.
7. As a parent, I want to add Study Tasks to a weekday and subject, so that the plan reflects the child's actual school schedule.
8. As a parent, I want each Study Task to contain a title and concrete learning content, so that the child knows exactly what to do.
9. As a parent, I want each Study Task to contain a Completion Standard, so that completion can be judged consistently.
10. As a parent, I want each Study Task to contain a Suggested Duration, so that daily study load is visible.
11. As a parent, I want each Study Task to contain Base Points, so that expected effort has a clear reward value.
12. As a parent, I want to set the Task Order, so that the child knows what to do first and next.
13. As a parent, I want to edit or remove an unsubmitted Study Task, so that planning mistakes can be corrected.
14. As a parent, I want the system to generate the Daily Plan from the Weekly Plan, so that I do not need to recreate tasks each day.
15. As a parent, I want daily task generation to be repeatable without duplicates, so that reopening the app does not create extra tasks.
16. As a child, I want to see today's Study Tasks in execution order, so that I can focus on one clear list.
17. As a child, I want to filter today's board by subject, so that I can focus on one subject while preserving Task Order.
18. As a parent, I want to drag Study Tasks into a different order, so that I can adjust the day's execution sequence.
19. As a child, I want to see the content, Completion Standard, Suggested Duration, and Base Points of a task, so that expectations are clear before I begin.
20. As a child, I want to mark a Study Task as submitted, so that my parent knows it is ready for review.
21. As a child, I want to attach Photo Evidence to a Student Submission, so that written work can be reviewed.
22. As a child, I want submitted work to show Estimated Points without changing Points Balance, so that I can see the possible reward while waiting for review.
23. As a parent, I want to see which tasks are waiting for Evaluation, so that I can review them efficiently.
24. As a parent, I want to evaluate a task as not completed, partially completed, completed, or high-quality completed, so that different outcomes earn different points.
25. As a parent, I want to record an approximate Accuracy Band such as 60%, 80%, or 90%, so that correctness can be tracked without detailed marking.
26. As a parent, I want to add fixed positive-performance tags such as proactive, on-time, corrected, and focused, so that good learning behavior is recognized.
27. As a parent, I want to add an optional evaluation note, so that important context is preserved.
28. As a parent, I want to confirm an Evaluation before points are official, so that a child's self-submission never directly changes Points Balance.
29. As a parent, I want the system to calculate earned points from Base Points, completion outcome, and selected bonus items, so that scoring is consistent.
30. As a child, I want to see the points earned for each evaluated task, so that the connection between effort and reward is understandable.
31. As a parent, I want to see the total official points earned today, so that I can assess the day's result.
32. As a family member, I want Points Balance to come from an auditable point ledger, so that earning and spending are traceable.
33. As a child, I want official Points to remain valid over time, so that long-term effort can accumulate toward meaningful rewards.
34. As a parent, I want to create and edit Rewards, so that rewards remain appropriate for the child.
35. As a parent, I want to configure a Reward name, category, required points, and description, so that redemption conditions are clear.
36. As a family member, I want cash rewards to follow the Cash Conversion Rate of 100 Points for 5 yuan, so that cash redemption is consistent.
37. As a parent, I want to offer non-cash Rewards such as game time, a movie, an activity, or a gift, so that motivation is not limited to money.
38. As a child, I want to see available Rewards and my Points Balance, so that I can choose a realistic goal.
39. As a child, I want to create a Redemption Request, so that spending Points requires parent involvement.
40. As a parent, I want to approve or reject a Redemption Request, so that rewards remain under family control.
41. As a child, I want Points to be deducted only after approval, so that a rejected or pending request does not reduce my balance.
42. As a parent, I want a redemption to fail when Points Balance is insufficient, so that the balance never becomes negative.
43. As a parent, I want to record a mistake by subject, so that weak knowledge can be reviewed separately.
44. As a parent or child, I want to attach Photo Evidence to a mistake, so that the original question is preserved.
45. As a parent or child, I want to record the Mistake Reason, correct solution, and redo status, so that the mistake record supports later review.
46. As a parent, I want to browse and filter the Mistake Notebook by subject, so that I can find relevant mistakes quickly.
47. As a parent, I want the Parent Dashboard to show today's planned, submitted, evaluated, and completed task counts, so that today's execution is immediately visible.
48. As a parent, I want the Parent Dashboard to show this week's basic completion trend, so that I can notice improving or declining execution.
49. As a parent, I want the Parent Dashboard to show Points earned, Points spent, and current Points Balance, so that the incentive system is transparent.
50. As a family member, I want all data to remain separate when the Active Student changes, so that one child's actions never affect another child's plans, mistakes, or Points.
51. As a family member, I want uploaded photos to remain available after the app restarts, so that evidence and mistake records are durable.
52. As a family member, I want SQLite data to persist after the app restarts, so that the app can be used every day without data loss.

## Implementation Decisions

1. The first version is a Local Web App consisting of a browser interface, a local HTTP backend, a SQLite Local Database, and a local Photo Library.
2. The application has five Main Pages: today's board, weekly plan, mistake notebook, points and rewards, and data overview. The Active Student selector remains visible in the shared top area.
3. All records that belong to a child carry a Student Profile identifier. Backend queries must require the active student context and must not return mixed-student data.
4. Supported subjects are fixed in V1 as Chinese, math, English, physics, and history. Subject weights may be represented in configuration, but V1 scoring is driven by each task's Base Points rather than an additional hidden multiplier.
5. A Weekly Plan belongs to one Student Profile and one calendar week. Weekly plan entries define weekday, subject, task content, Completion Standard, Suggested Duration, Base Points, and default Task Order.
6. A Daily Plan is materialized as Study Task snapshots. Once generated, later Weekly Plan edits do not silently change already generated daily tasks.
7. Daily generation is idempotent. A source weekly-plan entry can create at most one daily task for the same student and date.
8. The today board returns tasks in explicit Task Order. Dragging tasks updates their order within the selected date; filtering by subject does not rewrite the relative order of hidden tasks.
9. The primary Study Task workflow is `planned -> submitted -> evaluated`. A parent may also evaluate a planned task as not completed. Positive points require either a Student Submission or an explicit parent confirmation.
10. A Student Submission stores submission time, optional child note, and zero or more Photo Evidence records. It exposes Estimated Points only; it never writes the official point ledger.
11. An Evaluation stores completion outcome, Accuracy Band, selected behavior tags, optional note, calculated points, evaluator time, and the scoring-rule version used.
12. V1 completion coefficients are: not completed `0`, partially completed `0.5`, completed `1.0`, and high-quality completed `1.2`. Earned base points are rounded to a whole point using one consistent application-wide rule.
13. Each selected behavior tag contributes its configured additional points. The V1 specification does not apply a daily Bonus Point Cap.
14. Accuracy Band is recorded as evaluation evidence and shown in history. It does not independently modify points in V1 unless the parent reflects it through the completion outcome.
15. An Evaluation becomes immutable for point accounting after confirmation. A later correction must create compensating point-ledger entries rather than rewriting historical ledger amounts.
16. The point ledger is the source of truth for Points Balance. Evaluation confirmation creates an earning entry; approved redemption creates a spending entry. The balance is the sum of ledger entries and may not be negative.
17. Points do not expire and are not cleared by day, week, semester, grade, or calendar year.
18. Reward categories are fixed as cash, game time, movie, activity, and gift, with an optional free-text description.
19. Cash rewards use the fixed Cash Conversion Rate of 100 Points for 5 yuan. The backend validates that configured cash cost and amount follow this rate.
20. A Redemption Request stores the selected Reward snapshot, requested points, request state, request time, and parent decision. States are pending, approved, and rejected.
21. Redemption approval and point deduction occur in one database transaction. Approval fails without changing state when Points Balance is insufficient.
22. V1 does not support Partial Redemption. Each approved request consumes the full configured Reward once.
23. Mistake Notebook records contain student, subject, question summary, Mistake Reason category, optional reason note, correct solution, redo status, creation time, and Photo Evidence.
24. Photo Evidence bytes are stored in the local Photo Library using generated unique names. SQLite stores relative paths, media type, original filename, size, owner type, owner identifier, and creation time.
25. Photo paths are resolved only beneath the configured Photo Library root. File upload validates supported image types and a configurable size limit.
26. Database and photo writes are coordinated to avoid dangling records. Failed database writes remove newly uploaded files; missing files are reported without crashing the relevant page.
27. The Parent Dashboard calculates today and weekly metrics from Daily Plan, Evaluation, point-ledger, and redemption data. Dashboard values are scoped to the Active Student.
28. Recommended backend resource boundaries are Student Profiles, Weekly Plans, Daily Tasks, Submissions, Evaluations, Rewards, Redemption Requests, Mistakes, Photos, Dashboard, and Point Ledger.
29. Recommended HTTP operations include creating and selecting students; CRUD for weekly plans; generating and listing daily tasks; reordering tasks; submitting tasks; confirming evaluations; CRUD for rewards; requesting and deciding redemptions; CRUD for mistakes; uploading photos; and reading dashboard summaries.
30. SQLite schema changes are versioned through migrations from the beginning so that later desktop or server versions can upgrade existing family data.
31. Dates are stored as local calendar dates for planning and timestamps are stored in a consistent machine-readable format. The displayed timezone follows the local installation.
32. The UI must make the current actor action clear without implementing accounts: child actions are submission and redemption request; parent actions are planning, evaluation, reward maintenance, and redemption decision.
33. Destructive actions require confirmation. Unsubmitted planning data may be deleted; evaluated accounting data must retain its ledger history.
34. V1 may choose its frontend and backend frameworks during implementation, but the framework choice must preserve the Local Web App, SQLite, local Photo Library, and API-level testing boundaries defined here.

## Testing Decisions

1. The primary testing seam is the local backend application/API boundary using a temporary SQLite database and temporary Photo Library. This is the highest stable seam available in the empty codebase and should cover most business behavior through complete requests and persisted responses.
2. Tests verify external behavior and durable state, not internal classes, private functions, SQL statement shape, or frontend component structure.
3. Core API tests cover Student Profile isolation, Weekly Plan creation, idempotent Daily Plan generation, task ordering, Student Submission, parent Evaluation, point calculation, and Points Balance.
4. Scoring tests cover all four completion outcomes, behavior bonuses, whole-point rounding, zero points for not completed, and the fact that Accuracy Band alone does not change points.
5. Point-ledger tests prove that submissions do not affect Points Balance, confirmed evaluations add Points exactly once, repeated requests are idempotent, approved redemptions deduct once, and insufficient balance cannot become negative.
6. Redemption tests cover pending, approved, and rejected requests; cash conversion validation; and full redemption only.
7. Photo tests use a temporary folder and verify accepted uploads, rejected file types or oversize files, persisted relative paths, missing-file behavior, and cleanup after a failed database operation.
8. Mistake Notebook tests cover subject separation, required data, optional Photo Evidence, and filtering by Active Student and subject.
9. Dashboard tests build known tasks, evaluations, and ledger entries and verify today's counts, weekly completion values, points earned, points spent, and current balance.
10. Multi-student tests perform the same operations for two Student Profiles and assert that plans, tasks, mistakes, dashboard metrics, rewards activity, and balances remain isolated.
11. A small browser end-to-end suite covers the single critical path: select a student, create a weekly task, view it on today's board, submit it, evaluate it, observe Points Balance, request a Reward, and approve the request.
12. Browser tests also cover subject filtering and drag ordering because these behaviors depend on user interaction rather than only backend contracts.
13. Migration smoke tests create a fresh Local Database and apply every migration in order. Future migrations must also be tested against a database at the previous released schema version.
14. The codebase currently has no prior test framework or similar tests. Implementation should establish one API integration-test harness and one minimal browser-test harness, avoiding multiple overlapping test seams.
15. Acceptance requires the full core-loop test to pass after stopping and restarting the local backend, proving SQLite and Photo Library persistence rather than in-memory behavior.

## Out of Scope

1. Stage Plans, exam sprint plans, midterm plans, Stage Goals, and exam-date association.
2. Exam Result entry, subject score charts, total-score trends, and automatic goal judgment.
3. Weekly Reports, automatic weak-subject analysis, and generated parent commentary.
4. Redo Reminders, automatic Generated Redo Tasks, spaced-review schedules, and automatic Mastered Mistake decisions.
5. Make-up Tasks, cross-day submission, late approval, and discounted make-up points.
6. Skipped Tasks, task archive and restore, and a complete operation audit trail.
7. Partial Redemption and remaining game-time or activity balance management.
8. Weekly Plan Copy, Bulk Subject Adjustment, and Task Template management.
9. Bonus Point Cap or a daily maximum for behavior bonus points.
10. Database backup, restore, import, and export.
11. Online synchronization, account authentication, role permissions, and teacher collaboration.
12. Independent mobile applications, desktop packaging, and Server Deployment.
13. AI-generated learning plans, questions, evaluations, or study advice.
14. Push notifications, email, SMS, or background reminder services.
15. Automatic Study Load Warning. Suggested Duration is shown and totaled, but V1 does not block or warn about excess load.

## Further Notes

1. This specification intentionally follows the V1 scope in `requirements.md` section 17. Earlier detailed requirements remain product context but do not expand V1 acceptance.
2. The core success criterion is that one family can use the system every day to complete the full loop from Weekly Plan through Reward redemption without spreadsheets or manual point calculations.
3. The proposed single primary test seam is the application/API boundary. It is recorded as an implementation assumption because the current request explicitly asks to stop expanding questions and proceed with the main flow.
4. The repository does not currently contain application code, a selected technology stack, an issue-tracker configuration, or triage-label vocabulary. This specification is therefore stored in the repository but cannot yet be published with the `ready-for-agent` label.
5. Product terminology in implementation, UI copy, API naming, and tests should follow `CONTEXT.md` to avoid competing terms for the same concepts.
