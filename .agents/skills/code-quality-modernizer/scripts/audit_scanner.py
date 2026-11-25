#!/usr/bin/env python3
"""
Zero-dependency static security, code smell, and blast-radius scanner
for code-quality-modernizer skill.
Uses only Python standard library (os, sys, re, json, pathlib).
"""

import os
import sys
import re
import json
from pathlib import Path

# Security patterns
SECURITY_PATTERNS = [
    (r'console\.(log|warn|error)\(.*?(password|token|secret|pan|aadhaar|ssn|authorization|bearer).*?\)', 
     'Potential Sensitive PII/Credential logged to console', 'CRITICAL'),
    (r'dangerouslySetInnerHTML\s*=', 
     'Use of dangerouslySetInnerHTML (XSS vulnerability risk)', 'HIGH'),
    (r'\beval\(', 
     'Use of eval() detected (Arbitrary code execution risk)', 'CRITICAL'),
    (r'(?i)(jwt_secret|api_key|private_key|secret_key)\s*[:=]\s*["\'][A-Za-z0-9_\-]{8,}["\']', 
     'Potential hardcoded secret or API key', 'CRITICAL'),
    (r'SELECT\s+.*?\s+FROM\s+.*?`\s*\$\{', 
     'Potential SQL string interpolation (SQL Injection risk)', 'CRITICAL'),
    (r'localStorage\.(setItem|getItem)\(.*?(token|auth|bearer).*?\)', 
     'Auth token stored in localStorage (Review for XSS exposure)', 'MEDIUM')
]

# React & Code Quality patterns
QUALITY_PATTERNS = [
    (r'catch\s*\((err|error)\)\s*\{\s*\}', 
     'Empty catch block (Swallowed error, silent failure)', 'HIGH'),
    (r':\s*any\b', 
     'Explicit any type used (Weakened type safety)', 'LOW'),
    (r'useEffect\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)', 
     'useEffect with missing dependency array (Runs on every render)', 'HIGH'),
    (r'\/\/\s*(TODO|FIXME|HACK|XXX)\b', 
     'Lingering technical debt marker (TODO/FIXME)', 'LOW')
]

IGNORE_DIRS = {
    'node_modules', '.git', 'dist', 'build', '.next', 'coverage', 
    '.gemini', '.system_generated', 'brain', 'scratch'
}

VALID_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json'}

def scan_file(filepath):
    findings = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        return findings

    file_str = "".join(lines)
    
    # Line by line checks
    for idx, line in enumerate(lines, start=1):
        # Security checks
        for regex, desc, severity in SECURITY_PATTERNS:
            if re.search(regex, line, re.IGNORECASE):
                findings.append({
                    'line': idx,
                    'type': 'Security',
                    'severity': severity,
                    'description': desc,
                    'snippet': line.strip()[:120]
                })

        # Quality checks
        for regex, desc, severity in QUALITY_PATTERNS:
            if re.search(regex, line):
                findings.append({
                    'line': idx,
                    'type': 'Quality',
                    'severity': severity,
                    'description': desc,
                    'snippet': line.strip()[:120]
                })

    # File-level checks
    if len(lines) > 500:
        findings.append({
            'line': 1,
            'type': 'Maintainability',
            'severity': 'MEDIUM',
            'description': f'Large file ({len(lines)} lines). Consider breaking down into modular sub-components/hooks.',
            'snippet': f'File length: {len(lines)} lines'
        })

    return findings

def calculate_blast_radius(target_file, project_root):
    """Counts how many files in the project import or require target_file."""
    target_path = Path(target_file)
    basename = target_path.stem
    if basename in ('index', '__init__'):
        basename = target_path.parent.name

    import_regex = re.compile(r'import\s+.*?from\s+[\'"].*?' + re.escape(basename) + r'[\'"]|require\([\'"].*?' + re.escape(basename) + r'[\'"]\)')
    
    referencing_files = []
    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in VALID_EXTENSIONS:
                full_p = os.path.join(root, file)
                if os.path.abspath(full_p) == os.path.abspath(target_file):
                    continue
                try:
                    with open(full_p, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if import_regex.search(content):
                            rel = os.path.relpath(full_p, project_root)
                            referencing_files.append(rel)
                except Exception:
                    pass

    return {
        'import_count': len(referencing_files),
        'risk_category': 'HIGH' if len(referencing_files) >= 8 else ('MEDIUM' if len(referencing_files) >= 3 else 'LOW'),
        'referencing_files': referencing_files[:10]
    }

def scan_target(target_path, project_root):
    results = {}
    if os.path.isfile(target_path):
        results['target'] = target_path
        results['blast_radius'] = calculate_blast_radius(target_path, project_root)
        results['findings'] = scan_file(target_path)
    elif os.path.isdir(target_path):
        all_findings = []
        for root, dirs, files in os.walk(target_path):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in VALID_EXTENSIONS:
                    fp = os.path.join(root, file)
                    file_findings = scan_file(fp)
                    if file_findings:
                        rel = os.path.relpath(fp, project_root)
                        all_findings.append({
                            'file': rel,
                            'findings': file_findings
                        })
        results['target'] = target_path
        results['scanned_files'] = all_findings

    return results

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python audit_scanner.py <target_file_or_dir> [project_root]")
        sys.exit(1)

    target = sys.argv[1]
    root = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    
    output = scan_target(target, root)
    print(json.dumps(output, indent=2))
