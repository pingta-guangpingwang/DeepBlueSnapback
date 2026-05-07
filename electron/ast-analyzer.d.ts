export interface ImportRef {
    modulePath: string;
    names: string[];
    isDefault: boolean;
}
export interface ExportRef {
    name: string;
    kind: 'function' | 'class' | 'variable' | 'type' | 'default';
}
export interface CallRef {
    name: string;
    line: number;
}
export interface ClassRef {
    name: string;
    baseClass?: string;
    methods: string[];
}
export interface ParsedFile {
    path: string;
    absolutePath: string;
    imports: ImportRef[];
    exports: ExportRef[];
    functions: string[];
    classes: ClassRef[];
    calls: CallRef[];
    lines: number;
    hash: string;
}
export interface ParseResult {
    success: boolean;
    files: ParsedFile[];
    errors: string[];
    totalFiles: number;
    cachedFiles: number;
    skippedDirs: number;
    skippedDirNames: string[];
    scannedPath: string;
}
export declare function parseProject(projectPath: string, repoPath: string): Promise<ParseResult>;
export declare function getCachedParseResult(): ParseResult | null;
export declare function setCachedParseResult(result: ParseResult): void;
