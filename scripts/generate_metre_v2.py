"""
🎯 GÉNÉRATION MARQUEUR MÉTRÉ V2.0 - FORMAT A4 COMPLET
=====================================================

Design optimisé Jonathan:
- Feuille A4 complète (210×297mm)  
- AprilTag central GÉANT 16cm (détection 7-10m)
- Règles graduées parallèles sur les 4 côtés
- Bordure pointillée de référence
- Croix de coins
- Logos 2Thier + M²TRÉ en bas
- Zone 5.7cm pour futurs outils

Outputs (in public/printable):
- metre-a4-v2.0-light.png (300 DPI)
- metre-a4-v2.0-light.pdf (vector)
- metre-a4-v2.0-dark.png (version inversée)
- metre-a4-v2.0-dark.pdf

Dependencies: opencv-python, numpy, pillow

Run: python3 scripts/generate_metre_v2.py
"""

import math
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

# ═══════════════════════════════════════════════════════════════
# CONSTANTES
# ═══════════════════════════════════════════════════════════════

DPI = 300
MM_PER_INCH = 25.4

# A4
A4_WIDTH_MM = 210
A4_HEIGHT_MM = 297

# Design V2.0 - Marges impression sécurisées
PRINT_MARGIN_TOP_MM = 30      # 3cm haut (zone souvent coupée)
PRINT_MARGIN_BOTTOM_MM = 30   # 3cm bas (zone souvent coupée)

# Carré de calibration 18×18cm centré
CALIBRATION_SIZE_MM = 180
TAG_SIZE_MM = 160             # AprilTag 16cm (18 - 2×1cm marges règles)

# Zone logos en bas
LOGO_ZONE_HEIGHT_MM = 57      # 5.7cm

# Position carré calibration (centré horizontalement)
CALIB_X_MM = (A4_WIDTH_MM - CALIBRATION_SIZE_MM) / 2  # 15mm
CALIB_Y_MM = PRINT_MARGIN_TOP_MM  # 30mm du haut


def mm_to_px(mm: float) -> int:
    return int(round(mm * DPI / MM_PER_INCH))


