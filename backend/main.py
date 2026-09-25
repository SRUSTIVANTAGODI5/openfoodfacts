from io import BytesIO

import cv2
import numpy as np
import requests
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pyzbar.pyzbar import decode


app = FastAPI(
    title="OpenFood Scanner API",
    description="Backend API for scanning food product barcodes and retrieving Open Food Facts data.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v3/product"

HEADERS = {
    "User-Agent": "OpenFoodScannerStudentApp/1.0"
}


def detect_barcode(image_bytes: bytes):
    try:
        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")

        image_array = np.array(image)

        opencv_image = cv2.cvtColor(
            image_array,
            cv2.COLOR_RGB2BGR
        )

        barcodes = decode(opencv_image)

        if not barcodes:
            gray = cv2.cvtColor(
                opencv_image,
                cv2.COLOR_BGR2GRAY
            )

            gray = cv2.resize(
                gray,
                None,
                fx=2,
                fy=2,
                interpolation=cv2.INTER_CUBIC
            )

            barcodes = decode(gray)

        if not barcodes:
            return None

        barcode_data = barcodes[0].data.decode(
            "utf-8",
            errors="ignore"
        ).strip()

        return barcode_data

    except Exception:
        return None


def translate_to_english(text: str, source_language: str = "en"):
    """
    Translate text to English.

    source_language must be a two-letter language code,
    such as fr, en, de, it, es, etc.
    """

    if not text:
        return "Not available"

    text = str(text).strip()

    if not text:
        return "Not available"

    source_language = (
        str(source_language or "en")
        .strip()
        .lower()
    )

    # Open Food Facts can sometimes provide values
    # such as "fr-FR". MyMemory accepts the language code.
    if "-" in source_language:
        source_language = source_language.split(
            "-"
        )[0]

    # Do not translate if the source is already English.
    if source_language == "en":
        return text

    try:
        url = (
            "https://api.mymemory.translated.net/get"
        )

        response = requests.get(
            url,
            params={
                "q": text,
                "langpair": (
                    f"{source_language}|en"
                ),
            },
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        translated_text = (
            data.get("responseData", {})
            .get("translatedText")
        )

        if translated_text:
            return translated_text.strip()

        return text

    except Exception:
        return text


def get_product_from_open_food_facts(
    barcode: str
):
    url = f"{OPEN_FOOD_FACTS_URL}/{barcode}"

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=15,
            params={
                "product_type": "food",
                "lc": "en",
                "cc": "in",
                "tags_lc": "en"
            }
        )

        if response.status_code == 404:
            return None, (
                "Product not found in Open Food Facts."
            )

        response.raise_for_status()

        data = response.json()

        product = data.get("product")

        if not product:
            return None, (
                "Product data is not available."
            )

        return product, None

    except requests.Timeout:
        return None, (
            "Open Food Facts took too long to respond."
        )

    except requests.RequestException:
        return None, (
            "Could not connect to Open Food Facts."
        )

    except ValueError:
        return None, (
            "Open Food Facts returned an invalid response."
        )


def clean_tag(tag: str):
    """
    Convert Open Food Facts tags into readable English text.

    Examples:

    en:breakfast-foods
    -> Breakfast foods

    en:spreads
    -> Spreads
    """

    if not tag:
        return ""

    tag = str(tag).strip()

    if ":" in tag:
        language, value = tag.split(
            ":",
            1
        )

        if language.lower() == "en":
            tag = value
        else:
            # Do not display non-English tags.
            return ""

    tag = tag.replace(
        "-",
        " "
    )

    tag = tag.replace(
        "_",
        " "
    )

    tag = " ".join(
        tag.split()
    )

    if tag:
        tag = (
            tag[0].upper()
            + tag[1:]
        )

    return tag


def format_categories(product: dict):
    """
    Return only English categories.

    Open Food Facts may return category tags
    in several languages. We only display
    English tags.
    """

    english_categories = product.get(
        "categories_tags_en"
    )

    if isinstance(
        english_categories,
        list
    ):
        cleaned = []

        for category in english_categories:
            value = clean_tag(category)

            if value and value not in cleaned:
                cleaned.append(value)

        if cleaned:
            return ", ".join(cleaned)

    categories_tags = product.get(
        "categories_tags"
    )

    if isinstance(
        categories_tags,
        list
    ):
        cleaned = []

        for category in categories_tags:
            category = str(category).strip()

            # Only accept explicitly English tags.
            if not category.lower().startswith(
                "en:"
            ):
                continue

            value = clean_tag(category)

            if value and value not in cleaned:
                cleaned.append(value)

        if cleaned:
            return ", ".join(cleaned)

    return "Not available"


def clean_allergen_tag(tag: str):
    """
    Convert an allergen tag into English text.

    Examples:

    en:milk
    -> Milk

    en:nuts
    -> Nuts
    """

    if not tag:
        return ""

    tag = str(tag).strip()

    if ":" in tag:
        language, value = tag.split(
            ":",
            1
        )

        if language.lower() != "en":
            return ""

        tag = value

    tag = tag.replace(
        "-",
        " "
    )

    tag = tag.replace(
        "_",
        " "
    )

    tag = " ".join(
        tag.split()
    )

    if tag:
        tag = (
            tag[0].upper()
            + tag[1:]
        )

    return tag


def format_allergens(product: dict):
    """
    Prefer English allergen information
    provided by Open Food Facts.
    """

    allergens_tags_en = product.get(
        "allergens_tags_en"
    )

    if isinstance(
        allergens_tags_en,
        list
    ):
        cleaned = []

        for item in allergens_tags_en:
            value = clean_allergen_tag(item)

            if value and value not in cleaned:
                cleaned.append(value)

        if cleaned:
            return ", ".join(cleaned)

    allergens_en = product.get(
        "allergens_en"
    )

    if allergens_en:
        if isinstance(
            allergens_en,
            list
        ):
            cleaned = []

            for item in allergens_en:
                value = str(item).strip()

                if value and value not in cleaned:
                    cleaned.append(value)

            if cleaned:
                return ", ".join(cleaned)

        return str(allergens_en)

    allergens_tags = product.get(
        "allergens_tags"
    )

    if isinstance(
        allergens_tags,
        list
    ):
        cleaned = []

        for item in allergens_tags:
            value = clean_allergen_tag(item)

            if value and value not in cleaned:
                cleaned.append(value)

        if cleaned:
            return ", ".join(cleaned)

    return "Not available"


def format_product(product: dict):
    nutriments = (
        product.get("nutriments")
        or {}
    )

    # -----------------------------
    # PRODUCT NAME
    # -----------------------------

    product_name = (
        product.get("product_name_en")
        or product.get("product_name")
        or "Unknown Product"
    )

    # -----------------------------
    # INGREDIENTS
    # -----------------------------

    english_ingredients = product.get(
        "ingredients_text_en"
    )

    original_ingredients = product.get(
        "ingredients_text"
    )

    if english_ingredients:
        ingredients = english_ingredients

    elif original_ingredients:
        ingredient_language = product.get(
            "ingredients_lc"
        ) or "en"

        ingredients = translate_to_english(
            original_ingredients,
            ingredient_language
        )

    else:
        ingredients = "Not available"

    # -----------------------------
    # ALLERGENS
    # -----------------------------

    allergens = format_allergens(
        product
    )

    # If Open Food Facts did not provide
    # English allergen tags, use the raw
    # allergen text and its language.
    if allergens == "Not available":

        original_allergens = product.get(
            "allergens"
        )

        if original_allergens:

            if isinstance(
                original_allergens,
                list
            ):
                original_allergens = ", ".join(
                    str(item)
                    for item in original_allergens
                )

            allergen_language = product.get(
                "allergens_lc"
            ) or product.get(
                "ingredients_lc"
            ) or "en"

            allergens = translate_to_english(
                original_allergens,
                allergen_language
            )

    # -----------------------------
    # CATEGORIES
    # -----------------------------

    categories = format_categories(
        product
    )

    # -----------------------------
    # NUTRITION
    # -----------------------------

    nutrition = {
        "energy_kcal": nutriments.get(
            "energy-kcal_100g"
        ),
        "fat": nutriments.get(
            "fat_100g"
        ),
        "saturated_fat": nutriments.get(
            "saturated-fat_100g"
        ),
        "carbohydrates": nutriments.get(
            "carbohydrates_100g"
        ),
        "sugars": nutriments.get(
            "sugars_100g"
        ),
        "fiber": nutriments.get(
            "fiber_100g"
        ),
        "proteins": nutriments.get(
            "proteins_100g"
        ),
        "salt": nutriments.get(
            "salt_100g"
        ),
        "sodium": nutriments.get(
            "sodium_100g"
        ),
    }

    # -----------------------------
    # NUTRI-SCORE
    # -----------------------------

    nutriscore = (
        product.get(
            "nutriscore_grade"
        )
        or product.get(
            "nutrition_grades"
        )
        or (
            product.get(
                "nutriscore_data"
            )
            or {}
        ).get("grade")
        or "N/A"
    )

    # -----------------------------
    # FINAL PRODUCT
    # -----------------------------

    return {
        "name": product_name,

        "brand": (
            product.get("brands")
            or "Not available"
        ),

        "quantity": (
            product.get("quantity")
            or "Not available"
        ),

        "image": (
            product.get("image_front_url")
            or product.get("image_url")
        ),

        "ingredients": ingredients,

        "allergens": allergens,

        "categories": categories,

        "nutriscore": nutriscore,

        "nova_group": (
            product.get("nova_group")
            or "N/A"
        ),

        "nutrition": nutrition,
    }


@app.get("/")
def root():
    return {
        "message": (
            "OpenFood Scanner API is running!"
        )
    }


@app.get("/product/{barcode}")
def get_product(barcode: str):
    barcode = barcode.strip()

    if not barcode:
        return {
            "success": False,
            "message": "Barcode is required."
        }

    if not barcode.isdigit():
        return {
            "success": False,
            "message": (
                "Barcode must contain numbers only."
            )
        }

    if (
        len(barcode) < 8
        or len(barcode) > 14
    ):
        return {
            "success": False,
            "message": (
                "Barcode must contain 8 to 14 digits."
            )
        }

    product, error = (
        get_product_from_open_food_facts(
            barcode
        )
    )

    if error:
        return {
            "success": False,
            "barcode": barcode,
            "message": error,
        }

    return {
        "success": True,
        "barcode": barcode,
        "product": format_product(
            product
        ),
    }


@app.post("/upload")
async def upload_product_image(
    file: UploadFile = File(...)
):
    if not file.content_type:
        return {
            "success": False,
            "message": "Invalid file."
        }

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
    }

    if file.content_type not in allowed_types:
        return {
            "success": False,
            "message": (
                "Please upload a JPG or PNG image."
            )
        }

    image_bytes = await file.read()

    if not image_bytes:
        return {
            "success": False,
            "message": (
                "The uploaded image is empty."
            )
        }

    barcode = detect_barcode(
        image_bytes
    )

    if not barcode:
        return {
            "success": False,
            "message": (
                "No barcode could be detected. "
                "Please upload a clearer barcode image."
            ),
        }

    product, error = (
        get_product_from_open_food_facts(
            barcode
        )
    )

    if error:
        return {
            "success": False,
            "barcode": barcode,
            "message": error,
        }

    return {
        "success": True,
        "barcode": barcode,
        "product": format_product(
            product
        ),
    }