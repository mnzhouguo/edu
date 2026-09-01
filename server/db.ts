import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { purgeOrphanWeeklyTaskLedger } from './ledger.js';

export type StudentProfile={id:number;name:string;grade:string;school:string;currentGoal:string;semesterStart:string|null;semesterEnd:string|null;hasAvatar:boolean;createdAt:string;updatedAt:string};
export type StudentInput=Pick<StudentProfile,'name'|'grade'|'school'|'currentGoal'|'semesterStart'|'semesterEnd'>;
type Migration={version:number;transactional?:boolean;up:(db:DatabaseSync)=>void};

const migrations:Migration[]=[
 {version:1,up(db){db.exec(`CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  grade TEXT NOT NULL DEFAULT '',school TEXT NOT NULL DEFAULT '',current_goal TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 )`)}},
 {version:2,up(db){db.exec(`CREATE TABLE weekly_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
  subject TEXT NOT NULL CHECK(subject IN ('chinese','math','english','physics','history')),
  content TEXT NOT NULL CHECK(length(trim(content)) > 0),completion_standard TEXT NOT NULL CHECK(length(trim(completion_standard)) > 0),
  suggested_duration INTEGER NOT NULL CHECK(suggested_duration > 0),base_points INTEGER NOT NULL CHECK(base_points >= 0),task_order INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );CREATE INDEX weekly_tasks_student_week ON weekly_tasks(student_id,week_start,weekday,task_order);
 CREATE TABLE daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source_weekly_task_id INTEGER REFERENCES weekly_tasks(id) ON DELETE SET NULL,task_date TEXT NOT NULL,
  subject TEXT NOT NULL,content TEXT NOT NULL,completion_standard TEXT NOT NULL,suggested_duration INTEGER NOT NULL,base_points INTEGER NOT NULL,task_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(student_id,task_date,source_weekly_task_id)
 );CREATE INDEX daily_tasks_student_date ON daily_tasks(student_id,task_date,task_order);`)}},
 {version:3,up(db){
  const keys=db.prepare('PRAGMA foreign_key_list(daily_tasks)').all() as Array<{from:string;on_delete:string}>;
  if(keys.find(key=>key.from==='source_weekly_task_id')?.on_delete==='SET NULL')return;
  db.exec(`CREATE TABLE daily_tasks_new (
   id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
   source_weekly_task_id INTEGER REFERENCES weekly_tasks(id) ON DELETE SET NULL,task_date TEXT NOT NULL,
   subject TEXT NOT NULL,content TEXT NOT NULL,completion_standard TEXT NOT NULL,suggested_duration INTEGER NOT NULL,base_points INTEGER NOT NULL,task_order INTEGER NOT NULL,
   status TEXT NOT NULL DEFAULT 'planned',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(student_id,task_date,source_weekly_task_id)
  );INSERT INTO daily_tasks_new SELECT * FROM daily_tasks;DROP TABLE daily_tasks;ALTER TABLE daily_tasks_new RENAME TO daily_tasks;
  CREATE INDEX daily_tasks_student_date ON daily_tasks(student_id,task_date,task_order);`)
 }},
 {version:4,up(db){db.exec(`CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,daily_task_id INTEGER NOT NULL UNIQUE REFERENCES daily_tasks(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,submitted_at TEXT NOT NULL,note TEXT NOT NULL DEFAULT ''
 );CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('submission','mistake')),owner_id INTEGER NOT NULL,
  relative_path TEXT NOT NULL,media_type TEXT NOT NULL,original_filename TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL
 );CREATE INDEX photos_owner ON photos(owner_type,owner_id);`)}},
 {version:5,up(db){db.exec(`CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,daily_task_id INTEGER NOT NULL UNIQUE REFERENCES daily_tasks(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  completion TEXT NOT NULL CHECK(completion IN ('not_completed','partial','completed','high_quality')),
  accuracy_band TEXT NOT NULL DEFAULT 'unrecorded',tags TEXT NOT NULL DEFAULT '[]',note TEXT NOT NULL DEFAULT '',
  earned_points INTEGER NOT NULL,confirmed INTEGER NOT NULL DEFAULT 0,scoring_rule_version TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );CREATE TABLE point_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('earn','spend','adjust')),amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,source_id INTEGER NOT NULL,created_at TEXT NOT NULL
 );CREATE INDEX point_ledger_student ON point_ledger(student_id,created_at);`)}},
 {version:6,up(db){db.exec(`CREATE TABLE rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),category TEXT NOT NULL CHECK(category IN ('cash','game_time','movie','activity','gift')),
  required_points INTEGER NOT NULL CHECK(required_points > 0),cash_amount INTEGER,description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );CREATE TABLE redemption_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reward_id INTEGER REFERENCES rewards(id) ON DELETE SET NULL,reward_name TEXT NOT NULL,reward_category TEXT NOT NULL,
  requested_points INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
  note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,decided_at TEXT
 );`)}},
 {version:7,up(db){db.exec(`CREATE TABLE mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK(subject IN ('chinese','math','english','physics','history')),
  summary TEXT NOT NULL CHECK(length(trim(summary)) > 0),
  reason TEXT NOT NULL CHECK(reason IN ('concept','formula','calculation','misread','steps','memory','method','time','other')),
  reason_note TEXT NOT NULL DEFAULT '',correct_solution TEXT NOT NULL DEFAULT '',
  redo_status TEXT NOT NULL DEFAULT 'not_redone' CHECK(redo_status IN ('not_redone','redone_wrong','redone_correct')),
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );`)}},
 {version:8,up(db){db.exec(`ALTER TABLE weekly_tasks ADD COLUMN source_knowledge_area TEXT;
 CREATE TABLE subject_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK(subject IN ('chinese','math','english','physics','history')),
  goal_narrative TEXT NOT NULL DEFAULT '',current_score REAL,target_score REAL,target_date TEXT,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(student_id,subject)
 );
 CREATE TABLE knowledge_area_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,area_id TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,
  sessions_per_week INTEGER NOT NULL DEFAULT 3,suggested_duration INTEGER NOT NULL DEFAULT 20,
  UNIQUE(student_id,subject,area_id)
 );
 CREATE TABLE study_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,area_id TEXT NOT NULL,name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  material_type TEXT NOT NULL DEFAULT 'other' CHECK(material_type IN ('workbook','course','handout','other')),
  note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL
 );`)}},
 {version:9,up(db){db.exec(`CREATE TABLE subject_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK(subject IN ('chinese','math','english','physics','history')),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),cadence TEXT NOT NULL CHECK(cadence IN ('daily','weekdays','every_2_days','weekly','custom_weekly')),
  weekdays TEXT NOT NULL DEFAULT '[]',material_id INTEGER REFERENCES study_materials(id) ON DELETE SET NULL,
  suggested_duration INTEGER NOT NULL CHECK(suggested_duration > 0),completion_standard TEXT NOT NULL,
  base_points INTEGER NOT NULL CHECK(base_points >= 0),active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );CREATE INDEX subject_plan_items_student_subject ON subject_plan_items(student_id,subject,sort_order);`)}}
,
 {version:10,up(db){db.exec(`CREATE TABLE IF NOT EXISTS subject_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK(subject IN ('chinese','math','english','physics','history')),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),cadence TEXT NOT NULL CHECK(cadence IN ('daily','weekdays','every_2_days','weekly','custom_weekly')),
  weekdays TEXT NOT NULL DEFAULT '[]',material_id INTEGER REFERENCES study_materials(id) ON DELETE SET NULL,
  suggested_duration INTEGER NOT NULL CHECK(suggested_duration > 0),completion_standard TEXT NOT NULL,
  base_points INTEGER NOT NULL CHECK(base_points >= 0),active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL
 );CREATE INDEX IF NOT EXISTS subject_plan_items_student_subject ON subject_plan_items(student_id,subject,sort_order);`)}}
 ,
 {version:11,transactional:false,up(db){
  db.exec(`PRAGMA foreign_keys=OFF;
  CREATE TABLE student_subjects (
   id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
   subject_key TEXT NOT NULL,label TEXT NOT NULL CHECK(length(trim(label)) > 0),sort_order INTEGER NOT NULL,created_at TEXT NOT NULL,
   UNIQUE(student_id,subject_key),UNIQUE(student_id,label)
  );
  CREATE TABLE weekly_tasks_new (
   id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
   week_start TEXT NOT NULL,weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),subject TEXT NOT NULL,
   content TEXT NOT NULL CHECK(length(trim(content)) > 0),completion_standard TEXT NOT NULL CHECK(length(trim(completion_standard)) > 0),
   suggested_duration INTEGER NOT NULL CHECK(suggested_duration > 0),base_points INTEGER NOT NULL CHECK(base_points >= 0),task_order INTEGER NOT NULL,
   created_at TEXT NOT NULL,updated_at TEXT NOT NULL,source_knowledge_area TEXT
  );
  INSERT INTO weekly_tasks_new SELECT id,student_id,week_start,weekday,subject,content,completion_standard,suggested_duration,base_points,task_order,created_at,updated_at,source_knowledge_area FROM weekly_tasks;
  DROP TABLE weekly_tasks;ALTER TABLE weekly_tasks_new RENAME TO weekly_tasks;
  CREATE INDEX weekly_tasks_student_week ON weekly_tasks(student_id,week_start,weekday,task_order);
  CREATE TABLE subject_plans_new (
   id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,subject TEXT NOT NULL,
   goal_narrative TEXT NOT NULL DEFAULT '',current_score REAL,target_score REAL,target_date TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(student_id,subject)
  );
  INSERT INTO subject_plans_new SELECT * FROM subject_plans;DROP TABLE subject_plans;ALTER TABLE subject_plans_new RENAME TO subject_plans;
  CREATE TABLE subject_plan_items_new (
   id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,subject TEXT NOT NULL,
   name TEXT NOT NULL CHECK(length(trim(name)) > 0),cadence TEXT NOT NULL CHECK(cadence IN ('daily','weekdays','every_2_days','weekly','custom_weekly')),
   weekdays TEXT NOT NULL DEFAULT '[]',material_id INTEGER REFERENCES study_materials(id) ON DELETE SET NULL,
   suggested_duration INTEGER NOT NULL CHECK(suggested_duration > 0),completion_standard TEXT NOT NULL,
   base_points INTEGER NOT NULL CHECK(base_points >= 0),active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  INSERT INTO subject_plan_items_new SELECT * FROM subject_plan_items;DROP TABLE subject_plan_items;ALTER TABLE subject_plan_items_new RENAME TO subject_plan_items;
  CREATE INDEX subject_plan_items_student_subject ON subject_plan_items(student_id,subject,sort_order);
  PRAGMA foreign_keys=ON;`)
 }},
 {version:12,up(db){db.exec(`ALTER TABLE subject_plan_items ADD COLUMN evaluation_rubric TEXT`)}},
 {version:13,up(db){db.exec(`ALTER TABLE students ADD COLUMN semester_start TEXT;ALTER TABLE students ADD COLUMN semester_end TEXT`)}},
 {version:14,up(db){db.exec(`ALTER TABLE weekly_tasks ADD COLUMN execution_status TEXT NOT NULL DEFAULT 'not_started';
 ALTER TABLE weekly_tasks ADD COLUMN actual_duration INTEGER;
 ALTER TABLE weekly_tasks ADD COLUMN earned_points INTEGER;
 ALTER TABLE weekly_tasks ADD COLUMN dimension_scores TEXT;
 ALTER TABLE weekly_tasks ADD COLUMN evaluation_rubric TEXT`)}},
 {version:15,up(db){db.exec('ALTER TABLE students ADD COLUMN avatar_path TEXT')}},
 {version:16,up(db){purgeOrphanWeeklyTaskLedger(db)}},
 {version:17,up(db){db.exec('ALTER TABLE rewards ADD COLUMN image_path TEXT')}},
 {version:18,up(db){db.exec('ALTER TABLE redemption_requests ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1')}},
 {version:19,transactional:false,up(db){
  db.exec(`PRAGMA foreign_keys=OFF;
  CREATE TABLE rewards_new (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   name TEXT NOT NULL CHECK(length(trim(name)) > 0),
   category TEXT NOT NULL CHECK(category IN ('cash','game_time','movie','activity','gift')),
   required_points INTEGER NOT NULL CHECK(required_points > 0),
   cash_amount INTEGER,
   description TEXT NOT NULL DEFAULT '',
   active INTEGER NOT NULL DEFAULT 1,
   image_path TEXT,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
  );
  INSERT INTO rewards_new(id,name,category,required_points,cash_amount,description,active,image_path,created_at,updated_at)
   SELECT id,name,category,required_points,cash_amount,description,active,image_path,created_at,updated_at FROM rewards;
  DROP TABLE rewards;
  ALTER TABLE rewards_new RENAME TO rewards;
  PRAGMA foreign_keys=ON;`);
 }},
 {version:20,up(db){db.exec("ALTER TABLE point_ledger ADD COLUMN note TEXT NOT NULL DEFAULT ''")}},
 {version:21,up(db){db.exec("ALTER TABLE point_ledger ADD COLUMN category TEXT NOT NULL DEFAULT ''")}}
];

