import { contextBridge, ipcRenderer } from 'electron';
import { BgRemoveAPI } from './api';

const api: BgRemoveAPI = {
  pickFiles: () => ipcRenderer.invoke('bgremove:pickFiles'),
  pickOutputDir: () => ipcRenderer.invoke('bgremove:pickOutputDir'),
  processFiles: (paths, opts) => ipcRenderer.invoke('bgremove:processFiles', paths, opts),
  getModelInfo: () => ipcRenderer.invoke('bgremove:getModelInfo'),
  getProviders: () => ipcRenderer.invoke('bgremove:getProviders'),
  getImagePreview: (path, options) => ipcRenderer.invoke('bgremove:getImagePreview', path, options),
  getImageThumbnail: (path, options) => ipcRenderer.invoke('bgremove:getImageThumbnail', path, options),
  openPath: (path) => ipcRenderer.invoke('bgremove:openPath', path)
};

// セキュアなAPIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('bgremove', api);
