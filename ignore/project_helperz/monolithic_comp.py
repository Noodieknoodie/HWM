import os
from pathlib import Path

skip_extensions = {
    '.md', '.txt', '.zip', '.png', '.jpg', '.jpeg', '.gif', 
    '.svg', '.ico', '.webp', '.bmp', '.tiff', '.tif'
}

skip_dirs = {
    'dist', 'docs', 'ignore', 'public', 'tests', 'node_modules',
    '__pycache__', '.pytest_cache', 'root_helpers', 'CLAUDE_JOURNAL'
}

def should_skip_dir(dirname):
    return dirname.startswith('.') or dirname in skip_dirs

def should_skip_file(filepath):
    return Path(filepath).suffix.lower() in skip_extensions

def get_hierarchy(root_path, indent=""):
    items = []
    try:
        entries = sorted(os.listdir(root_path))
        for entry in entries:
            if entry.startswith('.') and entry not in ['.env', '.gitignore']:
                continue
            path = os.path.join(root_path, entry)
            
            if os.path.isdir(path):
                if not should_skip_dir(entry):
                    items.append(f"{indent}{entry}/")
                    items.extend(get_hierarchy(path, indent + "  "))
            else:
                if not should_skip_file(entry):
                    items.append(f"{indent}{entry}")
    except PermissionError:
        pass
    return items

def get_codebase(root_path):
    content = []
    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        
        for file in sorted(files):
            if file.startswith('.') and file not in ['.env', '.gitignore']:
                continue
            
            if should_skip_file(file):
                continue
            
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, project_root)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    code = f.read()
                content.append(f"=== {rel_path} ===\n\n```\n{code}\n```\n")
            except:
                pass
    
    return '\n'.join(content)

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("\nProject Export Options:")
    print("1. File hierarchy")
    print("2. Codebase")
    print("3. Both")
    
    choice = input("\nSelect option (1-3): ")
    
    output = []
    
    if choice in ['1', '3']:
        output.append("FILE HIERARCHY\n" + "="*50 + "\n")
        hierarchy = get_hierarchy(project_root)
        output.append('\n'.join(hierarchy))
    
    if choice in ['2', '3']:
        if choice == '3':
            output.append("\n\n\nCODEBASE\n" + "="*50 + "\n")
        else:
            output.append("CODEBASE\n" + "="*50 + "\n")
        output.append(get_codebase(project_root))
    
    filename = f"project_export_{'hierarchy' if choice == '1' else 'codebase' if choice == '2' else 'full'}.txt"
    output_path = script_dir / filename
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    
    print(f"\nExported to: {filename}")