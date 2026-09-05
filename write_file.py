import os, sys, base64
path, b64 = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(path), exist_ok=True)
open(path, 'wb').write(base64.b64decode(b64))
print('Wrote:', path)
