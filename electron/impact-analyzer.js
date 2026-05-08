"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImpact = analyzeImpact;
function findEdgesForFile(edges, filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    return edges.filter(e => e.files.some(f => f.replace(/\\/g, '/') === normalized));
}
function collectNodeFiles(graph, nodeId) {
    const files = [];
    function walk(node) {
        if (node.type === 'room' && node.path && !node.children) {
            files.push(node.path.replace(/\\/g, '/'));
        }
        if (node.children) {
            for (const child of node.children)
                walk(child);
        }
    }
    if (graph.rootNode.id === nodeId)
        return [];
    // Find the node
    function find(node) {
        if (node.id === nodeId)
            return node;
        if (node.children) {
            for (const child of node.children) {
                const found = find(child);
                if (found)
                    return found;
            }
        }
        return null;
    }
    const target = find(graph.rootNode);
    if (target)
        walk(target);
    return files;
}
function getAllFileNodes(graph) {
    const map = new Map(); // filePath → nodeId
    function walk(node) {
        if (node.type === 'room' && node.path && !node.children) {
            map.set(node.path.replace(/\\/g, '/'), node.id);
        }
        if (node.children) {
            for (const child of node.children)
                walk(child);
        }
    }
    walk(graph.rootNode);
    return map;
}
function analyzeImpact(graph, changedFiles) {
    const fileNodeMap = getAllFileNodes(graph);
    const nodeFilesMap = new Map(); // nodeId → files it contains
    for (const [fp, nodeId] of fileNodeMap) {
        if (!nodeFilesMap.has(nodeId))
            nodeFilesMap.set(nodeId, []);
        nodeFilesMap.get(nodeId).push(fp);
    }
    // Build reverse dependency map: file → who depends on it
    const reverseDeps = new Map();
    for (const edge of graph.edges) {
        for (const targetFile of edge.files) {
            const normalized = targetFile.replace(/\\/g, '/');
            if (!reverseDeps.has(normalized))
                reverseDeps.set(normalized, new Set());
            // All files on the source side depend on the target
            const sourceNodeFiles = nodeFilesMap.get(edge.source) || collectNodeFiles(graph, edge.source);
            for (const sf of sourceNodeFiles) {
                reverseDeps.get(normalized).add(sf);
            }
        }
    }
    const impacts = [];
    const allAffected = new Set();
    for (const change of changedFiles) {
        const normalizedChange = change.path.replace(/\\/g, '/');
        const edges = findEdgesForFile(graph.edges, normalizedChange);
        const directSet = new Set();
        const edgeLabels = [];
        for (const edge of edges) {
            edgeLabels.push(`${edge.source} → ${edge.target} (${edge.type})`);
            const deps = reverseDeps.get(normalizedChange);
            if (deps) {
                for (const dep of deps) {
                    if (dep !== normalizedChange)
                        directSet.add(dep);
                }
            }
        }
        // Find indirect dependents (2-hop)
        const indirectSet = new Set();
        for (const direct of directSet) {
            const deps = reverseDeps.get(direct);
            if (deps) {
                for (const dep of deps) {
                    if (dep !== normalizedChange && !directSet.has(dep)) {
                        indirectSet.add(dep);
                    }
                }
            }
        }
        const direct = Array.from(directSet);
        const indirect = Array.from(indirectSet);
        let riskLevel = 'low';
        if (direct.length > 5 || indirect.length > 10)
            riskLevel = 'high';
        else if (direct.length > 2 || indirect.length > 3)
            riskLevel = 'medium';
        direct.forEach(f => allAffected.add(f));
        indirect.forEach(f => allAffected.add(f));
        impacts.push({
            filePath: normalizedChange,
            status: change.status,
            directDependents: direct,
            indirectDependents: indirect,
            affectedEdges: edgeLabels,
            riskLevel,
        });
    }
    // Sort: high risk first
    impacts.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
    });
    const highRiskCount = impacts.filter(i => i.riskLevel === 'high').length;
    let summary = '';
    if (impacts.length === 0) {
        summary = '未检测到依赖影响';
    }
    else if (highRiskCount > 0) {
        summary = `${highRiskCount} 个文件变更存在高风险影响，共影响 ${allAffected.size} 个下游文件`;
    }
    else {
        summary = `${impacts.length} 个文件变更，共影响 ${allAffected.size} 个下游文件，风险可控`;
    }
    return {
        version: graph.commitId,
        timestamp: new Date().toISOString(),
        changedFiles: changedFiles.length,
        totalAffectedFiles: allAffected.size,
        highRiskCount,
        impacts,
        summary,
    };
}