export function openDatabase(filename:string){if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys = ON;');migrate(db);return db}
export function migrate(db:DatabaseSync){db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)');const applied=new Set(db.prepare('SELECT version FROM schema_migrations').all().map(row=>Number((row as {version:number}).version)));for(const migration of migrations){if(applied.has(migration.version))continue;if(migration.transactional===false){migration.up(db);db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(migration.version,new Date().toISOString());continue}db.exec('BEGIN');try{migration.up(db);db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(migration.version,new Date().toISOString());db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}}}
function mapStudent(row:Record<string,unknown>):StudentProfile{return{id:Number(row.id),name:String(row.name),grade:String(row.grade),school:String(row.school),currentGoal:String(row.current_goal),semesterStart:row.semester_start?String(row.semester_start):null,semesterEnd:row.semester_end?String(row.semester_end):null,hasAvatar:Boolean(row.avatar_path),createdAt:String(row.created_at),updatedAt:String(row.updated_at)}}
export function listStudents(db:DatabaseSync){return db.prepare('SELECT * FROM students ORDER BY created_at,id').all().map(row=>mapStudent(row as Record<string,unknown>))}
export function getStudent(db:DatabaseSync,id:number){const row=db.prepare('SELECT * FROM students WHERE id=?').get(id);return row?mapStudent(row as Record<string,unknown>):null}
export function studentAvatarPath(db:DatabaseSync,id:number){const row=db.prepare('SELECT avatar_path FROM students WHERE id=?').get(id) as {avatar_path:string|null}|undefined;return row?row.avatar_path:undefined}
export function setStudentAvatarPath(db:DatabaseSync,id:number,avatarPath:string|null){
 const result=db.prepare('UPDATE students SET avatar_path=?,updated_at=? WHERE id=?').run(avatarPath,new Date().toISOString(),id);
 return result.changes?getStudent(db,id):null;
}
export function createStudent(db:DatabaseSync,input:StudentInput){const now=new Date().toISOString();const result=db.prepare('INSERT INTO students(name,grade,school,current_goal,semester_start,semester_end,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(input.name.trim(),input.grade.trim(),input.school.trim(),input.currentGoal.trim(),input.semesterStart,input.semesterEnd,now,now);return getStudent(db,Number(result.lastInsertRowid))!}
export function updateStudent(db:DatabaseSync,id:number,input:StudentInput){const result=db.prepare('UPDATE students SET name=?,grade=?,school=?,current_goal=?,semester_start=?,semester_end=?,updated_at=? WHERE id=?').run(input.name.trim(),input.grade.trim(),input.school.trim(),input.currentGoal.trim(),input.semesterStart,input.semesterEnd,new Date().toISOString(),id);return result.changes?getStudent(db,id):null}



