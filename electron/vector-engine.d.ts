import { type SupportedExtension } from './file-parser';
export interface VectorChunk {
    id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    tokenCount: number;
    language: string;
    nodeId?: string;
}
export interface VectorIndex {
    schemaVersion: number;
    projectName: string;
    commitId: string;
    model: string;
    dimensions: number;
    totalChunks: number;
    totalFiles: number;
    totalTokens: number;
    createdAt: string;
    updatedAt: string;
}
export interface StoredIndex {
    meta: VectorIndex;
    chunks: VectorChunk[];
}
export interface VectorQuery {
    text: string;
    topK?: number;
    minSimilarity?: number;
    fileTypes?: string[];
    nodeId?: string;
}
export interface VectorSearchResult {
    chunk: VectorChunk;
    similarity: number;
    rank: number;
}
export type VectorProgressFn = (msg: string) => void;
export declare function buildVectorIndex(rootPath: string, workingCopyPath: string, commitId: string, projectName: string, filePaths?: string[], onProgress?: VectorProgressFn): Promise<{
    success: boolean;
    index?: VectorIndex;
    message?: string;
}>;
export declare function getVectorStatus(rootPath: string, projectName: string): Promise<{
    success: boolean;
    index?: VectorIndex;
    message?: string;
}>;
export declare function deleteVectorIndex(rootPath: string, projectName: string): Promise<{
    success: boolean;
    message?: string;
}>;
export declare function searchVectors(rootPath: string, projectName: string, query: VectorQuery): Promise<{
    success: boolean;
    results: VectorSearchResult[];
    message?: string;
}>;
export declare function searchBatchVectors(rootPath: string, projectName: string, queries: VectorQuery[]): Promise<{
    success: boolean;
    results: VectorSearchResult[][];
    message?: string;
}>;
export interface IndexedFileInfo {
    filePath: string;
    chunkCount: number;
    totalChars: number;
    language: string;
}
export declare function getIndexedFiles(rootPath: string, projectName: string): Promise<{
    success: boolean;
    files: IndexedFileInfo[];
    message?: string;
}>;
export declare function removeFilesFromIndex(rootPath: string, workingCopyPath: string, commitId: string, projectName: string, filePaths: string[], onProgress?: VectorProgressFn): Promise<{
    success: boolean;
    index?: VectorIndex;
    message?: string;
}>;
export declare function ingestFiles(rootPath: string, filePaths: string[], projectName: string, commitId: string, onProgress?: VectorProgressFn): Promise<{
    success: boolean;
    result?: {
        projectName: string;
        filesProcessed: number;
        filesSucceeded: number;
        filesFailed: number;
        totalChunksAdded: number;
        fileResults: Array<{
            name: string;
            success: boolean;
            chunksAdded: number;
            error?: string;
        }>;
        updatedIndex?: VectorIndex;
    };
    message?: string;
}>;
export declare function getSupportedExtensions(): {
    extensions: SupportedExtension[];
};
export declare function exportVectorIndex(rootPath: string, projectName: string): Promise<{
    success: boolean;
    data?: string;
    message?: string;
}>;
export declare function importVectorIndex(rootPath: string, projectName: string, data: string): Promise<{
    success: boolean;
    index?: VectorIndex;
    message?: string;
}>;
export declare function enhanceRagContext(rootPath: string, projectName: string, query: string, topK?: number): Promise<{
    success: boolean;
    vectorResults: VectorSearchResult[];
    message?: string;
}>;
