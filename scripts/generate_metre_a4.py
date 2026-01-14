"""
Generate printable A4 sheet for the "Metré" marker with AprilTags + Charuco + ruler.

Outputs (in public/printable):
- metre-a4-v1.png (300 DPI)
- metre-a4-v1.pdf (vector saved from PNG)

Dependencies: opencv-python, numpy, pillow

Run: python scripts/generate_metre_a4.py
"""

import hashlib
import math
import os
from pathlib import Path

import cv2
import numpy as np
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps


DPI = 300
MM_PER_INCH = 25.4


def mm_to_px(mm: float) -> int:
    return int(round(mm * DPI / MM_PER_INCH))


def draw_border(draw: ImageDraw.ImageDraw, page_px: tuple[int, int], thickness_mm: float, margin_mm: float = 5) -> None:
    """Dessine un cadre noir de thickness_mm avec une marge blanche de margin_mm pour compatibilité imprimantes."""
    t = mm_to_px(thickness_mm)
    m = mm_to_px(margin_mm)  # Marge blanche pour zone non-imprimable des imprimantes
    w, h = page_px
    # Dessiner 4 rectangles remplis pour les bords (avec marge)
    draw.rectangle([m, m, w - m, m + t], fill="black")  # Haut
    draw.rectangle([m, h - m - t, w - m, h - m], fill="black")  # Bas
    draw.rectangle([m, m, m + t, h - m], fill="black")  # Gauche
    draw.rectangle([w - m - t, m, w - m, h - m], fill="black")  # Droite


def load_font(size_px: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size_px)
    except OSError:
        return ImageFont.load_default()


