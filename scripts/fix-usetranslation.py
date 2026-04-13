#!/usr/bin/env python3
"""Fix useTranslation() hooks that were incorrectly placed by batch script.

Handles these cases:
1. Hook inside destructured function params: function Foo({ const {t}=useTranslation(); param1, ... })
2. Hook inside useEffect/callbacks (not a valid hook call site)
3. Hook at module level (outside any function)
"""
import re
import glob
import sys

HOOK_LINE = 'const { t } = useTranslation();'
fixed_files = []
errors = []

def fix_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    original = lines[:]
    changed = False
    
    # Find all hook lines
    hook_indices = []
    for i, line in enumerate(lines):
        if line.strip() == HOOK_LINE:
            hook_indices.append(i)
    
    if not hook_indices:
        return False
    
    for hook_idx in reversed(hook_indices):  # Process from bottom to avoid index shifts
        context = determine_context(lines, hook_idx)
        
        if context == 'correct':
            continue  # Already in a valid position (top of component function body)
        
        elif context == 'in_params':
            # Remove from params, insert after function body opens
            lines.pop(hook_idx)
            body_start = find_function_body_start(lines, hook_idx)
            if body_start is not None:
                indent = get_indent(lines, body_start)
                lines.insert(body_start, f'{indent}const {{ t }} = useTranslation();\n')
                changed = True
            else:
                errors.append(f'{filepath}:{hook_idx+1} - could not find function body start')
                # Restore
                lines = original[:]
                return False
        
        elif context == 'in_effect':
            # Remove from useEffect callback, add at top of component function
            lines.pop(hook_idx)
            comp_body = find_enclosing_component_body(lines, hook_idx)
            if comp_body is not None:
                # Check if there's already a useTranslation in the component
                has_hook = False
                for j in range(comp_body, min(comp_body + 30, len(lines))):
                    if HOOK_LINE in lines[j]:
                        has_hook = True
                        break
                if not has_hook:
                    indent = get_indent(lines, comp_body)
                    lines.insert(comp_body, f'{indent}const {{ t }} = useTranslation();\n')
                changed = True
            else:
                errors.append(f'{filepath}:{hook_idx+1} - could not find enclosing component')
                lines = original[:]
                return False
        
        elif context == 'module_level':
            # Remove completely (or move into first component if t() is used)
            lines.pop(hook_idx)
            
            # Check if t() is used in the file
            content_check = ''.join(lines)
            t_used = re.search(r'(?<![.\w])t\s*\(', content_check)
            
            if t_used:
                # Find first component function body
                comp_body = find_first_component_body(lines)
                if comp_body is not None:
                    indent = get_indent(lines, comp_body)
                    lines.insert(comp_body, f'{indent}const {{ t }} = useTranslation();\n')
                    changed = True
                else:
                    errors.append(f'{filepath}:{hook_idx+1} - t() used but no component found')
                    lines = original[:]
                    return False
            else:
                changed = True  # Just removed unused hook
    
    if changed:
        with open(filepath, 'w') as f:
            f.writelines(lines)
        return True
    return False


def determine_context(lines, hook_idx):
    """Determine where the hook line is: in_params, in_effect, module_level, or correct."""
    # Check if inside destructured params by looking for unmatched ( before us
    paren_depth = 0
    brace_depth = 0
    
    for i in range(hook_idx - 1, max(hook_idx - 50, -1), -1):
        line = lines[i]
        for ch in reversed(line):
            if ch == ')':
                paren_depth += 1
            elif ch == '(':
                paren_depth -= 1
            elif ch == '}':
                brace_depth += 1
            elif ch == '{':
                brace_depth -= 1
        
        if paren_depth < 0:
            # We're inside an unmatched ( — check if it's params
            if re.search(r'(function\s+\w+\s*\(|=>\s*\(|\w+\s*\()', line):
                # Check if this is a useEffect/useCallback call
                if re.search(r'useEffect|useCallback|useMemo|useLayoutEffect', line):
                    return 'in_effect'
                # Check if it's a function parameter list
                if re.search(r'(function\s+\w+\s*\(|:\s*React\.FC.*=\s*\(|=\s*\(|=\s*memo\s*\()', line):
                    return 'in_params'
            return 'in_params'
        
        if brace_depth < 0:
            # We're inside an unmatched { — this means we're in a function body
            # Check if line before the { has useEffect
            for j in range(i, max(i - 5, -1), -1):
                if re.search(r'useEffect|useCallback|useMemo|useLayoutEffect', lines[j]):
                    return 'in_effect'
            # Otherwise, likely correct (inside component body)
            return 'correct'
    
    # If we got here with no unmatched braces/parens, we're at module level
    return 'module_level'


def find_function_body_start(lines, from_idx):
    """Find the line after ') => {' or '): Type {' starting from from_idx."""
    for i in range(from_idx, min(from_idx + 30, len(lines))):
        line = lines[i]
        # Match: }) => {  or  }): ReturnType {  or  }) {
        if re.search(r'\}\s*\)\s*(:\s*\S+)?\s*=>\s*\{', line) or \
           re.search(r'\}\s*\)\s*(:\s*\S+)?\s*\{', line) or \
           re.search(r'\)\s*(:\s*\S+)?\s*=>\s*\{', line) or \
           re.search(r'\)\s*(:\s*\S+)?\s*\{', line):
            return i + 1
    return None


def find_enclosing_component_body(lines, from_idx):
    """Find the start of the enclosing React component function body."""
    brace_depth = 0
    for i in range(from_idx - 1, -1, -1):
        for ch in lines[i]:
            if ch == '{':
                brace_depth -= 1
            elif ch == '}':
                brace_depth += 1
        
        if brace_depth < 0:
            # This opening brace might be the component body
            # Check if the function above is a component
            for j in range(i, max(i - 5, -1), -1):
                if re.search(r'(export\s+)?(default\s+)?function\s+\w+|const\s+\w+.*=>\s*\{|React\.FC', lines[j]):
                    return i + 1
            # Keep going up
            brace_depth = 0
    return None


def find_first_component_body(lines):
    """Find the first React component function body in the file."""
    for i, line in enumerate(lines):
        if re.search(r'(export\s+)?(default\s+)?function\s+[A-Z]\w*', line) or \
           re.search(r'const\s+[A-Z]\w*.*React\.FC', line) or \
           re.search(r'const\s+[A-Z]\w*.*=\s*\(', line):
            # Find the opening brace
            for j in range(i, min(i + 10, len(lines))):
                if '{' in lines[j]:
                    return j + 1
    return None


def get_indent(lines, idx):
    """Get the indentation of the line at idx."""
    if idx < len(lines):
        m = re.match(r'^(\s+)', lines[idx])
        return m.group(1) if m else '  '
    return '  '


def main():
    all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
    
    for filepath in all_tsx:
        try:
            if fix_file(filepath):
                fixed_files.append(filepath)
        except Exception as e:
            errors.append(f'{filepath}: {e}')
    
    print(f'Fixed {len(fixed_files)} files:')
    for f in fixed_files:
        print(f'  {f}')
    
    if errors:
        print(f'\nErrors ({len(errors)}):')
        for e in errors:
            print(f'  {e}')
    
    return 0 if not errors else 1


if __name__ == '__main__':
    sys.exit(main())
