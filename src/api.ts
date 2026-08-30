export async function api<T>(path:string,options?:RequestInit):Promise<T>{
 const headers=new Headers(options?.headers);
 if(!(options?.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 const response=await fetch(path,{...options,headers});
 const body=response.status===204?{}:await response.json();
 if(!response.ok)throw new Error(body.message??'请求失败');
 return body as T;
}
