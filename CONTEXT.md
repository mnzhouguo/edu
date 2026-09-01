# Learning Progress Manager

This context describes the domain language for a family learning progress and reward management product for a junior high school student.

## Language

**Reward**:
A configurable item that can be redeemed with points, such as cash, game time, movies, gifts, or family activities. The Reward catalog is shared across all Student Profiles in the household; editing or deleting a Reward affects every child. An optional Reward Image is a tempting photo the parent attaches so the child can see what they are working toward.
_Avoid_: Prize, benefit

**Points**:
The numeric learning currency earned from evaluated study tasks and spent on rewards. Parents may also record Extra Channel Points for recognition outside study tasks, such as teacher praise in a class WeChat group.
_Avoid_: Coins, score

**Extra Channel Points**:
A parent-recorded Points earn that did not come from completing a Study Task. Each entry requires a category: school praise (学校表扬), goal achieved (目标达成), housework (家务), excellent homework (作业优秀), or other (其他). An optional reason note can add detail, such as teacher praise in a class WeChat group. These entries appear in the Points earn history on the Points Exchange page.
_Avoid_: Manual backfill, makeup points, fake task completion

**Subject Weight**:
The fixed importance multiplier or point bias assigned to a subject, with Chinese, math, English, and physics weighted higher than history in the first version.
_Avoid_: Subject priority, subject level

**Cash Conversion Rate**:
The fixed exchange rule for converting points into cash rewards, such as 100 points for 5 yuan.
_Avoid_: Money rate, exchange price

**Study Task**:
A specific learning activity assigned to the student for a date and subject, with requirements, suggested duration, base points, and evaluation state.
_Avoid_: Homework, assignment

**Completion Standard**:
The measurable condition that tells the parent whether a study task was actually completed. Prefer an Evaluation Rubric of dimensions and levels; a plain-text summary may still travel with generated Study Tasks.
_Avoid_: Requirement, acceptance criteria

**Evaluation Rubric**:
The scored breakdown of a Completion Standard into Evaluation Dimensions; each dimension carries one max score (typically 字迹与过程 40%, 专注度 30%, 正确率 30% of base Points).
_Avoid_: Grading form, checklist, scoring sheet

**Evaluation Dimension**:
One scored aspect inside an Evaluation Rubric, such as handwriting-and-process, focus, or accuracy, with a single max score used when awarding Points.
_Avoid_: Criterion group, category, metric, Rubric Level

**Accuracy Band**:
An approximate correctness level selected during evaluation, such as 60%, 80%, or 90%, rather than an exact automatically calculated rate.
_Avoid_: Exact accuracy, score percentage

**Task Order**:
The parent-controlled sequence in which daily study tasks should be completed.
_Avoid_: Priority queue, schedule order

**Subject Filter**:
A control on today's board that limits visible study tasks to one or more subjects while preserving the task order list.
_Avoid_: Subject column, subject page

**Mistake Notebook**:
A subject-specific collection of wrong questions with photo evidence, error reasons, corrections, and redo results.
_Avoid_: Error book, wrong question list

**Photo Evidence**:
An uploaded image attached to a mistake or study task as proof or reference material for review.
_Avoid_: Attachment, picture

**Photo Library**:
The local folder where uploaded study task photos and mistake photos are stored, while the database keeps their paths and metadata.
_Avoid_: Image database, gallery

**Subject Plan**:
The long-lived, per-subject score-improvement breakdown for one student: which Knowledge Areas are active, their order and intensity, linked Study Materials, and the Subject Goal. Weekly and daily Study Tasks are generated from it; it is not a calendar week and not a time-bounded exam sprint.
_Avoid_: Learning plan (alone), study planning page, curriculum, Stage Plan

**Subject Goal**:
A measurable score-improvement target attached to one Subject Plan, such as raising English from 95 to 110. Distinct from the Student Profile's overall current goal.
_Avoid_: Stage Goal, current goal, motivation

**Knowledge Area**:
A fixed, product-defined major block within a subject used for score-oriented planning, such as vocabulary, reading, or classical Chinese. Parents enable, order, attach materials, and set intensity; they do not invent the area list. Study Tasks are dated instances generated from an area, not the area itself.
_Avoid_: Knowledge point, topic, tag, category

