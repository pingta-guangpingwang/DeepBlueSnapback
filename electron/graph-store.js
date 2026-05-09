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
exports.saveGraph = saveGraph;
exports.loadGraph = loadGraph;
exports.listGraphs = listGraphs;
exports.compareGraphs = compareGraphs;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
// ==================== Graph Store ====================
function getGraphsDir(rootPath) {
    return path.join(rootPath, 'graphs');
}
function getGraphPath(rootPath, commitId) {
    return path.join(getGraphsDir(rootPath), `${commitId}.json`);
}
async function saveGraph(rootPath, graph) {
    try {
        const dir = getGraphsDir(rootPath);
        await fs.ensureDir(dir);
        const filePath = getGraphPath(rootPath, graph.commitId);
        await fs.writeJson(filePath, graph, { spaces: 2 });
        return { success: true };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
async function loadGraph(rootPath, commitId) {
    try {
        const filePath = getGraphPath(rootPath, commitId);
        if (!(await fs.pathExists(filePath)))
            return null;
        return await fs.readJson(filePath);
    }
    catch {
        return null;
    }
}
async function listGraphs(rootPath) {
    try {
        const dir = getGraphsDir(rootPath);
        if (!(await fs.pathExists(dir)))
            return [];
        const files = await fs.readdir(dir);
        return files
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''))
            .sort()
            .reverse();
    }
    catch {
        return [];
    }
}
// ==================== Graph Comparison ====================
function compareGraphs(graphA, graphB) {
    if (!graphA && !graphB) {
        return {
            addedNodes: [], removedNodes: [], modifiedNodes: [],
            addedEdges: [], brokenEdges: [],
            summary: { nodesAdded: 0, nodesRemoved: 0, nodesModified: 0, edgesAdded: 0, edgesBroken: 0 },
        };
    }
    if (!graphA) {
        // All nodes in B are added
        const allNodes = collectAllNodes(graphB.rootNode);
        return {
            addedNodes: allNodes,
            removedNodes: [],
            modifiedNodes: [],
            addedEdges: graphB.edges,
            brokenEdges: [],
            summary: {
                nodesAdded: allNodes.length,
                nodesRemoved: 0,
                nodesModified: 0,
                edgesAdded: graphB.edges.length,
                edgesBroken: 0,
            },
        };
    }
    if (!graphB) {
        // All nodes in A are removed
        const allNodes = collectAllNodes(graphA.rootNode);
        return {
            addedNodes: [],
            removedNodes: allNodes,
            modifiedNodes: [],
            addedEdges: [],
            brokenEdges: graphA.edges,
            summary: {
                nodesAdded: 0,
                nodesRemoved: allNodes.length,
                nodesModified: 0,
                edgesAdded: 0,
                edgesBroken: graphA.edges.length,
            },
        };
    }
    // Build node maps
    const nodesAMap = new Map();
    const nodesBMap = new Map();
    for (const n of collectAllNodes(graphA.rootNode))
        nodesAMap.set(n.id, n);
    for (const n of collectAllNodes(graphB.rootNode))
        nodesBMap.set(n.id, n);
    const addedNodes = collectAllNodes(graphB.rootNode).filter(n => !nodesAMap.has(n.id));
    const removedNodes = collectAllNodes(graphA.rootNode).filter(n => !nodesBMap.has(n.id));
    // Modified nodes: same id, different stats
    const modifiedNodes = [];
    for (const [id, nodeA] of nodesAMap) {
        const nodeB = nodesBMap.get(id);
        if (nodeB) {
            if (nodeA.lineCount !== nodeB.lineCount ||
                nodeA.fileCount !== nodeB.fileCount ||
                nodeA.exportsCount !== nodeB.exportsCount) {
                modifiedNodes.push({ before: nodeA, after: nodeB });
            }
        }
    }
    // Edge comparison
    const edgeKey = (e) => `${e.source}->${e.target}:${e.type}`;
    const edgesAMap = new Map();
    const edgesBMap = new Map();
    for (const e of graphA.edges)
        edgesAMap.set(edgeKey(e), e);
    for (const e of graphB.edges)
        edgesBMap.set(edgeKey(e), e);
    const addedEdges = graphB.edges.filter(e => !edgesAMap.has(edgeKey(e)));
    const brokenEdges = graphA.edges.filter(e => !edgesBMap.has(edgeKey(e)));
    return {
        addedNodes,
        removedNodes,
        modifiedNodes,
        addedEdges,
        brokenEdges,
        summary: {
            nodesAdded: addedNodes.length,
            nodesRemoved: removedNodes.length,
            nodesModified: modifiedNodes.length,
            edgesAdded: addedEdges.length,
            edgesBroken: brokenEdges.length,
        },
    };
}
function collectAllNodes(root) {
    const nodes = [];
    function walk(node) {
        nodes.push({
            id: node.id,
            label: node.label,
            path: node.path || '',
            type: node.type,
            fileCount: node.fileCount || 0,
            lineCount: node.lineCount || 0,
            exportsCount: node.exportsCount || 0,
        });
        if (node.children) {
            for (const child of node.children)
                walk(child);
        }
    }
    walk(root);
    return nodes;
}
