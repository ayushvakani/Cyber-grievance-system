import builtins
import time
import sys

original_import = builtins.__import__

def custom_import(name, *args, **kwargs):
    print(f"Importing: {name}")
    start = time.time()
    res = original_import(name, *args, **kwargs)
    end = time.time()
    if end - start > 0.5:
        print(f"   => Took {end - start:.2f} seconds to import {name}")
    return res

builtins.__import__ = custom_import

print("Starting to import backend.main...")
try:
    import backend.main
    print("SUCCESS: backend.main imported")
except Exception as e:
    print(f"FAILED: {e}")
