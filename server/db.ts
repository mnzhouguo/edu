import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type StudentProfile={id:number;name:string;grade:string;school:string;currentGoal:string;createdAt:string;updatedAt:string};
export type StudentInput=Pick<StudentProfile,'name'|'grade'|'school'|'currentGoal'>;
type Migration={version:number;up:(db:DatabaseSync)=>void};

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
 }}
];

export function openDatabase(filename:string){if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys = ON;');migrate(db);return db}
export function migrate(db:DatabaseSync){db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)');const applied=new Set(db.prepare('SELECT version FROM schema_migrations').all().map(row=>Number((row as {version:number}).version)));for(const migration of migrations){if(applied.has(migration.version))continue;db.exec('BEGIN');try{migration.up(db);db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(migration.version,new Date().toISOString());db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}}}
function mapStudent(row:Record<string,unknown>):StudentProfile{return{id:Number(row.id),name:String(row.name),grade:String(row.grade),school:String(row.school),currentGoal:String(row.current_goal),createdAt:String(row.created_at),updatedAt:String(row.updated_at)}}
export function listStudents(db:DatabaseSync){return db.prepare('SELECT * FROM students ORDER BY created_at,id').all().map(row=>mapStudent(row as Record<string,unknown>))}
export function getStudent(db:DatabaseSync,id:number){const row=db.prepare('SELECT * FROM students WHERE id=?').get(id);return row?mapStudent(row as Record<string,unknown>):null}
export function createStudent(db:DatabaseSync,input:StudentInput){const now=new Date().toISOString();const result=db.prepare('INSERT INTO students(name,grade,school,current_goal,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(input.name.trim(),input.grade.trim(),input.school.trim(),input.currentGoal.trim(),now,now);return getStudent(db,Number(result.lastInsertRowid))!}
export function updateStudent(db:DatabaseSync,id:number,input:StudentInput){const result=db.prepare('UPDATE students SET name=?,grade=?,school=?,current_goal=?,updated_at=? WHERE id=?').run(input.name.trim(),input.grade.trim(),input.school.trim(),input.currentGoal.trim(),new Date().toISOString(),id);return result.changes?getStudent(db,id):null}
