/**
 * 注册所有右键菜单项
 */
export declare function registerContextMenu(): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * 注销所有右键菜单项
 */
export declare function unregisterContextMenu(): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * 检查右键菜单是否已注册
 */
export declare function isContextMenuRegistered(): Promise<boolean>;
/**
 * 解析命令行参数，提取 DBGODVS 操作
 * （主进程直接启动时的备用解析，启动器不走这里）
 */
export declare function parseCommandLine(argv: string[]): {
    action: string;
    path: string;
} | null;
