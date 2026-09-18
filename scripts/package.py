"""Build a byte-reproducible ZIP with fixed metadata and an explicit file list."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED

root = Path(__file__).resolve().parent.parent
source = root / 'dist' / 'extension'
manifest = json.loads((source / 'manifest.json').read_text())
files = ['LICENSE', 'background.js', 'content.js', 'manifest.json', 'privacy.html',
         'settings.css', 'settings.html', 'settings.js']
actual = sorted(str(p.relative_to(source)) for p in source.rglob('*') if p.is_file())
if actual != sorted(files):
    raise SystemExit(f'Unexpected build contents: {actual}')
output = root / 'artifacts'
output.mkdir(exist_ok=True)
archive = output / f'local-chat-translator-{manifest["version"]}.zip'
with ZipFile(archive, 'w', compression=ZIP_STORED) as package:
    for name in sorted(files):
        info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        package.writestr(info, (source / name).read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'{archive.relative_to(root)}\nSHA-256: {digest}')
