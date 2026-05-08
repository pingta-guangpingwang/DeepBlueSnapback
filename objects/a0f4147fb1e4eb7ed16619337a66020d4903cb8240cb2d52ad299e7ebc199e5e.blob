export interface SupportedExtension {
    extension: string;
    description: string;
    category: 'document' | 'data' | 'web' | 'code';
}
export declare const SUPPORTED_INGEST_EXTENSIONS: SupportedExtension[];
export declare function isBinaryFormat(extension: string): boolean;
export declare function findSupportedFiles(rootDir: string): string[];
export declare function parseFileToText(filePath: string): Promise<{
    success: boolean;
    text?: string;
    error?: string;
}>;
