import sys
import traceback

try:
    import backend.main
    print("Successfully imported backend.main")
except Exception as e:
    print("Exception caught:")
    traceback.print_exc()
