/**
 * CODE INSPECTION SCRIPT: Find where -2 is being created
 *
 * This script will:
 * 1. Search for all places where node labels are created with suffixes
 * 2. Check for multiple copy creation logic paths
 * 3. Identify potential double-creation scenarios
 */
import * as fs from 'fs';
import * as path from 'path';
class CodeInspector {
    constructor() {
        this.findings = [];
        this.baseDir = './src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat';
    }
    /**
     * Search for suffix/label generation patterns
     */
    searchForSuffixGeneration() {
        console.log('\n🔍 Searching for suffix generation patterns...\n');
        const patterns = [
            { regex: /labelSuffix|suffixNum|suffix.*-.*\d+/, desc: 'Suffix variable usage' },
            { regex: /label.*-.*\d+|label\s*\+.*-/, desc: 'Label concatenation with dash' },
            { regex: /new.*Copy|createCopy|duplicat|replicate/, desc: 'Copy/duplication operations' },
            { regex: /foreach.*copy|for.*copy|while.*copy/, desc: 'Loop over copies' },
            { regex: /Math\.max.*suffix|nextSuffix|lastSuffix/, desc: 'Suffix calculation' }
        ];
        this.searchInFiles(patterns);
    }
    searchInFiles(patterns) {
        const files = this.getAllTypeScriptFiles(this.baseDir);
        files.forEach(file => {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                patterns.forEach(pattern => {
                    if (pattern.regex.test(line) && !line.trim().startsWith('//')) {
                        this.findings.push({
                            file: path.relative(process.cwd(), file),
                            line: idx + 1,
                            code: line.trim(),
                            description: pattern.desc
                        });
                    }
                });
            });
        });
        console.log(`📊 Found ${this.findings.length} potential locations\n`);
        this.findings.forEach((finding, idx) => {
            console.log(`${idx + 1}. ${finding.description}`);
            console.log(`   📁 ${finding.file}:${finding.line}`);
            console.log(`   📝 ${finding.code}\n`);
        });
    }
    /**
     * Check for multiple copy invocations in single request
     */
    checkForMultipleCopyInvocations() {
        console.log('\n\n🔄 Checking for multiple copy invocations in one request...\n');
        const repeatServicePath = path.join(this.baseDir, 'repeat-service.ts');
        const content = fs.readFileSync(repeatServicePath, 'utf-8');
        // Look for functions that might call copy multiple times
        const functionPattern = /async\s+function\s+(\w+)|async\s+\(\s*\)\s*=>/g;
        const copyCallPattern = /deepCopyNodeInternal|copyVariableWithCapacities/g;
        let match;
        let currentFunction = 'global';
        let copyCallCount = 0;
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes('async function') || line.includes('async () =>')) {
                currentFunction = line.match(/\w+(?=\s*\()/)?.[0] || 'anonymous';
                copyCallCount = 0;
                console.log(`📍 Function: ${currentFunction} (line ${idx + 1})`);
            }
            if (line.includes('deepCopyNodeInternal') || line.includes('copyVariableWithCapacities')) {
                copyCallCount++;
                console.log(`   🔁 Copy call #${copyCallCount}: ${line.trim()}`);
                if (copyCallCount > 1) {
                    console.log(`   ⚠️  MULTIPLE CALLS DETECTED IN ${currentFunction}!`);
                }
            }
        });
    }
    /**
     * Analyze the deepCopyNodeInternal function for loops or multiple invocations
     */
    analyzeDeepCopyFunction() {
        console.log('\n\n🔧 Analyzing deepCopyNodeInternal function...\n');
        const servicePath = path.join(this.baseDir, 'services/deep-copy-service.ts');
        const content = fs.readFileSync(servicePath, 'utf-8');
        // Find the main function
        const functionStart = content.indexOf('export async function deepCopyNodeInternal');
        if (functionStart === -1) {
            console.log('❌ Function not found');
            return;
        }
        const functionContent = content.substring(functionStart);
        const lines = functionContent.split('\n').slice(0, 200); // First 200 lines
        let braceCount = 0;
        let insideFunction = false;
        let foundLoops = 0;
        let foundConditions = 0;
        lines.forEach((line, idx) => {
            if (!insideFunction) {
                if (line.includes('{'))
                    insideFunction = true;
                return;
            }
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            if (line.includes('for (') || line.includes('while (') || line.includes('forEach')) {
                foundLoops++;
                console.log(`   🔁 Loop found at line ${idx}: ${line.trim()}`);
            }
            if (line.includes('if (') || line.includes('else if')) {
                foundConditions++;
            }
            if (line.includes('await deepCopyNodeInternal') || line.includes('await copyVariableWithCapacities')) {
                console.log(`   📞 Call: ${line.trim()}`);
            }
        });
        console.log(`\n   📊 Stats: ${foundLoops} loops, ${foundConditions} conditions`);
    }
    /**
     * Check for recursive calls or re-entry points
     */
    checkForRecursivePatterns() {
        console.log('\n\n🔄 Checking for recursive patterns...\n');
        const servicePath = path.join(this.baseDir, 'services/deep-copy-service.ts');
        const content = fs.readFileSync(servicePath, 'utf-8');
        const lines = content.split('\n');
        const copyFunctionCalls = [];
        lines.forEach((line, idx) => {
            if (line.includes('deepCopyNodeInternal') && !line.includes('export') && !line.includes('function')) {
                copyFunctionCalls.push({ line: idx + 1, code: line.trim() });
            }
        });
        console.log(`📋 Found ${copyFunctionCalls.length} calls to deepCopyNodeInternal\n`);
        copyFunctionCalls.forEach((call, idx) => {
            console.log(`${idx + 1}. Line ${call.line}: ${call.code}`);
        });
        // Check if any call is inside a loop or conditional that executes multiple times
        if (copyFunctionCalls.length > 1) {
            console.log(`\n⚠️  WARNING: Multiple calls detected!`);
            console.log(`   This could cause duplicate copies if called in a loop or multiple times per request`);
        }
    }
    /**
     * Check the repeat-executor for duplicate execution
     */
    analyzeRepeatExecutor() {
        console.log('\n\n⚙️  Analyzing repeat-executor...\n');
        const executorPath = path.join(this.baseDir, 'repeat-executor.ts');
        if (!fs.existsSync(executorPath)) {
            console.log('❌ File not found:', executorPath);
            return;
        }
        const content = fs.readFileSync(executorPath, 'utf-8');
        const lines = content.split('\n');
        let operationCount = 0;
        let executeCallCount = 0;
        lines.forEach((line, idx) => {
            if (line.includes('operation') && line.includes('forEach')) {
                console.log(`   🔁 Operation loop at line ${idx + 1}: ${line.trim()}`);
                operationCount++;
            }
            if (line.includes('executeRepeatDuplication') || line.includes('deepCopyNodeInternal')) {
                console.log(`   📞 Call at line ${idx + 1}: ${line.trim()}`);
                executeCallCount++;
            }
        });
        console.log(`\n   📊 Stats: ${operationCount} operation loops, ${executeCallCount} copy calls`);
    }
    getAllTypeScriptFiles(dir) {
        const files = [];
        const walk = (currentPath) => {
            if (!fs.existsSync(currentPath))
                return;
            const entries = fs.readdirSync(currentPath);
            entries.forEach(entry => {
                const fullPath = path.join(currentPath, entry);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory() && !entry.includes('node_modules')) {
                    walk(fullPath);
                }
                else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
                    files.push(fullPath);
                }
            });
        };
        walk(dir);
        return files;
    }
    generateReport() {
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                  CODE INSPECTION REPORT                    ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log(`\n📝 Total findings: ${this.findings.length}`);
        console.log(`📁 Searched directory: ${this.baseDir}`);
    }
    runAll() {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║         SEARCHING FOR RAMPANT DUPLICATION BUG              ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        this.searchForSuffixGeneration();
        this.checkForMultipleCopyInvocations();
        this.analyzeDeepCopyFunction();
        this.checkForRecursivePatterns();
        this.analyzeRepeatExecutor();
        this.generateReport();
    }
}
// Run the inspector
const inspector = new CodeInspector();
inspector.runAll();
