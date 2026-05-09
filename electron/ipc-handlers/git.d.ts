import { BrowserWindow } from 'electron';
import { GitBridge } from '../git-bridge';
export declare function registerGitHandlers(ipcMain: Electron.IpcMain, mainWindow: BrowserWindow, gitBridge: GitBridge): void;