def draw_text_center(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size_px: int, weight: str = "bold") -> None:
    font = load_font(size_px)
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((xy[0] - w // 2, xy[1] - h // 2), text, fill="black", font=font)


def draw_placeholder(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, w_mm: float, h_mm: float, label: str) -> None:
    x = mm_to_px(x_mm)
    y = mm_to_px(y_mm)
    w = mm_to_px(w_mm)
    h = mm_to_px(h_mm)
    draw.rectangle([x, y, x + w, y + h], outline="black", width=mm_to_px(0.2))
    draw_text_center(draw, (x + w // 2, y + h // 2), label, size_px=mm_to_px(3))


def place_image(canvas: Image.Image, img: np.ndarray, x_mm: float, y_mm: float, w_mm: float, h_mm: float) -> None:
    target = (mm_to_px(w_mm), mm_to_px(h_mm))
    resized = cv2.resize(img, target, interpolation=cv2.INTER_LINEAR)
    pil_img = Image.fromarray(resized)
    canvas.paste(pil_img, (mm_to_px(x_mm), mm_to_px(y_mm)))


def generate_apriltag(id_: int, size_mm: float) -> np.ndarray:
    dict_april = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
    size_px = mm_to_px(size_mm)
    img = cv2.aruco.generateImageMarker(dict_april, id_, size_px)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)


def generate_charuco(w_mm: float, h_mm: float, squares_x: int, squares_y: int, square_mm: float) -> np.ndarray:
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
    board = cv2.aruco.CharucoBoard((squares_x, squares_y), squareLength=square_mm, markerLength=square_mm * 0.6, dictionary=dictionary)
    img_px = (mm_to_px(w_mm), mm_to_px(h_mm))
    img = board.generateImage(img_px)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)


def draw_rule(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, length_mm: float) -> None:
    x0 = mm_to_px(x_mm)
    y0 = mm_to_px(y_mm)
    length_px = mm_to_px(length_mm)
    draw.line([x0, y0, x0 + length_px, y0], fill="black", width=mm_to_px(0.2))
    for i in range(0, int(length_mm) + 1):
        x = x0 + mm_to_px(i)
        height = 4 if i % 10 == 0 else 3 if i % 5 == 0 else 2
        draw.line([x, y0, x, y0 - mm_to_px(height / 10)], fill="black", width=mm_to_px(0.2))
        if i % 10 == 0:
            draw_text_center(draw, (x, y0 + mm_to_px(3)), str(i), size_px=mm_to_px(2.2))


def draw_vertical_rule(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, length_mm: float) -> None:
    x0 = mm_to_px(x_mm)
    y0 = mm_to_px(y_mm)
    length_px = mm_to_px(length_mm)
    draw.line([x0, y0, x0, y0 + length_px], fill="black", width=mm_to_px(0.2))
    for i in range(0, int(length_mm) + 1):
        y = y0 + mm_to_px(i)
        height = 4 if i % 10 == 0 else 3 if i % 5 == 0 else 2
        draw.line([x0, y, x0 + mm_to_px(height / 10), y], fill="black", width=mm_to_px(0.2))
        if i % 10 == 0 and i > 0:
            draw_text_center(draw, (x0 - mm_to_px(4), y), str(i), size_px=mm_to_px(2.2))


def draw_dots(draw: ImageDraw.ImageDraw, dots: list[tuple[float, float]], r_mm: float) -> None:
    r_px = mm_to_px(r_mm)
    for x_mm, y_mm in dots:
        cx = mm_to_px(x_mm)
        cy = mm_to_px(y_mm)
        draw.ellipse([cx - r_px, cy - r_px, cx + r_px, cy + r_px], fill="black")


def generate_qr_code(size_mm: float, version: str) -> Image.Image:
    """Generate QR code with JSON metadata."""
    import json
    payload = json.dumps({
        "id": version,
        "size_mm": "210x297",
        "scale": "100%",
        "url": "https://2thier.be/calibration"
    }, separators=(',', ':'))
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(payload)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    size_px = mm_to_px(size_mm)
    return qr_img.resize((size_px, size_px), Image.Resampling.NEAREST)


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "public" / "printable"
    out_dir.mkdir(parents=True, exist_ok=True)

    page_px = (mm_to_px(210), mm_to_px(297))
    
    # =====================================================
    # VERSION LIGHT: Papier blanc, pas de cadre noir
    # =====================================================
    canvas = Image.new("RGB", page_px, "white")
    draw = ImageDraw.Draw(canvas)

    # Orientation text
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(16)), "TOP ↑", size_px=mm_to_px(5))

    # Warnings d'impression TRÈS VISIBLES
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(23)), "⚠ NE PAS AJUSTER À LA PAGE ⚠", size_px=mm_to_px(4.5))
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(29)), "Imprimer à 100% - Version PAPIER BLANC", size_px=mm_to_px(3))

    # QR Code 30×30mm centré sous warnings (lisibilité accrue)
    qr_img = generate_qr_code(30, "A4-CALIB-V1.2-LIGHT")
    canvas.paste(qr_img, (mm_to_px((210 - 30) / 2), mm_to_px(32)))

    # AprilTag corners (30mm du bord pour éviter zone non-imprimable ~5mm)
    tags = [
        (2, 30, 30, "TL"),      # Top Left: 30mm from left, 30mm from top
        (7, 160, 30, "TR"),     # Top Right: 210-30-20=160mm, 30mm from top
        (14, 30, 247, "BL"),    # Bottom Left: 30mm from left, 297-20-30=247mm from top
        (21, 160, 247, "BR"),   # Bottom Right: 160mm, 247mm from top
    ]
    for id_, x_mm, y_mm, _pos in tags:
        tag_img = generate_apriltag(id_, 20)
        place_image(canvas, tag_img, x_mm, y_mm, 20, 20)

    # ChArUco 6×6 centre
    charuco_img = generate_charuco(120, 120, squares_x=6, squares_y=6, square_mm=20)
    place_image(canvas, charuco_img, 45, 80, 120, 120)

    # 14 points référence dispersés (ajustés pour zone imprimable)
    dots = [
        # Haut gauche (3)
        (45, 65), (65, 60), (80, 68),
        # Haut droit (3)
        (145, 65), (160, 60), (175, 68),
        # Bas gauche (2) - bien au-dessus des textes et règles
        (43, 210), (73, 215),
        # Bas droit (2) - bien au-dessus aussi
        (152, 210), (180, 215),
        # Centre à gauche et droite du damier (2)
        (30, 140), (180, 140),
    ]
    draw_dots(draw, dots, r_mm=2.0)

    # Règles de mesure
    draw_rule(draw, 15, 235, 175)  # Horizontale
    draw_vertical_rule(draw, 20, 40, 190)  # Verticale à gauche après coin AprilTag
    
    # Zone d'information
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(228)), "Règles : Horizontal 0–175mm | Vertical 0–190mm", size_px=mm_to_px(2.8))
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(232)), "ID : A4-CALIB-V1.2-LIGHT — 210×297 mm", size_px=mm_to_px(3))

    # Logos (remontés pour éviter zone grise)
    try:
        logo_2thier_path = out_dir / "logo-2thier.png"
        logo_metre_path = out_dir / "logo-metre.png"
        
        if logo_2thier_path.exists():
            logo_2thier = Image.open(logo_2thier_path).convert("RGBA")
            target_size = (mm_to_px(30), mm_to_px(12))
            logo_2thier.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_offset = (mm_to_px(30) - logo_2thier.width) // 2
            y_offset = (mm_to_px(12) - logo_2thier.height) // 2
            canvas.paste(logo_2thier, (mm_to_px(72.5) + x_offset, mm_to_px(250) + y_offset), logo_2thier)
        
        if logo_metre_path.exists():
            logo_metre = Image.open(logo_metre_path).convert("RGBA")
            target_size = (mm_to_px(30), mm_to_px(12))
            logo_metre.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_offset = (mm_to_px(30) - logo_metre.width) // 2
            y_offset = (mm_to_px(12) - logo_metre.height) // 2
            canvas.paste(logo_metre, (mm_to_px(107.5) + x_offset, mm_to_px(250) + y_offset), logo_metre)
    except Exception as e:
        print(f"⚠️ Erreur chargement logos: {e}")

    # Save V1.2 LIGHT
    png_path = out_dir / "metre-a4-v1.2-light.png"
    pdf_path = out_dir / "metre-a4-v1.2-light.pdf"
    canvas.save(png_path, dpi=(DPI, DPI))
    canvas.save(pdf_path, dpi=(DPI, DPI))
    print(f"✅ Generated V1.2 LIGHT: {png_path}")

    # =====================================================
    # VERSION DARK: Fond sombre (noir), marqueurs blancs
    # =====================================================
    canvas_dark = Image.new("RGB", page_px, "black")
    draw_dark = ImageDraw.Draw(canvas_dark)

    # Orientation text en blanc
    font = load_font(mm_to_px(5))
    bbox = draw_dark.textbbox((0, 0), "TOP ↑", font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw_dark.text((page_px[0] // 2 - w // 2, mm_to_px(16) - h // 2), "TOP ↑", fill="white", font=font)

    # Warnings en blanc
    font_warning = load_font(mm_to_px(4.5))
    bbox = draw_dark.textbbox((0, 0), "⚠ NE PAS AJUSTER À LA PAGE ⚠", font=font_warning)
    w = bbox[2] - bbox[0]
    draw_dark.text((page_px[0] // 2 - w // 2, mm_to_px(23)), "⚠ NE PAS AJUSTER À LA PAGE ⚠", fill="white", font=font_warning)
    
    font_small = load_font(mm_to_px(3))
    bbox = draw_dark.textbbox((0, 0), "Imprimer à 100% - Version MUR BLANC (projection)", font=font_small)
    w = bbox[2] - bbox[0]
    draw_dark.text((page_px[0] // 2 - w // 2, mm_to_px(29)), "Imprimer à 100% - Version MUR BLANC (projection)", fill="white", font=font_small)

    # QR Code DARK (inverted)
    qr_img_dark = generate_qr_code(30, "A4-CALIB-V1.2-DARK")
    qr_inverted = ImageOps.invert(qr_img_dark.convert("L")).convert("RGB")
    canvas_dark.paste(qr_inverted, (mm_to_px((210 - 30) / 2), mm_to_px(32)))

    # AprilTags DARK (inverted colors)
    for id_, x_mm, y_mm, _pos in tags:
        tag_img = generate_apriltag(id_, 20)
        tag_inverted = ImageOps.invert(Image.fromarray(tag_img).convert("L")).convert("RGB")
        tag_array = np.array(tag_inverted)
        place_image(canvas_dark, tag_array, x_mm, y_mm, 20, 20)

    # ChArUco DARK (inverted)
    charuco_img = generate_charuco(120, 120, squares_x=6, squares_y=6, square_mm=20)
    charuco_inverted = ImageOps.invert(Image.fromarray(charuco_img).convert("L")).convert("RGB")
    place_image(canvas_dark, np.array(charuco_inverted), 45, 80, 120, 120)

    # Points de référence BLANCS au lieu de NOIRS
    r_px = mm_to_px(2.0)
    for x_mm, y_mm in dots:
        cx = mm_to_px(x_mm)
        cy = mm_to_px(y_mm)
        draw_dark.ellipse([cx - r_px, cy - r_px, cx + r_px, cy + r_px], fill="white")

    # Règles BLANCHES
    def draw_rule_white(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, length_mm: float) -> None:
        x0 = mm_to_px(x_mm)
        y0 = mm_to_px(y_mm)
        length_px = mm_to_px(length_mm)
        draw.line([x0, y0, x0 + length_px, y0], fill="white", width=mm_to_px(0.2))
        for i in range(0, int(length_mm) + 1):
            x = x0 + mm_to_px(i)
            height = 4 if i % 10 == 0 else 3 if i % 5 == 0 else 2
            draw.line([x, y0, x, y0 - mm_to_px(height / 10)], fill="white", width=mm_to_px(0.2))
            if i % 10 == 0:
                bbox = draw.textbbox((0, 0), str(i), font=load_font(mm_to_px(2.2)))
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                draw.text((x - w // 2, y0 + mm_to_px(3) - h // 2), str(i), fill="white", font=load_font(mm_to_px(2.2)))

    def draw_vertical_rule_white(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, length_mm: float) -> None:
        x0 = mm_to_px(x_mm)
        y0 = mm_to_px(y_mm)
        length_px = mm_to_px(length_mm)
        draw.line([x0, y0, x0, y0 + length_px], fill="white", width=mm_to_px(0.2))
        for i in range(0, int(length_mm) + 1):
            y = y0 + mm_to_px(i)
            height = 4 if i % 10 == 0 else 3 if i % 5 == 0 else 2
            draw.line([x0, y, x0 + mm_to_px(height / 10), y], fill="white", width=mm_to_px(0.2))
            if i % 10 == 0 and i > 0:
                bbox = draw.textbbox((0, 0), str(i), font=load_font(mm_to_px(2.2)))
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                draw.text((x0 - mm_to_px(4) - w // 2, y - h // 2), str(i), fill="white", font=load_font(mm_to_px(2.2)))

    draw_rule_white(draw_dark, 15, 235, 175)
    draw_vertical_rule_white(draw_dark, 20, 40, 190)
    
    # Info en blanc
    font_info = load_font(mm_to_px(2.8))
    bbox = draw_dark.textbbox((0, 0), "Règles : Horizontal 0–175mm | Vertical 0–190mm", font=font_info)
    w = bbox[2] - bbox[0]
    draw_dark.text((page_px[0] // 2 - w // 2, mm_to_px(228)), "Règles : Horizontal 0–175mm | Vertical 0–190mm", fill="white", font=font_info)
    
    font_id = load_font(mm_to_px(3))
    bbox = draw_dark.textbbox((0, 0), "ID : A4-CALIB-V1.2-DARK — 210×297 mm", font=font_id)
    w = bbox[2] - bbox[0]
    draw_dark.text((page_px[0] // 2 - w // 2, mm_to_px(232)), "ID : A4-CALIB-V1.2-DARK — 210×297 mm", fill="white", font=font_id)

    # Logos DARK (remontés aussi)
    try:
        logo_2thier_path = out_dir / "logo-2thier.png"
        logo_metre_path = out_dir / "logo-metre.png"
        
        if logo_2thier_path.exists():
            logo_2thier = Image.open(logo_2thier_path).convert("RGBA")
            logo_2thier_inverted = ImageOps.invert(logo_2thier.convert("RGB"))
            target_size = (mm_to_px(30), mm_to_px(12))
            logo_2thier_inverted.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_offset = (mm_to_px(30) - logo_2thier_inverted.width) // 2
            y_offset = (mm_to_px(12) - logo_2thier_inverted.height) // 2
            canvas_dark.paste(logo_2thier_inverted, (mm_to_px(72.5) + x_offset, mm_to_px(250) + y_offset))
        
        if logo_metre_path.exists():
            logo_metre = Image.open(logo_metre_path).convert("RGBA")
            logo_metre_inverted = ImageOps.invert(logo_metre.convert("RGB"))
            target_size = (mm_to_px(30), mm_to_px(12))
            logo_metre_inverted.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_offset = (mm_to_px(30) - logo_metre_inverted.width) // 2
            y_offset = (mm_to_px(12) - logo_metre_inverted.height) // 2
            canvas_dark.paste(logo_metre_inverted, (mm_to_px(107.5) + x_offset, mm_to_px(250) + y_offset))
    except Exception as e:
        print(f"⚠️ Erreur logos DARK: {e}")

    # Save V1.2 DARK
    png_path_dark = out_dir / "metre-a4-v1.2-dark.png"
    pdf_path_dark = out_dir / "metre-a4-v1.2-dark.pdf"
    canvas_dark.save(png_path_dark, dpi=(DPI, DPI))
    canvas_dark.save(pdf_path_dark, dpi=(DPI, DPI))
    print(f"✅ Generated V1.2 DARK: {png_path_dark}")


if __name__ == "__main__":
    main()