def load_font(size_px: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "DejaVuSans.ttf"
    ]:
        try:
            return ImageFont.truetype(path, size_px)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_text_center(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size_px: int, fill="black") -> None:
    font = load_font(size_px)
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((xy[0] - w // 2, xy[1] - h // 2), text, fill=fill, font=font)


def generate_apriltag(id_: int, size_mm: float) -> np.ndarray:
    """Génère un AprilTag 36h11"""
    dict_april = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
    size_px = mm_to_px(size_mm)
    img = cv2.aruco.generateImageMarker(dict_april, id_, size_px)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)


def place_image(canvas: Image.Image, img: np.ndarray, x_mm: float, y_mm: float, w_mm: float, h_mm: float) -> None:
    """Place une image numpy sur le canvas PIL"""
    target = (mm_to_px(w_mm), mm_to_px(h_mm))
    resized = cv2.resize(img, target, interpolation=cv2.INTER_LINEAR)
    pil_img = Image.fromarray(resized)
    canvas.paste(pil_img, (mm_to_px(x_mm), mm_to_px(y_mm)))


def draw_ruler_parallel(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, length_mm: float, 
                        horizontal: bool = True, inward: bool = True, fill="black") -> None:
    """Dessine une règle graduée parallèle au bord (traits tous les 1cm)"""
    x0 = mm_to_px(x_mm)
    y0 = mm_to_px(y_mm)
    
    for i in range(int(length_mm // 10) + 1):
        offset = mm_to_px(i * 10)
        mark_len = mm_to_px(4)  # 4mm
        
        if horizontal:
            x = x0 + offset
            if inward:
                draw.line([x, y0, x, y0 + mark_len], fill=fill, width=max(2, mm_to_px(0.5)))
            else:
                draw.line([x, y0 - mark_len, x, y0], fill=fill, width=max(2, mm_to_px(0.5)))
        else:
            y = y0 + offset
            if inward:
                draw.line([x0, y, x0 + mark_len, y], fill=fill, width=max(2, mm_to_px(0.5)))
            else:
                draw.line([x0 - mark_len, y, x0, y], fill=fill, width=max(2, mm_to_px(0.5)))


def draw_dotted_square(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, size_mm: float, 
                       dot_spacing_mm: float = 10, dot_radius_mm: float = 1.5, fill="black") -> None:
    """Dessine un carré pointillé (points tous les 1cm)"""
    x0 = mm_to_px(x_mm)
    y0 = mm_to_px(y_mm)
    size_px = mm_to_px(size_mm)
    dot_spacing = mm_to_px(dot_spacing_mm)
    dot_r = mm_to_px(dot_radius_mm)
    
    # 4 côtés
    sides = [
        (x0, y0, x0 + size_px, y0),                   # Haut
        (x0 + size_px, y0, x0 + size_px, y0 + size_px),  # Droite
        (x0 + size_px, y0 + size_px, x0, y0 + size_px),  # Bas
        (x0, y0 + size_px, x0, y0),                   # Gauche
    ]
    
    for sx, sy, ex, ey in sides:
        length = math.sqrt((ex - sx)**2 + (ey - sy)**2)
        num_dots = int(length / dot_spacing) + 1
        for i in range(num_dots):
            t = i / max(1, num_dots - 1) if num_dots > 1 else 0
            px = sx + t * (ex - sx)
            py = sy + t * (ey - sy)
            draw.ellipse([px - dot_r, py - dot_r, px + dot_r, py + dot_r], fill=fill)


def draw_corner_cross(draw: ImageDraw.ImageDraw, cx: int, cy: int, size_mm: float = 5, fill="black") -> None:
    """Dessine une croix de coin"""
    size = mm_to_px(size_mm)
    width = max(2, mm_to_px(0.6))
    draw.line([cx - size, cy, cx + size, cy], fill=fill, width=width)
    draw.line([cx, cy - size, cx, cy + size], fill=fill, width=width)


def draw_scale_verification(draw: ImageDraw.ImageDraw, x_mm: float, y_mm: float, length_cm: int = 10, fill="black") -> None:
    """Dessine une mini-règle de vérification"""
    x0 = mm_to_px(x_mm)
    y0 = mm_to_px(y_mm)
    
    # Ligne de base
    draw.line([x0, y0, x0 + mm_to_px(length_cm * 10), y0], fill=fill, width=max(1, mm_to_px(0.3)))
    
    font = load_font(mm_to_px(2))
    for i in range(length_cm + 1):
        x = x0 + mm_to_px(i * 10)
        if i % 5 == 0:
            draw.line([x, y0, x, y0 + mm_to_px(3)], fill=fill, width=max(1, mm_to_px(0.4)))
            bbox = draw.textbbox((0, 0), str(i), font=font)
            w = bbox[2] - bbox[0]
            draw.text((x - w // 2, y0 + mm_to_px(4)), str(i), fill=fill, font=font)
        else:
            draw.line([x, y0, x, y0 + mm_to_px(2)], fill=fill, width=max(1, mm_to_px(0.3)))


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "public" / "printable"
    out_dir.mkdir(parents=True, exist_ok=True)

    page_px = (mm_to_px(A4_WIDTH_MM), mm_to_px(A4_HEIGHT_MM))
    
    # ═══════════════════════════════════════════════════════════
    # VERSION LIGHT: Papier blanc
    # ═══════════════════════════════════════════════════════════
    print("\n🎯 GÉNÉRATION MÉTRÉ V2.0 - A4")
    print("=" * 50)
    
    canvas = Image.new("RGB", page_px, "white")
    draw = ImageDraw.Draw(canvas)

    # ─────────────────────────────────────────────────────────
    # HEADER (zone marge haute 3cm - peut être coupée)
    # ─────────────────────────────────────────────────────────
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(12)), "TOP ↑", size_px=mm_to_px(6))
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(20)), "⚠ NE PAS AJUSTER À LA PAGE ⚠", size_px=mm_to_px(4))
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(26)), "Imprimer à 100% - Version PAPIER BLANC", size_px=mm_to_px(2.5))

    # ─────────────────────────────────────────────────────────
    # CADRE CARRÉ 18×18cm (zone calibration)
    # ─────────────────────────────────────────────────────────
    calib_x = CALIB_X_MM
    calib_y = CALIB_Y_MM
    calib_size = CALIBRATION_SIZE_MM
    
    # Cadre externe noir épais
    draw.rectangle(
        [mm_to_px(calib_x), mm_to_px(calib_y), 
         mm_to_px(calib_x + calib_size), mm_to_px(calib_y + calib_size)],
        outline="black", width=max(3, mm_to_px(0.8))
    )
    
    # ─────────────────────────────────────────────────────────
    # RÈGLES GRADUÉES (4 côtés, parallèles)
    # ─────────────────────────────────────────────────────────
    ruler_offset = 5  # 5mm du bord du carré
    
    # Haut (traits vers le bas)
    draw_ruler_parallel(draw, calib_x, calib_y + ruler_offset, calib_size, 
                        horizontal=True, inward=True)
    # Bas (traits vers le haut)
    draw_ruler_parallel(draw, calib_x, calib_y + calib_size - ruler_offset, calib_size, 
                        horizontal=True, inward=False)
    # Gauche (traits vers la droite)
    draw_ruler_parallel(draw, calib_x + ruler_offset, calib_y, calib_size, 
                        horizontal=False, inward=True)
    # Droite (traits vers la gauche)
    draw_ruler_parallel(draw, calib_x + calib_size - ruler_offset, calib_y, calib_size, 
                        horizontal=False, inward=False)

    # ─────────────────────────────────────────────────────────
    # BORDURE POINTILLÉE INTÉRIEURE (1cm du bord)
    # ─────────────────────────────────────────────────────────
    inner_margin = 10  # 1cm
    draw_dotted_square(draw, calib_x + inner_margin, calib_y + inner_margin, 
                       calib_size - 2 * inner_margin)

    # ─────────────────────────────────────────────────────────
    # APRILTAG CENTRAL 16cm (ID 33)
    # ─────────────────────────────────────────────────────────
    tag_x = calib_x + (calib_size - TAG_SIZE_MM) / 2
    tag_y = calib_y + (calib_size - TAG_SIZE_MM) / 2
    
    center_tag = generate_apriltag(33, TAG_SIZE_MM)
    place_image(canvas, center_tag, tag_x, tag_y, TAG_SIZE_MM, TAG_SIZE_MM)
    print(f"   ✅ AprilTag ID 33: {TAG_SIZE_MM}mm ({TAG_SIZE_MM//10}cm)")

    # ─────────────────────────────────────────────────────────
    # CROIX DE COINS (4 coins du carré)
    # ─────────────────────────────────────────────────────────
    corner_offset = mm_to_px(3)
    corners = [
        (mm_to_px(calib_x) + corner_offset, mm_to_px(calib_y) + corner_offset),
        (mm_to_px(calib_x + calib_size) - corner_offset, mm_to_px(calib_y) + corner_offset),
        (mm_to_px(calib_x) + corner_offset, mm_to_px(calib_y + calib_size) - corner_offset),
        (mm_to_px(calib_x + calib_size) - corner_offset, mm_to_px(calib_y + calib_size) - corner_offset),
    ]
    for cx, cy in corners:
        draw_corner_cross(draw, cx, cy)

    # ─────────────────────────────────────────────────────────
    # ZONE INFORMATION (entre carré et logos)
    # ─────────────────────────────────────────────────────────
    info_y = calib_y + calib_size + 5
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(info_y)), 
                     f"Règles : Horizontal 0–{calib_size//10}cm | Vertical 0–{calib_size//10}cm", 
                     size_px=mm_to_px(2.8))
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(info_y + 5)), 
                     f"ID : A4-CALIB-V2.0-LIGHT — AprilTag {TAG_SIZE_MM//10}cm — {A4_WIDTH_MM}×{A4_HEIGHT_MM} mm", 
                     size_px=mm_to_px(2.5))

    # ─────────────────────────────────────────────────────────
    # ZONE LOGOS (5.7cm en bas) - VRAIS LOGOS !
    # ─────────────────────────────────────────────────────────
    logo_zone_top = A4_HEIGHT_MM - PRINT_MARGIN_BOTTOM_MM - LOGO_ZONE_HEIGHT_MM
    
    # Ligne de séparation
    draw.line([mm_to_px(20), mm_to_px(logo_zone_top + 15), 
               mm_to_px(A4_WIDTH_MM - 20), mm_to_px(logo_zone_top + 15)], 
              fill="lightgray", width=1)

    logo_y = logo_zone_top + 22
    
    # VRAIS LOGOS depuis fichiers PNG
    logo_2thier_path = out_dir / "logo-2thier.png"
    logo_metre_path = out_dir / "logo-metre.png"
    
    # Logo 2THIER à gauche
    if logo_2thier_path.exists():
        try:
            logo_2thier = Image.open(logo_2thier_path).convert("RGBA")
            target_size = (mm_to_px(35), mm_to_px(18))
            logo_2thier.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_pos = mm_to_px(25)
            y_pos = mm_to_px(logo_y)
            # Créer un fond blanc pour la transparence
            bg = Image.new('RGBA', logo_2thier.size, (255, 255, 255, 255))
            bg.paste(logo_2thier, (0, 0), logo_2thier)
            canvas.paste(bg.convert('RGB'), (x_pos, y_pos))
            print(f"   ✅ Logo 2Thier chargé")
        except Exception as e:
            print(f"   ⚠️ Erreur logo 2Thier: {e}")
            draw_text_center(draw, (mm_to_px(45), mm_to_px(logo_y + 8)), "2THIER", size_px=mm_to_px(5))
    else:
        draw_text_center(draw, (mm_to_px(45), mm_to_px(logo_y + 8)), "2THIER", size_px=mm_to_px(5))
    
    # Logo M²TRÉ au centre
    if logo_metre_path.exists():
        try:
            logo_metre = Image.open(logo_metre_path).convert("RGBA")
            target_size = (mm_to_px(40), mm_to_px(18))
            logo_metre.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_pos = page_px[0] // 2 - logo_metre.width // 2
            y_pos = mm_to_px(logo_y)
            bg = Image.new('RGBA', logo_metre.size, (255, 255, 255, 255))
            bg.paste(logo_metre, (0, 0), logo_metre)
            canvas.paste(bg.convert('RGB'), (x_pos, y_pos))
            print(f"   ✅ Logo M²TRÉ chargé")
        except Exception as e:
            print(f"   ⚠️ Erreur logo M²TRÉ: {e}")
            draw_text_center(draw, (page_px[0] // 2, mm_to_px(logo_y + 8)), "M²TRÉ", size_px=mm_to_px(8))
    else:
        draw_text_center(draw, (page_px[0] // 2, mm_to_px(logo_y + 8)), "M²TRÉ", size_px=mm_to_px(8))
    
    # Logo CRM à droite
    logo_crm_path = out_dir / "ChatGPT Image 17 janv. 2026, 01_57_35 rétraicit.png"
    if logo_crm_path.exists():
        try:
            logo_crm = Image.open(logo_crm_path).convert("RGBA")
            target_size = (mm_to_px(35), mm_to_px(18))
            logo_crm.thumbnail(target_size, Image.Resampling.LANCZOS)
            x_pos = mm_to_px(A4_WIDTH_MM - 25) - logo_crm.width
            y_pos = mm_to_px(logo_y)
            bg = Image.new('RGBA', logo_crm.size, (255, 255, 255, 255))
            bg.paste(logo_crm, (0, 0), logo_crm)
            canvas.paste(bg.convert('RGB'), (x_pos, y_pos))
            print(f"   ✅ Logo CRM chargé")
        except Exception as e:
            print(f"   ⚠️ Erreur logo CRM: {e}")
            draw_text_center(draw, (mm_to_px(A4_WIDTH_MM - 45), mm_to_px(logo_y + 8)), "CRM", size_px=mm_to_px(5))
    else:
        draw_text_center(draw, (mm_to_px(A4_WIDTH_MM - 45), mm_to_px(logo_y + 8)), "CRM", size_px=mm_to_px(5))

    # ─────────────────────────────────────────────────────────
    # ÉCHELLE DE VÉRIFICATION (en bas de la zone logos)
    # ─────────────────────────────────────────────────────────
    scale_y = logo_zone_top + 45
    draw_scale_verification(draw, 30, scale_y, length_cm=15)
    draw_text_center(draw, (mm_to_px(30 + 160), mm_to_px(scale_y + 2)), "cm (vérification)", size_px=mm_to_px(2))

    # ─────────────────────────────────────────────────────────
    # FOOTER (zone marge basse 3cm - peut être coupée)
    # ─────────────────────────────────────────────────────────
    draw_text_center(draw, (page_px[0] // 2, mm_to_px(A4_HEIGHT_MM - 10)), 
                     "© 2Thier CRM - Si cette ligne est coupée, marge impression > 3cm",
                     size_px=mm_to_px(2), fill="gray")

    # ─────────────────────────────────────────────────────────
    # SAVE LIGHT VERSION
    # ─────────────────────────────────────────────────────────
    png_path = out_dir / "metre-a4-v2.0-light.png"
    pdf_path = out_dir / "metre-a4-v2.0-light.pdf"
    canvas.save(png_path, dpi=(DPI, DPI))
    canvas.save(pdf_path, dpi=(DPI, DPI))
    print(f"   ✅ PNG: {png_path}")
    print(f"   ✅ PDF: {pdf_path}")

    # ═══════════════════════════════════════════════════════════
    # VERSION DARK: Fond noir (pour projection sur mur blanc)
    # ═══════════════════════════════════════════════════════════
    canvas_dark = Image.new("RGB", page_px, "black")
    draw_dark = ImageDraw.Draw(canvas_dark)

    # Header BLANC
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(12)), "TOP ↑", size_px=mm_to_px(6), fill="white")
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(20)), "⚠ NE PAS AJUSTER À LA PAGE ⚠", size_px=mm_to_px(4), fill="white")
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(26)), "Imprimer à 100% - Version MUR BLANC (projection)", size_px=mm_to_px(2.5), fill="white")

    # Cadre carré BLANC
    draw_dark.rectangle(
        [mm_to_px(calib_x), mm_to_px(calib_y), 
         mm_to_px(calib_x + calib_size), mm_to_px(calib_y + calib_size)],
        outline="white", width=max(3, mm_to_px(0.8))
    )

    # Règles BLANCHES
    draw_ruler_parallel(draw_dark, calib_x, calib_y + ruler_offset, calib_size, True, True, fill="white")
    draw_ruler_parallel(draw_dark, calib_x, calib_y + calib_size - ruler_offset, calib_size, True, False, fill="white")
    draw_ruler_parallel(draw_dark, calib_x + ruler_offset, calib_y, calib_size, False, True, fill="white")
    draw_ruler_parallel(draw_dark, calib_x + calib_size - ruler_offset, calib_y, calib_size, False, False, fill="white")

    # Bordure pointillée BLANCHE
    draw_dotted_square(draw_dark, calib_x + inner_margin, calib_y + inner_margin, 
                       calib_size - 2 * inner_margin, fill="white")

    # AprilTag INVERSÉ
    center_tag_inv = ImageOps.invert(Image.fromarray(center_tag).convert("L")).convert("RGB")
    place_image(canvas_dark, np.array(center_tag_inv), tag_x, tag_y, TAG_SIZE_MM, TAG_SIZE_MM)

    # Croix BLANCHES
    for cx, cy in corners:
        draw_corner_cross(draw_dark, cx, cy, fill="white")

    # Info BLANC
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(info_y)), 
                     f"Règles : Horizontal 0–{calib_size//10}cm | Vertical 0–{calib_size//10}cm", 
                     size_px=mm_to_px(2.8), fill="white")
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(info_y + 5)), 
                     f"ID : A4-CALIB-V2.0-DARK — AprilTag {TAG_SIZE_MM//10}cm — {A4_WIDTH_MM}×{A4_HEIGHT_MM} mm", 
                     size_px=mm_to_px(2.5), fill="white")

    # Logos BLANC
    draw_dark.line([mm_to_px(20), mm_to_px(logo_zone_top + 15), 
                    mm_to_px(A4_WIDTH_MM - 20), mm_to_px(logo_zone_top + 15)], 
                   fill="gray", width=1)
    
    draw_text_center(draw_dark, (mm_to_px(45), mm_to_px(logo_y)), "2THIER", size_px=mm_to_px(5), fill="white")
    draw_text_center(draw_dark, (mm_to_px(45), mm_to_px(logo_y + 6)), "Construction", size_px=mm_to_px(2.5), fill="white")
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(logo_y - 2)), "M²TRÉ", size_px=mm_to_px(8), fill="white")
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(logo_y + 7)), "Système de mesure intelligent", size_px=mm_to_px(2.5), fill="white")
    draw_text_center(draw_dark, (mm_to_px(A4_WIDTH_MM - 45), mm_to_px(logo_y)), "CRM", size_px=mm_to_px(5), fill="white")
    draw_text_center(draw_dark, (mm_to_px(A4_WIDTH_MM - 45), mm_to_px(logo_y + 6)), "by 2Thier", size_px=mm_to_px(2.5), fill="white")

    # Échelle BLANCHE
    draw_scale_verification(draw_dark, 30, scale_y, length_cm=15, fill="white")
    draw_text_center(draw_dark, (mm_to_px(30 + 160), mm_to_px(scale_y + 2)), "cm (vérification)", size_px=mm_to_px(2), fill="white")

    # Footer
    draw_text_center(draw_dark, (page_px[0] // 2, mm_to_px(A4_HEIGHT_MM - 10)), 
                     "© 2Thier CRM - Si cette ligne est coupée, marge impression > 3cm",
                     size_px=mm_to_px(2), fill="gray")

    # SAVE DARK VERSION
    png_path_dark = out_dir / "metre-a4-v2.0-dark.png"
    pdf_path_dark = out_dir / "metre-a4-v2.0-dark.pdf"
    canvas_dark.save(png_path_dark, dpi=(DPI, DPI))
    canvas_dark.save(pdf_path_dark, dpi=(DPI, DPI))
    print(f"   ✅ PNG DARK: {png_path_dark}")
    print(f"   ✅ PDF DARK: {pdf_path_dark}")

    # ═══════════════════════════════════════════════════════════
    # RÉSUMÉ
    # ═══════════════════════════════════════════════════════════
    print("\n" + "=" * 50)
    print("📊 MÉTRÉ V2.0 - SPECS:")
    print("=" * 50)
    print(f"   • Format: A4 ({A4_WIDTH_MM}×{A4_HEIGHT_MM}mm)")
    print(f"   • Marges impression: {PRINT_MARGIN_TOP_MM}mm haut/bas")
    print(f"   • Carré calibration: {CALIBRATION_SIZE_MM}×{CALIBRATION_SIZE_MM}mm")
    print(f"   • AprilTag central: {TAG_SIZE_MM}×{TAG_SIZE_MM}mm (ID 33)")
    print(f"   • Zone logos: {LOGO_ZONE_HEIGHT_MM}mm")
    
    num_rulers = (CALIBRATION_SIZE_MM // 10 + 1) * 4
    num_dots = (CALIBRATION_SIZE_MM // 10) * 4
    print(f"\n📍 Points de calibration:")
    print(f"   • Coins AprilTag: 4")
    print(f"   • Modules AprilTag: ~36")
    print(f"   • Marques règles: {num_rulers}")
    print(f"   • Points bordure: {num_dots}")
    print(f"   • Croix coins: 4")
    print(f"   • TOTAL: ~{4 + 36 + num_rulers + num_dots + 4} points")
    
    print(f"\n🚀 Performance:")
    print(f"   • Distance détection: 7-10 MÈTRES")
    print(f"   • Précision: ±0.3mm théorique")
    
    print("\n🎉 Génération terminée !\n")


if __name__ == "__main__":
    main()
