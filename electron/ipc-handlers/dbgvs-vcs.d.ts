import { BrowserWindow } from 'electron';
import { DBHTRepository } from '../dbvs-repository';
export declare function registerVcsHandlers(ipcMain: Electron.IpcMain, mainWindow: BrowserWindow, dbvsRepo: DBHTRepository): void;
