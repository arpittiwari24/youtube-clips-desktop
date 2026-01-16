import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // yt-dlp operations
  ytdlp: {
    getInfo: (url: string) => ipcRenderer.invoke('ytdlp:getInfo', url),
    getStreamUrl: (url: string) => ipcRenderer.invoke('ytdlp:getStreamUrl', url),
    download: (url: string, outputPath: string, options?: {
      format?: string;
      startTime?: number;
      endTime?: number;
    }) => ipcRenderer.invoke('ytdlp:download', url, outputPath, options),
    downloadTemp: (url: string, options?: { format?: string; startTime?: number; endTime?: number }) =>
      ipcRenderer.invoke('ytdlp:downloadTemp', url, options),
    checkAvailable: () => ipcRenderer.invoke('ytdlp:checkAvailable'),
    onProgress: (callback: (progress: { percent: number; speed: string; eta: string }) => void) => {
      ipcRenderer.on('ytdlp:progress', (_, progress) => callback(progress));
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('ytdlp:progress');
    },
  },

  // FFmpeg operations
  ffmpeg: {
    trim: (inputPath: string, startTime: number, endTime: number, outputPath: string) =>
      ipcRenderer.invoke('ffmpeg:trim', inputPath, startTime, endTime, outputPath),
    trimAccurate: (inputPath: string, startTime: number, endTime: number, outputPath: string) =>
      ipcRenderer.invoke('ffmpeg:trimAccurate', inputPath, startTime, endTime, outputPath),
    toGif: (inputPath: string, outputPath: string, options?: {
      width?: number;
      fps?: number;
    }) => ipcRenderer.invoke('ffmpeg:toGif', inputPath, outputPath, options),
    addSubtitles: (inputPath: string, srtPath: string, outputPath: string, options?: {
      fontName?: string;
      fontSize?: number;
      fontColor?: string;
      outlineColor?: string;
      outlineWidth?: number;
    }) => ipcRenderer.invoke('ffmpeg:addSubtitles', inputPath, srtPath, outputPath, options),
    burnSubtitles: (inputPath: string, captions: Array<{
      start: number;
      end: number;
      text: string;
      words?: Array<{word: string; start: number; end: number}>;
    }>, style: {
      fontName: string;
      fontSize: number;
      primaryColor: string;
      outlineColor: string;
      outlineWidth: number;
      bold: boolean;
      uppercase: boolean;
      shadowColor?: string;
      shadowBlur?: number;
      captionYPosition?: number;
    }, outputPath: string) =>
      ipcRenderer.invoke('ffmpeg:burnSubtitles', inputPath, captions, style, outputPath),
    getDuration: (inputPath: string) => ipcRenderer.invoke('ffmpeg:getDuration', inputPath),
    checkAvailable: () => ipcRenderer.invoke('ffmpeg:checkAvailable'),
    webmToMp4: (inputPath: string, outputPath: string) =>
      ipcRenderer.invoke('ffmpeg:webmToMp4', inputPath, outputPath),
    convertTo916: (inputPath: string, outputPath: string) =>
      ipcRenderer.invoke('ffmpeg:convertTo916', inputPath, outputPath),
  },

  // File dialogs
  dialog: {
    saveFile: (options: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => ipcRenderer.invoke('dialog:saveFile', options),
    openFile: (options: {
      title?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => ipcRenderer.invoke('dialog:openFile', options),
  },

  // Shell operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // App paths
  app: {
    getPath: (name: 'home' | 'appData' | 'temp' | 'downloads') =>
      ipcRenderer.invoke('app:getPath', name),
    getResourcesPath: () => ipcRenderer.invoke('app:getResourcesPath'),
  },

  // Caption generation
  captions: {
    generate: (filePath: string, token: string) =>
      ipcRenderer.invoke('captions:generate', filePath, token),
  },
});
