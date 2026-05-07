export interface ExternalApiConfig {
    enabled: boolean;
    port: number;
    token: string;
}
export declare function getExternalApiConfig(): ExternalApiConfig;
export declare function loadExternalApiConfig(rootPath: string): ExternalApiConfig;
export declare function saveExternalApiConfig(rootPath: string, config: ExternalApiConfig): void;
export declare function startExternalApi(rootPath: string): Promise<{
    success: boolean;
    message: string;
    port?: number;
    address?: string;
}>;
export declare function stopExternalApi(): {
    success: boolean;
    message: string;
};
export declare function getExternalApiStatus(): {
    running: boolean;
    port: number;
};
