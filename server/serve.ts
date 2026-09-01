import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

export type RuntimeOptions={
 databasePath:string;
 photoLibrary:string;
 webRoot?:string;
 host?:string;
 port?:number;
};

export type Runtime={
 db:DatabaseSync;
 server:Server;
 host:string;
 port:number;
 close:()=>Promise<void>;
};

export function resolveWebRoot(explicit?:string,cwd=process.cwd()){
 const requested=explicit?.trim();
 if(requested)return resolve(cwd,requested);
 const dist=resolve(cwd,'dist');
 return existsSync(resolve(dist,'index.html'))?dist:undefined;
}

export function startRuntime(options:RuntimeOptions):Promise<Runtime>{
 const host=options.host??'127.0.0.1';
 const preferredPort=options.port??Number(process.env.PORT??3001);
 const db=openDatabase(options.databasePath);
 const app=createApp(db,{photoLibrary:options.photoLibrary,webRoot:options.webRoot});
 return listen(app,host,Number.isFinite(preferredPort)?preferredPort:3001).then(({server,port})=>({
  db,server,host,port,
  close(){
   return new Promise<void>((resolveClose,rejectClose)=>{
    server.close(error=>error?rejectClose(error):resolveClose());
   }).finally(()=>db.close());
  }
 }));
}

function listen(app:Express,host:string,preferredPort:number){
 return new Promise<{server:Server;port:number}>((resolveListen,reject)=>{
  const attempt=(port:number)=>{
   const server=app.listen(port,host);
   server.once('listening',()=>{
    const address=server.address() as AddressInfo|null;
    if(!address||typeof address==='string'){
     reject(new Error('服务未能绑定本地端口'));
     return;
    }
    resolveListen({server,port:address.port});
   });
   server.once('error',(error:NodeJS.ErrnoException)=>{
    server.close();
    if(error.code==='EADDRINUSE'&&port!==0){
     attempt(0);
     return;
    }
    reject(error);
   });
  };
  attempt(preferredPort);
 });
}