**Knowledge Area Intensity**:
The parent-configured weekly frequency and suggested duration for one enabled Knowledge Area, such as five sessions per week at fifteen minutes each. Generation uses this to place Study Tasks into the Weekly Plan.
_Avoid_: Priority, weight, difficulty

**Study Material**:
A parent-maintained named tutoring resource attached to a subject plan, such as a workbook or handout title. Shown in the product UI as 辅导资料; name is required and a usage note is optional.
_Avoid_: Photo Evidence, resource library, attachment, link dump, 教材类型, 知识方向

**Material Planning Matrix**:
A subject weekly-planning view whose columns are enabled Study Materials and whose rows are weekdays. Each cell contains zero or more Study Tasks linked to that material, and each row shows the automatically calculated subject duration total. The first product use is Chinese.
_Avoid_: Spreadsheet, timetable, knowledge-area grid

**Material Weekly Template**:
A reusable seven-day pattern owned by one Study Material. Its entries define the default weekday tasks, Completion Standards, Suggested Durations, Base Points, and within-cell order used when creating a Weekly Plan.
_Avoid_: Weekly Plan, Task Template, recurring calendar event

**Material Deactivation**:
Removing a Study Material from future planning without deleting its historical Study Tasks. A material with no historical tasks may be deleted; a referenced material must be deactivated.
_Avoid_: Material deletion, archive task
**Subject Plan Generation**:
The explicit parent action that creates Weekly Plan Study Tasks from active Subject Plan Items (or enabled Knowledge Areas when no items exist) for a chosen week. Default API behavior fills gaps only. When invoked with replace mode from the product UI, incomplete Weekly Plan rows for that student are cleared first, then the week is regenerated. Completed Weekly Plan tasks and their earned Points are kept and are not duplicated for the same Subject Plan Item and weekday. It does not write Daily Plan rows directly.
_Avoid_: Auto-sync, silent rewrite, daily generation

**Weekly Plan**:
A reusable seven-day learning schedule that defines the default study tasks for each subject. Tasks may be generated from enabled Knowledge Areas in the Subject Plan, then edited by the parent.
_Avoid_: Timetable, calendar

**Task Template**:
A reusable predefined study task that parents can insert into weekly plans, stage plans, or daily plans.
_Avoid_: Preset, boilerplate

**Stage Plan**:
A temporary learning plan for a special period, such as monthly exam preparation, midterm review, or final exam sprint, that can override or supplement the weekly plan.
_Avoid_: Campaign, program

**Stage Goal**:
The measurable purpose of a stage plan, optionally tied to an exam date, such as improving math by 10 points before a monthly exam.
_Avoid_: Motivation, note

**Stage Plan Mode**:
The parent-selected rule for how a stage plan affects the regular weekly plan: either replacing matching tasks or appending extra tasks.
_Avoid_: Merge strategy

**Daily Plan**:
The concrete list of study tasks shown for one date, usually generated from the weekly plan and then adjusted by the parent if needed.
_Avoid_: Daily checklist

**Study Load Warning**:
A non-blocking warning shown when the total planned study time for a day exceeds the recommended limit.
_Avoid_: Hard limit, validation error

**Evaluation**:
The parent's assessment of a study task's completion and quality, used to calculate earned points.
_Avoid_: Grade, mark

**Mistake Reason**:
A categorized explanation for why a question was answered incorrectly, selected from fixed categories with optional notes.
_Avoid_: Error type, failure reason

**Parent Dashboard**:
The parent's home view of daily and weekly earned points and task completion, with comparison to yesterday and last week, this week's grouped bar charts for task totals versus completed counts and base Points versus earned Points, plus this calendar month from the 1st through the selected date for completion rate and earned Points as line charts.
_Avoid_: Admin panel, report page

**Estimated Points**:
The provisional points shown after student submission or before parent confirmation; they do not change the points balance.
_Avoid_: Pending balance, temporary score

**Points Balance**:
The official available points total that only changes after parent-confirmed evaluations or approved redemptions.
_Avoid_: Estimated points, score total

**Local Database**:
The SQLite database used by the first version to persist study plans, tasks, evaluations, points, rewards, mistake records, photos, and exam results.
_Avoid_: Browser storage, localStorage

**Local Web App**:
The first-version runtime shape: a local backend serving a browser-based interface and persisting data in SQLite.
_Avoid_: Static webpage, hosted app

