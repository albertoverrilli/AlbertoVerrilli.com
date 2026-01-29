import moviepy
import sys

print(f"MoviePy version: {getattr(moviepy, '__version__', 'unknown')}")
print("\nmoviepy contents:", dir(moviepy))

try:
    from moviepy import vfx
    print("\nvfx contents:", dir(vfx))
except ImportError as e:
    print(f"\nImportError vfx: {e}")
except Exception as e:
    print(f"\nError importing vfx: {e}")

try:
    import moviepy.video.fx.all as vfx_all
    print("\nvfx_all contents:", dir(vfx_all))
except ImportError as e:
    print(f"\nImportError vfx_all: {e}")
except Exception as e:
    print(f"\nError importing vfx_all: {e}")
