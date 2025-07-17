#!/usr/bin/env python3

import os

# List of files created/modified in this session
files = [
    "src/components/ui/multi-select.tsx",
    "src/components/export/ExportDataPage.tsx",
    "src/utils/exportUtils.ts",
    "components.json",
    "src/lib/utils.ts",
    "src/components/ui/button.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/checkbox.tsx",
    "src/components/ui/label.tsx",
    "src/components/ui/popover.tsx",
    "src/components/ui/select.tsx",
    "src/components/ui/calendar.tsx",
    "src/components/ui/radio-group.tsx",
    "src/components/ui/toggle-group.tsx",
    "src/components/ui/toggle.tsx",
    "src/components/ui/scroll-area.tsx",
    "src/pages/Export.tsx"
]

output_file = "export_implementation_dump.txt"

with open(output_file, 'w', encoding='utf-8') as out:
    for file_path in files:
        out.write(f"#### {file_path} ####\n")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                out.write(f.read())
            out.write("\n\n")
        except FileNotFoundError:
            out.write(f"FILE NOT FOUND\n\n")
        except Exception as e:
            out.write(f"ERROR READING FILE: {e}\n\n")

print(f"Export implementation files dumped to {output_file}")