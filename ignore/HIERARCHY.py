import os
from pathlib import Path
import re

CRITICAL_PATHS = {
    'src', 'app', 'lib', 'components', 'pages', 'api', 'utils', 
    'hooks', 'stores', 'services', 'models', 'controllers', 
    'routes', 'middleware', 'types', 'interfaces', 'schemas',
    'public', 'static', 'assets', 'views', 'templates'
}

CRITICAL_FILES = {
    'package.json', 'requirements.txt', 'pyproject.toml', 'setup.py',
    'Pipfile', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle',
    'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile',
    '.env.example', 'index.html', 'main.py', 'main.js', 'main.ts',
    'app.py', 'app.js', 'app.ts', 'server.py', 'server.js', 'server.ts',
    'index.js', 'index.ts', 'index.jsx', 'index.tsx'
}

EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', 'build', 'out', 'target',
    '__pycache__', '.next', '.nuxt', '.cache', '.parcel-cache',
    'coverage', '.pytest_cache', '.mypy_cache', 'venv', 'env',
    '.tox', 'eggs', '.eggs', 'htmlcov', '.venv', 'tmp', 'temp'
}

EXCLUDE_FILES = {
    '.env', '.env.local', '.env.production', '.env.development',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'poetry.lock', 'Pipfile.lock', '.DS_Store', 'Thumbs.db'
}

EXCLUDE_EXTENSIONS = {
    '.pyc', '.pyo', '.pyd', '.so', '.dylib', '.dll', '.exe',
    '.class', '.log', '.tmp', '.temp', '.swp', '.swo', '.swn',
    '.bak', '.old', '.orig', '.cache'
}

CONFIG_PATTERNS = [
    r'tsconfig.*\.json$', r'jsconfig\.json$', r'webpack\.config\.',
    r'vite\.config\.', r'rollup\.config\.', r'babel\.config\.',
    r'postcss\.config\.', r'tailwind\.config\.', r'next\.config\.',
    r'nuxt\.config\.', r'vue\.config\.', r'angular\.json$',
    r'\.eslintrc', r'\.prettierrc', r'\.babelrc'
]

DOC_PATTERNS = [
    r'README', r'CHANGELOG', r'CONTRIBUTING', r'LICENSE',
    r'TODO', r'NOTES', r'docs/', r'documentation/'
]

def is_excluded(path):
    if path.is_file():
        if path.name in EXCLUDE_FILES:
            return True
        if path.suffix in EXCLUDE_EXTENSIONS:
            return True
    else:
        if path.name in EXCLUDE_DIRS:
            return True
    return False

