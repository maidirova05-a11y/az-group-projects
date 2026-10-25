#!/usr/bin/env python
"""
Сжимает картинки сайта на месте, не меняя имена файлов (на них ссылаются база и src/data/site.ts):
  public/images/cms  — фото из старой CMS: не шире 1600 px, JPEG q82 progressive, PNG → PNG с палитрой, если без прозрачности — JPEG не делаем, чтобы не менять расширение;
  public/logos       — логотипы: не шире 640 px, PNG оптимизируется.
Запуск: python scripts/optimize-images.py [--dry]   (нужен Pillow: pip install pillow)
Повторный запуск безопасен: файлы, которые уже в пределах лимитов, не трогаются.
"""
import os, sys
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
DRY = '--dry' in sys.argv
RULES = [
    (os.path.join(ROOT, 'images', 'cms'), 1600, 82),
    (os.path.join(ROOT, 'logos'), 640, 90),
]
MIN_GAIN = 0.10  # перезаписываем, только если выигрыш ≥ 10 %


def shrink(path, max_side, quality):
    before = os.path.getsize(path)
    ext = os.path.splitext(path)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
        return None
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    tmp = path + '.tmp'
    if ext in ('.jpg', '.jpeg'):
        im.convert('RGB').save(tmp, 'JPEG', quality=quality, optimize=True, progressive=True)
    elif ext == '.png':
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        if has_alpha:
            im.convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(tmp, 'PNG', optimize=True)
        else:
            im.convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT).save(tmp, 'PNG', optimize=True)
    else:
        im.save(tmp, 'WEBP', quality=quality, method=6)
    after = os.path.getsize(tmp)
    if after < before * (1 - MIN_GAIN):
        if DRY:
            os.remove(tmp)
        else:
            os.replace(tmp, path)
        return before, after, im.size
    os.remove(tmp)
    return None


total_before = total_after = 0
for folder, max_side, quality in RULES:
    for name in sorted(os.listdir(folder)):
        p = os.path.join(folder, name)
        if not os.path.isfile(p):
            continue
        r = shrink(p, max_side, quality)
        if r:
            b, a, size = r
            total_before += b; total_after += a
            print(f'{os.path.relpath(p, ROOT):28} {b // 1024:6} KB -> {a // 1024:5} KB  {size[0]}x{size[1]}{"  (dry)" if DRY else ""}')
print(f'\nИтого: {total_before // 1024} KB -> {total_after // 1024} KB')
