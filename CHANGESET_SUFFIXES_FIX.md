# 📋 CHANGESET - Suffixes table_instances Fix

**Date**: 3 novembre 2025
**Status**: ✅ COMPLÉTÉ
**Priority**: 🔴 HAUTE
**Impact**: Affects all node duplications with table_instances

---

## Files Modified

### 1. src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts

**Location**: Lines 2061-2082
**Change Type**: Bug Fix
**Reason**: Using `includes('-')` on UUIDs causes false positives

```diff
- const newKey = key.includes('-') ? key : `${key}-${__copySuffixNum}`;
+ const hasSuffixRegex = /-\d+$/;
+ const newKey = hasSuffixRegex.test(key) ? key : `${key}-${__copySuffixNum}`;

- updatedObj.tableId = oldTableId.includes('-') 
-   ? oldTableId 
-   : `${oldTableId}-${__copySuffixNum}`;
+ const hasSuffixRegex = /-\d+$/;
+ updatedObj.tableId = hasSuffixRegex.test(oldTableId)
+   ? oldTableId 
+   : `${oldTableId}-${__copySuffixNum}`;
```

**Before**:
```javascript
{
  "9bc0622c-b2df-42a2-902c-6d0c6ecac10b": {
    "tableId": "9bc0622c-b2df-42a2-902c-6d0c6ecac10b"
  }
}
```

**After**:
```javascript
{
  "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1": {
    "tableId": "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"
  }
}
```

---

### 2. src/components/TreeBranchLeaf/treebranchleaf-new/api/update-selectors-after-copy.ts

**Location**: Lines 78-81
**Change Type**: Bug Fix
**Reason**: Same UUID detection issue

```diff
- const copiedTableId = tableId.includes('-') ? tableId : `${tableId}-${suffix}`;
+ const hasSuffixRegex = /-\d+$/;
+ const copiedTableId = hasSuffixRegex.test(tableId) ? tableId : `${tableId}-${suffix}`;
```

---

### 3. src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities.ts

**Location**: Lines 639-649
**Change Type**: Bug Fix
**Reason**: Same UUID detection issue in variable copying

```diff
- const newKey = key.includes('-') ? key : `${key}-${suffix}`;
+ const hasSuffixRegex = /-\d+$/;
+ const newKey = hasSuffixRegex.test(key) ? key : `${key}-${suffix}`;

- updatedObj.tableId = tableInstanceObj.tableId.includes('-') 
-   ? tableInstanceObj.tableId 
-   : `${tableInstanceObj.tableId}-${suffix}`;
+ updatedObj.tableId = hasSuffixRegex.test(tableInstanceObj.tableId)
+   ? tableInstanceObj.tableId 
+   : `${tableInstanceObj.tableId}-${suffix}`;
```

---

## Root Cause

**Pattern**: `key.includes('-')` returns TRUE for UUIDs (which contain dashes)
**Impact**: Suffix detection always fails because UUIDs already have dashes
**Solution**: Use regex `/-\d+$/` to detect only numeric suffixes at the end

---

## Testing

### Manual Test
1. Start the API: `npm run dev`
2. Duplicate a node with table_instances via repeat button
3. Check the table_instances in the database
4. Verify both key and tableId have `-N` suffix

### Automated Test
```bash
node test-final-suffixes.cjs
```

Expected output:
```
✅ Clé: ✅ "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"
   ✅ ├─ tableId: "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"
```

---

## Deployment

- ✅ No database migration needed
- ✅ Backward compatible
- ✅ Ready for immediate deployment
- ✅ Can be deployed to production immediately

---

## Verification Commands

```bash
# Check if API compiles
npx tsc --noEmit

# Run tests
node test-final-suffixes.cjs

# Check specific file
grep -n "/-\d+$/" src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts
```

---

**Signed Off**: ✅ Ready for Merge
