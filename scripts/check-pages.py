#!/usr/bin/env python3
"""Validate the checked-in GitHub Pages artifact without network or secrets."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
for relative in ('index.html', 'intro/index.html', 'intro/js/course.js',
                 'intro/assets/course.css', 'intro/assets/course-qr.png'):
    path = root / relative
    if not path.is_file() or not path.stat().st_size:
        raise SystemExit(f'missing static asset: {relative}')

for entry in (root / 'index.html', root / 'intro/index.html'):
    index = entry.read_text(encoding='utf-8')
    for asset in re.findall(r'(?:src|href)="([^"]+)"', index):
        if asset.startswith(('http://', 'https://', '#', 'data:')):
            continue
        path = entry.parent / asset.split('?', 1)[0].split('#', 1)[0]
        if path.is_dir():
            path = path / 'index.html'
        if not path.is_file():
            raise SystemExit(f'missing referenced asset in {entry.relative_to(root)}: {asset}')

for path in root.rglob('*'):
    if path.is_file() and path.name in {'.env', '.env.production'}:
        raise SystemExit(f'credential file is not publishable: {path.relative_to(root)}')
print('GitHub Pages artifact is self-contained and contains no environment files')
