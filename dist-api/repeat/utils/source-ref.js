"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSourceRef = parseSourceRef;
exports.applySuffixToSourceRef = applySuffixToSourceRef;
exports.extractNodeIdFromSourceRef = extractNodeIdFromSourceRef;
function parseSourceRef(sourceRef) {
    if (!sourceRef || typeof sourceRef !== 'string')
        return null;
    var cleaned = sourceRef.trim();
    if (!cleaned)
        return null;
    if (cleaned.startsWith('node-formula:')) {
        return { type: 'formula', id: cleaned.replace('node-formula:', ''), prefix: 'node-formula:' };
    }
    if (cleaned.startsWith('formula:')) {
        return { type: 'formula', id: cleaned.replace('formula:', ''), prefix: 'formula:' };
    }
    if (cleaned.startsWith('condition:')) {
        return { type: 'condition', id: cleaned.replace('condition:', ''), prefix: 'condition:' };
    }
    if (cleaned.startsWith('node-condition:')) {
        return { type: 'condition', id: cleaned.replace('node-condition:', ''), prefix: 'node-condition:' };
    }
    if (cleaned.startsWith('@table.')) {
        return { type: 'table', id: cleaned.replace('@table.', ''), prefix: '@table.' };
    }
    if (cleaned.startsWith('@table:')) {
        return { type: 'table', id: cleaned.replace('@table:', ''), prefix: '@table:' };
    }
    if (cleaned.startsWith('table:')) {
        return { type: 'table', id: cleaned.replace('table:', ''), prefix: 'table:' };
    }
    if (cleaned.startsWith('table.')) {
        return { type: 'table', id: cleaned.replace('table.', ''), prefix: 'table.' };
    }
    if (cleaned.startsWith('node-table:')) {
        return { type: 'table', id: cleaned.replace('node-table:', ''), prefix: 'node-table:' };
    }
    return { type: 'field', id: cleaned, prefix: '' };
}
function applySuffixToSourceRef(sourceRef, suffix) {
    if (!sourceRef)
        return null;
    var parsed = parseSourceRef(sourceRef);
    if (!parsed)
        return sourceRef;
    var suffixStr = "".concat(suffix);
    var newId = "".concat(parsed.id, "-").concat(suffixStr);
    return "".concat(parsed.prefix).concat(newId);
}
function extractNodeIdFromSourceRef(sourceRef) {
    var parsed = parseSourceRef(sourceRef);
    return parsed ? parsed.id : null;
}
