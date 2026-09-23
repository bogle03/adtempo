const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('daylogDesktop',Object.freeze({
 onWidget:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('daylog:widget-update',listener);return ()=>ipcRenderer.removeListener('daylog:widget-update',listener);},
 moveWidget:delta=>ipcRenderer.invoke('daylog:widget-move',delta),
 widget:(action,value)=>ipcRenderer.invoke('daylog:widget',action,value),
 minimize:()=>ipcRenderer.invoke('daylog:minimize',true),
 resizeCompact:height=>ipcRenderer.invoke('daylog:compact-size',height),
 setOpacity:value=>ipcRenderer.invoke('daylog:opacity',value),
 onOpacity:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('daylog:opacity',listener);return ()=>ipcRenderer.removeListener('daylog:opacity',listener);},
 expand:()=>ipcRenderer.invoke('daylog:minimize',false),
 onCompact:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('daylog:compact',listener);return ()=>ipcRenderer.removeListener('daylog:compact',listener);}
}));
