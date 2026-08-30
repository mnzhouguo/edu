import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type StudentProfile = { id:number; name:string; grade:string; school:string; currentGoal:string; createdAt:string; updatedAt:string };
export type StudentInput = Pick<StudentProfile, 'name'|'grade'|'school'|'currentGoal'>;

export function openDatabase(filename:string) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive:true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

export function migrate(db:DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  if (db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get()) return;
  db.exec('BEGIN');
  try {
    db.exec(`CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK(length(trim(name)) > 0),
      grade TEXT NOT NULL DEFAULT '', school TEXT NOT NULL DEFAULT '', current_goal TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

function mapStudent(row:Record<string,unknown>):StudentProfile {
  return { id:Number(row.id), name:String(row.name), grade:String(row.grade), school:String(row.school), currentGoal:String(row.current_goal), createdAt:String(row.created_at), updatedAt:String(row.updated_at) };
}
export function listStudents(db:DatabaseSync) { return db.prepare('SELECT * FROM students ORDER BY created_at, id').all().map(row => mapStudent(row as Record<string,unknown>)); }
export function getStudent(db:DatabaseSync,id:number) { const row=db.prepare('SELECT * FROM students WHERE id = ?').get(id); return row ? mapStudent(row as Record<string,unknown>) : null; }
export function createStudent(db:DatabaseSync,input:StudentInput) {
  const now=new Date().toISOString();
  const result=db.prepare('INSERT INTO students(name,grade,school,current_goal,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(input.name.trim(),input.grade.trim(),input.school.trim(),input.currentGoal.trim(),now,now);
  return getStudent(db,Number(result.lastInsertRowid))!;
}
export function updateStudent(db:DatabaseSync,id:number,input:StudentInput) {
  const result=db.prepare('UPDATE students SET name=?,grade=?,school=?,current_goal=?,updated_at=? WHERE id=?').run(input.name.trim(),input.grade.trim(),input.school.trim(),input.currentGoal.trim(),new Date().toISOString(),id);
  return result.changes ? getStudent(db,id) : null;
}