def calculate_importance(path, root_path):
    rel_path = path.relative_to(root_path)
    path_parts = rel_path.parts
    
    if path.is_dir() and path.name in CRITICAL_PATHS:
        return 10
    
    if path.is_file() and path.name in CRITICAL_FILES:
        return 10
    
    if any(part in CRITICAL_PATHS for part in path_parts):
        return 9
    
    if path.is_file():
        str_path = str(rel_path).replace('\\', '/')
        
        if path.suffix in {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.rb', '.php', '.cs'}:
            return 8
        
        for pattern in CONFIG_PATTERNS:
            if re.search(pattern, str_path):
                return 7
        
        for pattern in DOC_PATTERNS:
            if re.search(pattern, str_path, re.IGNORECASE):
                return 5
        
        if path.suffix in {'.css', '.scss', '.sass', '.less'}:
            return 6
        
        if path.suffix in {'.html', '.vue', '.svelte'}:
            return 7
        
        if path.suffix in {'.json', '.yml', '.yaml', '.xml', '.toml', '.ini', '.cfg'}:
            return 5
    
    if path.is_dir():
        dir_name_lower = path.name.lower()
        if any(keyword in dir_name_lower for keyword in ['test', 'spec', '__test__']):
            return 4
        if any(keyword in dir_name_lower for keyword in ['style', 'css', 'sass', 'scss']):
            return 5
        if any(keyword in dir_name_lower for keyword in ['asset', 'image', 'img', 'font', 'icon']):
            return 3
        if any(keyword in dir_name_lower for keyword in ['config', 'conf', 'settings']):
            return 6
    
    return 2

def scan_directory(root_path, max_depth=8):
    root_path = Path(root_path).resolve()
    tree = {}
    
    def walk_dir(current_path, current_tree, depth=0):
        if depth > max_depth:
            return
        
        try:
            entries = list(current_path.iterdir())
            dirs = sorted([e for e in entries if e.is_dir()], key=lambda x: x.name.lower())
            files = sorted([e for e in entries if e.is_file()], key=lambda x: x.name.lower())
            
            for dir_path in dirs:
                if is_excluded(dir_path):
                    continue
                
                importance = calculate_importance(dir_path, root_path)
                if importance >= 3 or depth <= 2:
                    subtree = {}
                    current_tree[dir_path.name + '/'] = subtree
                    walk_dir(dir_path, subtree, depth + 1)
            
            for file_path in files:
                if is_excluded(file_path):
                    continue
                
                importance = calculate_importance(file_path, root_path)
                if importance >= 4 or (depth <= 2 and importance >= 2):
                    current_tree[file_path.name] = None
                    
        except (PermissionError, OSError):
            pass
    
    walk_dir(root_path, tree)
    return tree

def render_tree(tree, prefix=""):
    lines = []
    entries = list(tree.items())
    
    for i, (name, subtree) in enumerate(entries):
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "
        lines.append(prefix + connector + name)
        
        if subtree is not None:
            extension = "    " if is_last else "│   "
            lines.extend(render_tree(subtree, prefix + extension))
    
    return lines

def detect_project_info(root_path):
    info = {
        'language': 'unknown',
        'framework': None,
        'build_tool': None
    }
    
    files_in_root = [f.name for f in root_path.iterdir() if f.is_file()]
    
    if 'package.json' in files_in_root:
        info['language'] = 'javascript/typescript'
        info['build_tool'] = 'npm/yarn/pnpm'
        
        if 'vite.config.ts' in files_in_root or 'vite.config.js' in files_in_root:
            info['build_tool'] = 'vite'
        elif 'webpack.config.js' in files_in_root:
            info['build_tool'] = 'webpack'
        
        if (root_path / 'src' / 'App.tsx').exists() or (root_path / 'src' / 'App.jsx').exists():
            info['framework'] = 'react'
        elif 'vue.config.js' in files_in_root:
            info['framework'] = 'vue'
        elif 'angular.json' in files_in_root:
            info['framework'] = 'angular'
        elif 'next.config.js' in files_in_root:
            info['framework'] = 'nextjs'
    
    elif any(f in files_in_root for f in ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile']):
        info['language'] = 'python'
        if 'manage.py' in files_in_root:
            info['framework'] = 'django'
        elif 'app.py' in files_in_root or 'application.py' in files_in_root:
            info['framework'] = 'flask'
    
    elif 'go.mod' in files_in_root:
        info['language'] = 'go'
    elif 'Cargo.toml' in files_in_root:
        info['language'] = 'rust'
    elif 'pom.xml' in files_in_root:
        info['language'] = 'java'
        info['build_tool'] = 'maven'
    elif 'build.gradle' in files_in_root:
        info['language'] = 'java/kotlin'
        info['build_tool'] = 'gradle'
    
    return info

def main():
    root = Path.cwd()
    project_info = detect_project_info(root)
    
    print("Scanning project structure...")
    tree = scan_directory(root)
    
    output_lines = [
        f"Project: {root.name}",
        f"Language: {project_info['language']}"
    ]
    
    if project_info['framework']:
        output_lines.append(f"Framework: {project_info['framework']}")
    if project_info['build_tool']:
        output_lines.append(f"Build Tool: {project_info['build_tool']}")
    
    output_lines.append("-" * 60)
    output_lines.append("")
    
    if tree:
        output_lines.append(f"└── {root.name}/")
        output_lines.extend(render_tree(tree, "    "))
    else:
        output_lines.append("└── (empty or all files filtered)")
    
    output_text = "\n".join(output_lines)
    
    with open("project_hierarchy.txt", "w", encoding="utf-8") as f:
        f.write(output_text)
    
    entry_count = output_text.count("├──") + output_text.count("└──")
    print(f"✓ Generated project_hierarchy.txt")
    print(f"✓ Found {entry_count} relevant entries")
    
    critical_found = []
    for critical in ['src/', 'app/', 'components/', 'api/', 'lib/']:
        if critical in output_text:
            critical_found.append(critical.rstrip('/'))
    
    if critical_found:
        print(f"✓ Key directories: {', '.join(critical_found)}")
    else:
        print("⚠ No standard directories found - check if script is in project root")

if __name__ == "__main__":
    main()