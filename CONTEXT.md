# Learning Progress Manager

This context describes the domain language for a family learning progress and reward management product for a junior high school student.

## Language

**Reward**:
A configurable item that can be redeemed with points, such as cash, game time, movies, gifts, or family activities.
_Avoid_: Prize, benefit

**Points**:
The numeric learning currency earned from evaluated study tasks and spent on rewards.
_Avoid_: Coins, score

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
The measurable condition that tells the parent whether a study task was actually completed, such as quantity, accuracy, time limit, recitation result, or correction requirement.
_Avoid_: Requirement, acceptance criteria

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
A parent-maintained named resource attached to a Knowledge Area, such as a workbook, course, or handout title. Name is required; type and note are optional. It is planning context for generated tasks, not Photo Evidence and not an auto-fetched web library.
_Avoid_: Photo Evidence, resource library, attachment, link dump

**Subject Plan Generation**:
The explicit parent action that creates missing Weekly Plan Study Tasks from enabled Knowledge Areas for a chosen week. It fills gaps only: existing tasks from an area are kept, parent edits are not overwritten, and hand-added temporary tasks are left alone. It does not write Daily Plan rows directly.
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
The parent's home view focused on today's execution, this week's trend, and the current points balance.
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
A lightweight record for one child whose plans, tasks, points, mistakes, rewards, and exam results are managed separately.
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

**Exam Result**:
A recorded school test result for one or more subjects, used to observe score trends over time.
_Avoid_: Report card


