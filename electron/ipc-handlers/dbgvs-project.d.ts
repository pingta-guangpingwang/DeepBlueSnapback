import { BrowserWindow } from 'electron';
import { DBHTRepository } from '../dbvs-repository';
export declare function registerProjectHandlers(ipcMain: Electron.IpcMain, mainWindow: BrowserWindow, dbvsRepo: DBHTRepository): void;
export { getProjectsList } from '../project-registry';
