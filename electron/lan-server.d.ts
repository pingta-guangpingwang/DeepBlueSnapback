export declare class LANServer {
    private app;
    private server;
    private rootPath;
    private token;
    constructor();
    private setupRoutes;
    /**
     * Start the LAN server. Auto-generates a Bearer token if none exists.
     */
    start(rootPath: string, port?: number): Promise<{
        success: boolean;
        address: string;
        token: string;
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
