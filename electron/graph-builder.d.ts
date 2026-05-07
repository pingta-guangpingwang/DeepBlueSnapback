import type { ArchitectureGraph } from './graph-types';
import type { ParseResult } from './ast-analyzer';
interface BuildOptions {
    projectName: string;
    commitId: string;
    timestamp: string;
}
export declare function buildGraph(parseResult: ParseResult, options: BuildOptions): ArchitectureGraph;
export {};
