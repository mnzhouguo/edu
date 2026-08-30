import { resolve } from 'node:path';
import { createApp } from './app.js';
import { openDatabase } from './db.js';
const port=Number(process.env.PORT??3001);
const databasePath=process.env.DATABASE_PATH??resolve('data','edu.sqlite');
const db=openDatabase(databasePath);
const server=createApp(db).listen(port,'127.0.0.1',()=>{ console.log(`Learning Progress API: http://127.0.0.1:${port}`); console.log(`SQLite database: ${databasePath}`); });
function shutdown(){ server.close(()=>{ db.close(); process.exit(0); }); }
process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
