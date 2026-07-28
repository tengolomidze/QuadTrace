#!/usr/bin/env python3
"""
Usage:
    python replace.py <root_directory> <template_png> [--dry-run]
Example:
    python replace.py ./assets ./forward.png --dry-run
"""

import os
import sys
import argparse
from PIL import Image


def luminance(rgb):
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b


def find_dark_and_bright(img: Image.Image):
    rgb_img = img.convert("RGB")
    pixels = list(rgb_img.getdata())
    darkest = min(pixels, key=luminance)
    brightest = max(pixels, key=luminance)
    return darkest, brightest


def recolor_template(template_gray: Image.Image, dark_color, bright_color, size):

    template_resized = template_gray.resize(size, Image.LANCZOS)
    out = Image.new("RGB", size)
    tpix = template_resized.load()
    opix = out.load()

    dr, dg, db = dark_color
    br, bg, bb = bright_color

    for y in range(size[1]):
        for x in range(size[0]):
            v = tpix[x, y] / 255.0 
            r = round(dr + (br - dr) * v)
            g = round(dg + (bg - dg) * v)
            b = round(db + (bb - db) * v)
            opix[x, y] = (
                max(0, min(255, r)),
                max(0, min(255, g)),
                max(0, min(255, b)),
            )
    return out


def process_directory(root_dir: str, template_path: str, target_size=(16, 16), dry_run=False):
    if not os.path.isdir(root_dir):
        print(f"Error: '{root_dir}' is not a valid directory.")
        sys.exit(1)
    if not os.path.isfile(template_path):
        print(f"Error: template file '{template_path}' not found.")
        sys.exit(1)

    template_full_path = os.path.abspath(template_path)
    template_gray = Image.open(template_path).convert("L")

    replaced_count = 0
    checked_count = 0

    for dirpath, _dirnames, filenames in os.walk(root_dir):
        for fname in filenames:
            if not fname.lower().endswith(".png"):
                continue

            fpath = os.path.join(dirpath, fname)

            if os.path.abspath(fpath) == template_full_path:
                continue

            checked_count += 1

            try:
                with Image.open(fpath) as im:
                    if im.size != target_size:
                        continue
                    dark_color, bright_color = find_dark_and_bright(im)
            except Exception as e:
                print(f"  [skip] Could not read '{fpath}': {e}")
                continue

            new_img = recolor_template(template_gray, dark_color, bright_color, target_size)

            action = "[dry-run] Would replace" if dry_run else "Replaced"
            print(f"{action}: {fpath}  (dark={dark_color}, bright={bright_color})")

            if not dry_run:
                try:
                    new_img.save(fpath)
                except Exception as e:
                    print(f"  [error] Failed to save '{fpath}': {e}")
                    continue

            replaced_count += 1

    print(f"\nDone. Checked {checked_count} png file(s), "
          f"{'would replace' if dry_run else 'replaced'} {replaced_count} "
          f"16x16 file(s).")


def main():
    parser = argparse.ArgumentParser(
        description="Recursively replace 16x16 PNGs with a recolored template image."
    )
    parser.add_argument("root_dir", help="Directory to scan recursively")
    parser.add_argument("template_png", help="Path to the template PNG to use as replacement")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print what would be replaced, without modifying any files",
    )
    args = parser.parse_args()

    process_directory(args.root_dir, args.template_png, dry_run=args.dry_run)


if __name__ == "__main__":
    main()