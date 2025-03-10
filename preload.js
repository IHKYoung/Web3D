/**
 * 预加载脚本
 * 在渲染进程中安全地暴露Node.js API
 */
import { contextBridge, ipcRenderer } from 'electron';

// 在window对象上暴露一个名为'electronAPI'的对象
// 这个对象可以在渲染进程中使用
contextBridge.exposeInMainWorld('electronAPI', {
  // 添加与Electron主进程通信的方法
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion')
});
