from PIL import Image, ImageDraw, ImageFont
import os

def make_banner(path, title, subtitle, color_top, color_bottom, accent):
    W, H = 900, 400
    img = Image.new("RGB", (W, H), color_top)
    draw = ImageDraw.Draw(img)

    # Dégradé vertical simple
    for y in range(H):
        ratio = y / H
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Bordure accent
    draw.rectangle([10, 10, W - 10, H - 10], outline=accent, width=6)

    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Titre centré
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((W - tw) / 2, H / 2 - th - 10), title, font=font_title, fill=accent)

    bbox2 = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw, sh = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]
    draw.text(((W - sw) / 2, H / 2 + 20), subtitle, font=font_sub, fill=(230, 230, 230))

    img.save(path)
    print(f"saved {path}")

os.makedirs("/home/claude/kingai-v2/assets/themes/sungjinwoo", exist_ok=True)
os.makedirs("/home/claude/kingai-v2/assets/themes/itadoriyuji", exist_ok=True)

# Thème Sung Jin-Woo (Solo Leveling) - violet/noir
make_banner(
    "/home/claude/kingai-v2/assets/themes/sungjinwoo/banner.png",
    "SUNG JIN-WOO",
    "Arise. XDee.11",
    (20, 10, 35), (70, 30, 110), (170, 100, 255)
)

# Thème Itadori Yuji (Jujutsu Kaisen) - rouge/noir
make_banner(
    "/home/claude/kingai-v2/assets/themes/itadoriyuji/banner.png",
    "ITADORI YUJI",
    "Just eat and get healthy! XDee.11",
    (15, 15, 15), (140, 20, 25), (255, 90, 60)
)
