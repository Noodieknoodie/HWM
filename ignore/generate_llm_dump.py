import os
from pathlib import Path
from datetime import datetime
import fnmatch

# Default exclusion patterns (gitignore style)
DEFAULT_EXCLUDES = [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.git/',
    '__pycache__/',
    '*.pyc',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '*.tmp',
    '*.temp',
    '.cache/',
    '.next/',
    '.nuxt/',
    '.vscode/',
    '.idea/',
    '*.swp',
    '*.swo',
    '.env.local',
    '.env.*.local',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
]

BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.pdf', 
    '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib',
    '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.avi',
    '.mov', '.wmv', '.flv', '.webm', '.m4a', '.aac', '.ogg',
    '.wav', '.flac', '.bmp', '.tiff', '.psd', '.ai', '.sketch'
}

def load_gitignore_patterns():
    patterns = DEFAULT_EXCLUDES.copy()
    gitignore_path = Path('.gitignore')
    
    if gitignore_path.exists():
        with open(gitignore_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    patterns.append(line)
    
    return patterns

def is_excluded(filepath, exclude_patterns):
    path = Path(filepath)
    
    # Check if it's a binary file
    if path.suffix.lower() in BINARY_EXTENSIONS:
        return True
    
    # Convert to relative path with forward slashes
    relative_path = path.as_posix()
    if relative_path.startswith('./'):
        relative_path = relative_path[2:]
    
    for pattern in exclude_patterns:
        # Handle directory patterns
        if pattern.endswith('/'):
            if any(part == pattern[:-1] for part in path.parts):
                return True
        
        # Handle file patterns
        if fnmatch.fnmatch(relative_path, pattern):
            return True
        
        # Check if any parent directory matches
        for parent in path.parents:
            parent_relative = parent.as_posix()
            if parent_relative.startswith('./'):
                parent_relative = parent_relative[2:]
            if fnmatch.fnmatch(parent_relative, pattern):
                return True
    
    return False

def get_mode_filters(mode):
    if mode == 1:  # Core build files
        return [
            'package.json',
            'package-lock.json',
            'vite.config.ts',
            'tsconfig.json',
            'tsconfig.node.json',
            'tailwind.config.js',
            'postcss.config.js',
            'index.html',
            'vitest.config.ts',
            'webpack.config.js',
            'rollup.config.js',
            '.babelrc',
            'babel.config.js'
        ]
    
    elif mode == 2:  # Important files
        return {
            'extensions': ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.md', '.css'],
            'paths': ['src/', 'docs/', 'sql-init/'],
            'files': ['package.json', 'vite.config.ts', 'tsconfig.json', '.env', '.env.example']
        }
    
    elif mode == 3:  # All non-excluded files
        return None
    
    elif mode == 4:  # Source code only
        return {
            'paths': ['src/'],
            'extensions': ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass']
        }
    
    elif mode == 5:  # Config files and documentation
        return {
            'extensions': ['.json', '.yml', '.yaml', '.md', '.txt', '.config.js', '.config.ts'],
            'exclude_paths': ['node_modules/', 'dist/', 'build/']
        }

def should_include_file(filepath, mode, exclude_patterns):
    if is_excluded(filepath, exclude_patterns):
        return False
    
    path = Path(filepath)
    filters = get_mode_filters(mode)
    
    if mode == 1:  # Specific file list
        return path.name in filters
    
    elif mode == 2 or mode == 4 or mode == 5:  # Pattern matching
        if 'extensions' in filters:
            if path.suffix not in filters['extensions']:
                return False
        
        if 'paths' in filters:
            path_str = path.as_posix()
            if not any(allowed_path in path_str for allowed_path in filters['paths']):
                return False
        
        if 'files' in filters:
            if path.name in filters['files']:
                return True
        
        return True
    
    elif mode == 3:  # All non-excluded
        return True
    
    return False

def get_file_content(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        return f"[Error reading file: {e}]"

def generate_compilation(mode):
    mode_names = {
        1: "core_build",
        2: "important", 
        3: "all_files",
        4: "source_only",
        5: "configs_docs"
    }
    
    print(f"\nLoading exclusion patterns...")
    exclude_patterns = load_gitignore_patterns()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"code_compilation_{mode_names[mode]}_{timestamp}.txt"
    
    files_processed = 0
    files_skipped = 0
    
    print(f"Scanning files...")
    
    # Collect all files first
    all_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            filepath = os.path.join(root, file)
            relative_path = os.path.relpath(filepath, '.')
            
            if is_excluded(filepath, exclude_patterns):
                files_skipped += 1
                continue
                
            if should_include_file(filepath, mode, exclude_patterns):
                all_files.append(relative_path)
    
    # Sort files for consistent output
    all_files.sort()
    
    print(f"Writing {len(all_files)} files to compilation...")
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write(f"Code Compilation - Mode {mode}: {mode_names[mode]}\n")
        out.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        out.write(f"Total files: {len(all_files)} (skipped {files_skipped})\n")
        out.write("=" * 80 + "\n\n")
        
        for relative_path in all_files:
            out.write(f"### {relative_path} ###\n\n")
            out.write("```\n")
            out.write(get_file_content(relative_path))
            out.write("\n```\n\n")
            files_processed += 1
    
    print(f"\n✓ Generated {output_file}")
    print(f"  Processed {files_processed} files")
    print(f"  Skipped {files_skipped} files (excluded by patterns)")

def main():
    print("\nCode Compilation Generator")
    print("-" * 30)
    print("1. Core build files only")
    print("2. Important files (src + configs + docs)")
    print("3. All files (respecting .gitignore)")
    print("4. Source code only (src/)")
    print("5. Config files and documentation")
    print("-" * 30)
    
    while True:
        try:
            choice = input("\nSelect mode (1-5): ").strip()
            mode = int(choice)
            if 1 <= mode <= 5:
                generate_compilation(mode)
                break
            else:
                print("Please enter a number between 1 and 5")
        except ValueError:
            print("Invalid input. Please enter a number.")
        except KeyboardInterrupt:
            print("\n\nCancelled.")
            break

if __name__ == "__main__":
    main()