**Server Deployment**:
A future runtime shape where the app is deployed to a server for network access after the local version is validated.
_Avoid_: First-version hosting

**Main Page**:
A top-level product page, such as today's board, weekly plan, subject plan, mistake notebook, points and rewards, or data overview.
_Avoid_: Tab, section

**Open Local Access**:
The first-version access model where the app opens directly without login or password because it is intended for family use on a trusted local computer.
_Avoid_: Authentication, account system

**Student Profile**:
A lightweight record for one child whose plans, tasks, points, mistakes, redemptions, and exam results are managed separately. The Reward catalog is shared across children. An optional circular Avatar photo is shown in the top Active Student control.
_Avoid_: Student account, login user

**Active Student**:
The currently selected student profile shown in the top area of the app; all pages switch their data based on this selection.
_Avoid_: Logged-in student, account context

**Weekly Plan Copy**:
Creating a new weekly plan from the previous week, with optional bulk subject-level adjustments.
_Avoid_: Duplicate schedule

**Bulk Subject Adjustment**:
Changing copied weekly plan tasks by subject, including deletion, template replacement, suggested duration changes, and base point changes.
_Avoid_: Mass edit

**Skipped Task**:
A study task intentionally marked as skipped with a reason, earning no points and causing no penalty.
_Avoid_: Failed task, incomplete task

**Make-up Task**:
A study task completed after its original date, marked separately and awarded discounted points.
_Avoid_: Late task, overdue task

**Partial Redemption**:
Using part of an approved reward, such as part of a game-time reward, while preserving the remaining amount for later use.
_Avoid_: Split purchase, partial refund

**Redo Reminder**:
The scheduled prompt to revisit a mistake after fixed intervals, defaulting to day 2, day 7, and day 14 after the mistake is recorded.
_Avoid_: Notification, alarm
**Generated Redo Task**:
A study task automatically created from a due redo reminder and placed on today's board.
_Avoid_: Manual reminder, ordinary task

**Archived Task**:
A submitted or evaluated study task retained for historical accuracy but removed from active work views.
_Avoid_: Deleted task, canceled task

**Weekly Task Execution Status**:
The parent-managed outcome of one Weekly Plan Study Task for its scheduled day: 未开始 (default), 已完成, 已作废, or 已延期. Completing a task requires scoring each Evaluation Dimension and recording actual duration; earned Points equal the sum of dimension scores and may exceed the task's standard base Points or dimension reference maxima (bonus allowed). Scores must be non-negative integers. A completed Weekly Plan Study Task cannot be deleted. Deleting an incomplete task also removes its Points ledger rows so remaining tasks, the Points Balance, and total earned Points stay aligned.
_Avoid_: Using Daily Plan planned/submitted/evaluated labels on weekly plan rows, checkbox-only done

**Bonus Point Cap**:
The maximum additional behavior-based points a student can earn in one day; base task points are not capped.
_Avoid_: Daily point cap

**Mastered Mistake**:
A mistake marked as mastered after two consecutive correct redo attempts, allowing later scheduled reminders to stop.
_Avoid_: Deleted mistake, corrected once

**Weekly Report**:
A weekly summary of completion rate, points, mistakes, and weak subjects for one student.
_Avoid_: Monthly report, dashboard

**Student Submission**:
The student's claim that a study task has been completed, pending parent evaluation before points are awarded.
_Avoid_: Final status, self grade

**Redemption Request**:
A child's request to spend points on a reward, which only deducts points after parent approval.
_Avoid_: Purchase, order

**Redemption Quantity**:
How many units of a Reward are redeemed in one request. Points spent equal the Reward's required Points times this quantity.
_Avoid_: Count, amount (alone)

**Exam Result**:
A recorded school test result for one or more subjects, used to observe score trends over time.
_Avoid_: Report card

**Semester**:
The parent-configured school-term window for one student, defined by a start date and end date. Used to count natural weeks (Monday–Sunday) and label Weekly Plan views as 开学第 N 周.
_Avoid_: Academic year alone, calendar month, stage

**Semester Week**:
The 1-based index of the Monday-start week within the Semester that contains the Weekly Plan's weekStart. Total semester weeks are counted from the Monday of the start week through the Monday of the end week.
_Avoid_: ISO week number alone, teaching week without semester bounds



