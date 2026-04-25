export declare class LANServer {
    private app;
    private server;
    private rootPath;
    constructor();
    private setupRoutes;
    /**
     * Start the LAN server
     */
    start(rootPath: string, port?: number): Promise<{
        success: boolean;
        address: string;
        message: string;
    }>;
    /**
     * Stop the server
     */
    stop(): void;
    /**
     * Get server status
     */
    getStatus(): {
        running: boolean;
        rootPath: string;
    };
}
