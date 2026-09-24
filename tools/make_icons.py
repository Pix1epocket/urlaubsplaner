"""Renders the PNG app icons (same motif as icons/icon.svg) without external dependencies."""
import math
import struct
import zlib
from pathlib import Path

ICON_DIR = Path(__file__).resolve().parent.parent / "icons"
SUPERSAMPLING = 3


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def wave(x, base):
    return base + 15 * math.sin(x / 512 * 4 * math.pi)


def color_at(x, y, rounded):
    if rounded:
        r = 112
        cx = min(max(x, r), 512 - r)
        cy = min(max(y, r), 512 - r)
        if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
            return None
    color = mix((0x4F, 0xB3, 0xFF), (0x0A, 0x84, 0xFF), y / 512)
    if (x - 256) ** 2 + (y - 220) ** 2 <= 96 * 96:
        color = (0xFF, 0xD6, 0x0A)
    if y >= wave(x, 330):
        color = mix(color, (255, 255, 255), 0.9)
    if y >= wave(x, 390):
        color = (0x00, 0x5B, 0xB5)
    return color


def render(size, rounded):
    rows = []
    n = SUPERSAMPLING
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(n):
                for sx in range(n):
                    x = (px + (sx + 0.5) / n) * 512 / size
                    y = (py + (sy + 0.5) / n) * 512 / size
                    c = color_at(x, y, rounded)
                    if c is not None:
                        acc[0] += c[0]
                        acc[1] += c[1]
                        acc[2] += c[2]
                        acc[3] += 1
            alpha = acc[3] / (n * n)
            if acc[3]:
                row += bytes(int(acc[i] / acc[3]) for i in range(3))
            else:
                row += b"\x00\x00\x00"
            row.append(int(alpha * 255))
        rows.append(bytes(row))
    return b"".join(rows)


def write_png(path, size, rounded):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = render(size, rounded)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)
    print(f"{path.name}: {size}x{size}")


if __name__ == "__main__":
    # iOS rounds the corners itself, so the apple-touch-icon must be square.
    write_png(ICON_DIR / "apple-touch-icon.png", 180, rounded=False)
    write_png(ICON_DIR / "icon-192.png", 192, rounded=True)
    write_png(ICON_DIR / "icon-512.png", 512, rounded=True)
