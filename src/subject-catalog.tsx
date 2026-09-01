import { createContext,useCallback,useContext,useEffect,useMemo,useState } from 'react';
import { api } from './api';
import { subjects as defaultSubjects,type StudentSubject } from './types';

type SubjectCatalogValue={
 subjects:StudentSubject[];
 loading:boolean;
 label:(id:string)=>string;
 reload:()=>Promise<StudentSubject[]>;
 addSubject:(label:string)=>Promise<StudentSubject>;
};

const SubjectCatalogContext=createContext<SubjectCatalogValue|null>(null);

function fallbackSubjects():StudentSubject[]{
 return defaultSubjects.map((item,index)=>({id:item.id,label:item.label,custom:false,sortOrder:index+1}));
}

export function SubjectCatalogProvider({studentId,children}:{studentId:number;children:React.ReactNode}){
 const[subjects,setSubjects]=useState<StudentSubject[]>(fallbackSubjects);
 const[loading,setLoading]=useState(true);

 const reload=useCallback(async()=>{
  const result=await api<{subjects:StudentSubject[]}>(`/api/students/${studentId}/subjects`);
  setSubjects(result.subjects);
  return result.subjects;
 },[studentId]);

 useEffect(()=>{
  let cancelled=false;
  setLoading(true);
  setSubjects(fallbackSubjects());
  reload().catch(()=>{/* keep fallback */}).finally(()=>{if(!cancelled)setLoading(false)});
  return ()=>{cancelled=true};
 },[reload]);

 const value=useMemo<SubjectCatalogValue>(()=>({
  subjects,
  loading,
  label:(id)=>subjects.find(item=>item.id===id)?.label??(id.startsWith('custom_')?id.slice(7):id),
  reload,
  addSubject:async(label)=>{
   const result=await api<{subject:StudentSubject}>(`/api/students/${studentId}/subjects`,{method:'POST',body:JSON.stringify({label})});
   const next=await reload();
   return next.find(item=>item.id===result.subject.id)??result.subject;
  },
 }),[subjects,loading,reload,studentId]);

 return <SubjectCatalogContext.Provider value={value}>{children}</SubjectCatalogContext.Provider>;
}

export function useSubjectCatalog(){
 const value=useContext(SubjectCatalogContext);
 if(!value)throw new Error('useSubjectCatalog 必须在 SubjectCatalogProvider 内使用');
 return value;
}
