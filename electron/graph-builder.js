"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGraph = buildGraph;
const path = __importStar(require("path"));
function splitPath(relPath) {
    return relPath.replace(/\\/g, '/').split('/').filter(Boolean);
}
function findOrCreateNode(root, pathSegments, idPrefix) {
    let current = root;
    for (let i = 0; i < pathSegments.length; i++) {
        const seg = pathSegments[i];
        const isFile = i === pathSegments.length - 1;
        const nodeId = idPrefix + ':' + pathSegments.slice(0, i + 1).join('/');
        let child = current.children?.find(c => c.id === nodeId);
        if (!child) {
            child = {
                id: nodeId,
                type: isFile ? 'room' : i === 0 ? 'building' : 'floor',
                label: seg,
                path: pathSegments.slice(0, i + 1).join('/'),
                fileCount: 0,
                lineCount: 0,
                exportsCount: 0,
            };
            if (!current.children)
                current.children = [];
            current.children.push(child);
        }
        current = child;
    }
    return current;
}
function aggregateStats(node) {
    if (!node.children || node.children.length === 0) {
        // Leaf node is already populated
        return;
    }
    let fileCount = 0;
    let lineCount = 0;
    let exportsCount = 0;
    for (const child of node.children) {
        aggregateStats(child);
        fileCount += child.fileCount;
        lineCount += child.lineCount;
        exportsCount += child.exportsCount;
    }
    node.fileCount = fileCount;
    node.lineCount = lineCount;
    node.exportsCount = exportsCount;
}
// Detect circular dependencies using DFS
function detectCircularDeps(edges, nodeIds) {
    const circularEdgeIds = new Set();
    // Build adjacency list
    const adj = new Map();
    for (const edge of edges) {
        if (edge.type === 'circular')
            continue; // already marked
        const list = adj.get(edge.source) || [];
        list.push(edge.target);
        adj.set(edge.source, list);
    }
    // DFS for cycles
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    for (const id of nodeIds)
        color.set(id, WHITE);
    function dfs(node, pathNodes) {
        color.set(node, GRAY);
        pathNodes.add(node);
        const neighbors = adj.get(node) || [];
        for (const neighbor of neighbors) {
            if (!nodeIds.has(neighbor))
                continue;
            const c = color.get(neighbor);
            if (c === GRAY) {
                // Found cycle - mark the edge
                const cycleEdge = edges.find(e => e.source === node && e.target === neighbor);
                if (cycleEdge) {
                    circularEdgeIds.add(cycleEdge.id);
                    cycleEdge.type = 'circular';
                }
                return true;
            }
            if (c === WHITE) {
                if (dfs(neighbor, pathNodes)) {
                    const cycleEdge = edges.find(e => e.source === node && e.target === neighbor);
                    if (cycleEdge) {
                        circularEdgeIds.add(cycleEdge.id);
                        cycleEdge.type = 'circular';
                    }
                }
            }
        }
        pathNodes.delete(node);
        color.set(node, BLACK);
        return false;
    }
    for (const id of nodeIds) {
        if (color.get(id) === WHITE) {
            dfs(id, new Set());
        }
    }
    return circularEdgeIds;
}
function buildGraph(parseResult, options) {
    const { projectName, commitId, timestamp } = options;
    const rootNode = {
        id: 'root',
        type: 'building',
        label: projectName,
        path: '/',
        fileCount: 0,
        lineCount: 0,
        exportsCount: 0,
        children: [],
    };
    const edges = [];
    const fileNodeMap = new Map(); // relPath -> leaf node
    const moduleNodeMap = new Map(); // module path -> node
    // Step 1: Build folder/file tree
    for (const file of parseResult.files) {
        const parts = splitPath(file.path);
        // Skip root-level files
        if (parts.length === 0)
            continue;
        const dirParts = parts.slice(0, -1);
        const fileName = parts[parts.length - 1];
        // Find or create directory nodes
        let dirNode = rootNode;
        if (dirParts.length > 0) {
            dirNode = findOrCreateNode(rootNode, dirParts, 'dir');
        }
        // Create file node
        const fileId = 'file:' + file.path;
        // Check if file already exists as child of dirNode
        let fileNode = dirNode.children?.find(c => c.id === fileId);
        if (!fileNode) {
            fileNode = {
                id: fileId,
                type: 'room',
                label: fileName,
                path: file.path,
                fileCount: 1,
                lineCount: file.lines,
                exportsCount: file.exports.length,
                complexity: 0, // computed in quality analyzer
            };
            if (!dirNode.children)
                dirNode.children = [];
            dirNode.children.push(fileNode);
        }
        fileNodeMap.set(file.path, fileNode);
        // Map parent directory as module
        if (dirParts.length > 0) {
            const moduleId = 'dir:' + dirParts.join('/');
            moduleNodeMap.set(moduleId, dirNode);
        }
    }
    // Aggregate stats up the tree
    aggregateStats(rootNode);
    // Step 2: Build edges from import/call/inheritance data
    let edgeCounter = 0;
    // Build a map of export names to files (for resolving relative imports)
    const exportMap = new Map(); // name -> file paths that export it
    for (const file of parseResult.files) {
        for (const exp of file.exports) {
            const paths = exportMap.get(exp.name) || [];
            paths.push(file.path);
            exportMap.set(exp.name, paths);
        }
    }
    for (const file of parseResult.files) {
        const sourceNodeId = 'file:' + file.path;
        // Import edges (pipeline)
        for (const imp of file.imports) {
            const resolvedTarget = resolveImport(file.path, imp.modulePath, parseResult.files);
            if (resolvedTarget) {
                const targetNodeId = 'file:' + resolvedTarget;
                edges.push({
                    id: `edge-${edgeCounter++}`,
                    source: sourceNodeId,
                    target: targetNodeId,
                    type: 'pipeline',
                    weight: imp.names.length || 1,
                    files: [file.path, resolvedTarget],
                    label: imp.names.join(', '),
                });
            }
        }
        // Inheritance edges (hierarchy)
        for (const cls of file.classes) {
            if (cls.baseClass) {
                // Try to find the base class in exports
                const baseClassPaths = exportMap.get(cls.baseClass);
                if (baseClassPaths) {
                    for (const basePath of baseClassPaths) {
                        edges.push({
                            id: `edge-${edgeCounter++}`,
                            source: 'file:' + basePath,
                            target: sourceNodeId,
                            type: 'hierarchy',
                            weight: 1,
                            files: [basePath, file.path],
                            label: `${cls.baseClass} → ${cls.name}`,
                        });
                    }
                }
            }
        }
        // Function call edges (flow)
        const calledNames = new Set(file.calls.map(c => c.name));
        for (const callName of calledNames) {
            // Skip common built-ins
            if (isBuiltinCall(callName))
                continue;
            // Try to find which file exports this function
            const exporterPaths = exportMap.get(callName);
            if (exporterPaths) {
                for (const expPath of exporterPaths) {
                    if (expPath !== file.path) {
                        edges.push({
                            id: `edge-${edgeCounter++}`,
                            source: sourceNodeId,
                            target: 'file:' + expPath,
                            type: 'flow',
                            weight: file.calls.filter(c => c.name === callName).length,
                            files: [file.path, expPath],
                            label: callName,
                        });
                    }
                }
            }
        }
    }
    // Step 3: Consolidate edges: merge edges with same source/target
    const consolidatedEdges = consolidateEdges(edges);
    // Step 4: Detect circular dependencies
    const nodeIds = new Set(parseResult.files.map(f => 'file:' + f.path));
    detectCircularDeps(consolidatedEdges, nodeIds);
    // Step 5: Compute metrics
    const circularDepCount = consolidatedEdges.filter(e => e.type === 'circular').length;
    const orphanCount = countOrphans(rootNode, consolidatedEdges);
    const metrics = {
        nodeCount: parseResult.files.length,
        edgeCount: consolidatedEdges.length,
        circularDepCount,
        maxDepth: getMaxDepth(rootNode),
        orphanCount,
        totalLines: rootNode.lineCount,
        totalFiles: rootNode.fileCount,
    };
    return {
        schemaVersion: 1,
        commitId,
        timestamp,
        projectName,
        rootNode,
        edges: consolidatedEdges,
        metrics,
    };
}
// ==================== Helpers ====================
function resolveImport(sourcePath, importPath, files) {
    // Skip node_modules / external imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null;
    }
    const sourceDir = path.dirname(sourcePath);
    // Try resolving as: importPath + extension, importPath/index.ext
    const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
    for (const ext of extensions) {
        const candidate = (importPath + ext).replace(/\\/g, '/');
        // Resolve relative to source
        let resolved;
        if (candidate.startsWith('.')) {
            resolved = path.join(sourceDir, candidate).replace(/\\/g, '/');
        }
        else {
            resolved = candidate.replace(/\\/g, '/');
        }
        // Normalize: remove leading ./
        resolved = path.normalize(resolved).replace(/\\/g, '/');
        // Check if any file matches
        const match = files.find(f => {
            const fNorm = f.path.replace(/\\/g, '/');
            return fNorm === resolved || fNorm === resolved.replace(/\/index$/, '');
        });
        if (match)
            return match.path;
    }
    return null;
}
function isBuiltinCall(name) {
    const builtins = new Set([
        'log', 'warn', 'error', 'info', 'debug', 'assert', 'dir',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'require', 'import', 'module', 'exports', 'define',
        'push', 'pop', 'shift', 'unshift', 'splice', 'slice',
        'map', 'filter', 'reduce', 'forEach', 'find', 'sort',
        'join', 'split', 'concat', 'includes', 'indexOf',
        'toString', 'valueOf', 'hasOwnProperty', 'bind', 'call', 'apply',
        'keys', 'values', 'entries', 'assign', 'freeze', 'seal',
        'then', 'catch', 'finally', 'resolve', 'reject',
        'getElementById', 'querySelector', 'addEventListener',
        'getState', 'setState', 'dispatch', 'useState', 'useEffect',
        'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef',
    ]);
    return builtins.has(name);
}
function consolidateEdges(edges) {
    const map = new Map();
    for (const edge of edges) {
        const key = `${edge.source}->${edge.target}:${edge.type}`;
        const existing = map.get(key);
        if (existing) {
            existing.weight += edge.weight;
            // Merge files
            for (const f of edge.files) {
                if (!existing.files.includes(f))
                    existing.files.push(f);
            }
            // Merge labels
            if (edge.label && existing.label && !existing.label.includes(edge.label)) {
                existing.label += ', ' + edge.label;
            }
        }
        else {
            map.set(key, { ...edge });
        }
    }
    return Array.from(map.values());
}
function countOrphans(root, edges) {
    // Orphans are files with no connections (no imports, no exports used)
    const connectedFiles = new Set();
    for (const edge of edges) {
        connectedFiles.add(edge.source);
        connectedFiles.add(edge.target);
    }
    let orphans = 0;
    function walk(node) {
        if (node.type === 'room' && !connectedFiles.has(node.id)) {
            orphans++;
        }
        if (node.children) {
            for (const child of node.children)
                walk(child);
        }
    }
    walk(root);
    return orphans;
}
function getMaxDepth(node) {
    if (!node.children || node.children.length === 0)
        return 1;
    let maxChild = 0;
    for (const child of node.children) {
        const d = getMaxDepth(child);
        if (d > maxChild)
            maxChild = d;
    }
    return 1 + maxChild;
}
