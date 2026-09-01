import { resolve } from 'node:path';
import { resolveWebRoot,startRuntime } from './serve.js';

const databasePath=process.env.DATABASE_PATH??resolve('data','edu.sqlite');
const photoLibrary=process.env.PHOTO_LIBRARY??resolve('data','photos');
const webRoot=resolveWebRoot(process.env.WEB_ROOT);
const runtime=await startRuntime({databasePath,photoLibrary,webRoot,port:Number(process.env.PORT??3001)});
console.log(`成长计划: http://${runtime.host}:${runtime.port}`);
console.log(`SQLite database: ${databasePath}`);
console.log(`Photo Library: ${photoLibrary}`);
if(webRoot)console.log(`Web root: ${webRoot}`);
function shutdown(){ runtime.close().then(()=>process.exit(0)).catch(()=>process.exit(1)); }
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
