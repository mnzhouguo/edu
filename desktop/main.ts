import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app,BrowserWindow,Menu,dialog,shell } from 'electron';
import { startRuntime,type Runtime } from '../server/serve.js';

const APP_TITLE='成长计划';
const APP_ID='com.chengzhang.plan';

app.setName(APP_TITLE);
app.setAppUserModelId(APP_ID);

let runtime:Runtime|undefined;
let window:BrowserWindow|undefined;
let quitting=false;

const gotLock=app.requestSingleInstanceLock();
if(!gotLock){
 app.quit();
}else{
 app.on('second-instance',()=>{
  if(!window)return;
  if(window.isMinimized())window.restore();
  window.focus();
 });
 app.whenReady().then(openApp).catch(fail);
}

function packagedRoot(){
 return app.isPackaged?app.getAppPath():fileURLToPath(new URL('../..',import.meta.url));
}

async function openApp(){
 Menu.setApplicationMenu(null);
 const root=packagedRoot();
 const webRoot=join(root,'dist');
 if(!existsSync(join(webRoot,'index.html')))throw new Error('未找到已构建的前端，请先运行 npm run build:web');
 const userData=app.getPath('userData');
 runtime=await startRuntime({
  databasePath:join(userData,'edu.sqlite'),
  photoLibrary:join(userData,'photos'),
  webRoot,
  port:Number(process.env.PORT??3001)
 });
 const icon=join(root,'build','icon.png');
 window=new BrowserWindow({
  width:1280,
  height:840,
  minWidth:960,
  minHeight:640,
  title:APP_TITLE,
  autoHideMenuBar:true,
  show:false,
  backgroundColor:'#eef3f1',
  ...(existsSync(icon)?{icon}:{}),
  webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}
 });
 window.once('ready-to-show',()=>window?.show());
 window.webContents.setWindowOpenHandler(({url})=>{
  shell.openExternal(url);
  return {action:'deny'};
 });
 await window.loadURL(`http://${runtime.host}:${runtime.port}`);
}

function fail(error:unknown){
 const message=error instanceof Error?error.message:String(error);
 dialog.showErrorBox(APP_TITLE,`应用未能启动。\n\n${message}`);
 app.quit();
}

app.on('window-all-closed',()=>app.quit());
app.on('before-quit',event=>{
 if(quitting||!runtime)return;
 event.preventDefault();
 quitting=true;
 runtime.close().catch(()=>undefined).finally(()=>app.quit());
});
