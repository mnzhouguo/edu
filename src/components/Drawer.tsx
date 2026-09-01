import { createPortal } from 'react-dom';

export function Drawer({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
 return createPortal(
  <div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>{children}</div>,
  document.body
 );
}
