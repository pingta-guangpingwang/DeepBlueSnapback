/**
 * DBVS CLI - 命令行接口
 *
 * 用法：
 *   dbvs <command> [options]
 *
 * 所有命令默认输出 JSON 格式，便于 AI Agent 解析。
 * 可选 --format table 或 --format text 切换输出格式。
 */
export declare function runCLI(argv: string[]): void;
