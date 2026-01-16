// Type definitions for the exposed Electron API
export interface ElectronAPI {
  ytdlp: {
    getInfo: (url: string) => Promise<{
      id: string;
      title: string;
      duration: number;
      thumbnail: string;
      url: string;
      formats: Array<{
        formatId: string;
        ext: string;
        resolution: string;
        filesize: number;
      }>;
    }>;
    getStreamUrl: (url: string) => Promise<string>;
    download: (url: string, outputPath: string, options?: {
      format?: string;
      startTime?: number;
      endTime?: number;
    }) => Promise<string>;
    downloadTemp: (url: string, options?: { format?: string; startTime?: number; endTime?: number }) => Promise<string>;
    checkAvailable: () => Promise<boolean>;
    onProgress: (callback: (progress: { percent: number; speed: string; eta: string }) => void) => void;
    removeProgressListener: () => void;
  };
  ffmpeg: {
    trim: (inputPath: string, startTime: number, endTime: number, outputPath: string) => Promise<string>;
    trimAccurate: (inputPath: string, startTime: number, endTime: number, outputPath: string) => Promise<string>;
    toGif: (inputPath: string, outputPath: string, options?: {
      width?: number;
      fps?: number;
    }) => Promise<string>;
    addSubtitles: (inputPath: string, srtPath: string, outputPath: string, options?: {
      fontName?: string;
      fontSize?: number;
      fontColor?: string;
      outlineColor?: string;
      outlineWidth?: number;
    }) => Promise<string>;
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
    }, outputPath: string) => Promise<string>;
    getDuration: (inputPath: string) => Promise<number>;
    checkAvailable: () => Promise<boolean>;
    webmToMp4: (inputPath: string, outputPath: string) => Promise<string>;
    convertTo916: (inputPath: string, outputPath: string) => Promise<string>;
  };
  dialog: {
    saveFile: (options: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<string | null>;
    openFile: (options: {
      title?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<string | null>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  app: {
    getPath: (name: 'home' | 'appData' | 'temp' | 'downloads') => Promise<string>;
    getResourcesPath: () => Promise<string>;
  };
  captions: {
    generate: (filePath: string, token: string) => Promise<Array<{
      start: number;
      end: number;
      text: string;
      words?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
