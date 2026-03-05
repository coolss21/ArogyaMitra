"""Grocery list router — derives shopping list from active nutrition plan."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.models import User, NutritionPlan

router = APIRouter(prefix="/grocery", tags=["grocery"])

# Category keywords for grouping
CATEGORY_MAP = {
    "Produce": [
        "spinach", "broccoli", "tomato", "onion", "garlic", "ginger", "potato",
        "carrot", "lettuce", "cucumber", "capsicum", "pepper", "avocado", "banana",
        "apple", "orange", "lemon", "lime", "mango", "berry", "berries", "strawberry",
        "blueberry", "grape", "papaya", "watermelon", "pineapple", "kiwi", "cabbage",
        "cauliflower", "zucchini", "mushroom", "peas", "beans", "corn", "celery",
        "beetroot", "radish", "eggplant", "okra", "pumpkin", "sweet potato",
        "green beans", "asparagus", "kale", "mint", "coriander", "cilantro",
        "parsley", "basil", "curry leaves", "methi", "palak", "lauki", "tinda",
        "bhindi", "gobi", "aloo", "pyaaz", "tamatar", "fruit", "vegetable", "salad",
    ],
    "Protein": [
        "chicken", "fish", "egg", "paneer", "tofu", "mutton", "lamb", "shrimp",
        "prawn", "salmon", "tuna", "turkey", "beef", "pork", "soya", "soy chunk",
        "tempeh", "whey", "protein powder", "cottage cheese", "dal", "lentil",
        "rajma", "chana", "chickpea", "moong", "urad", "masoor", "toor",
        "kidney bean", "black bean", "edamame", "meat", "seafood",
    ],
    "Dairy": [
        "milk", "yogurt", "curd", "dahi", "cheese", "butter", "ghee", "cream",
        "buttermilk", "chaas", "lassi", "whipped cream", "mozzarella",
        "parmesan", "ricotta", "kefir",
    ],
    "Grains": [
        "rice", "wheat", "oats", "bread", "roti", "chapati", "naan", "pasta",
        "noodle", "quinoa", "millet", "jowar", "bajra", "ragi", "barley",
        "semolina", "sooji", "rava", "poha", "muesli", "cereal", "tortilla",
        "couscous", "bulgur", "flour", "atta", "maida", "besan",
    ],
    "Spices & Condiments": [
        "turmeric", "cumin", "cinnamon", "cardamom", "clove", "mustard",
        "coriander powder", "chili", "paprika", "oregano", "thyme", "rosemary",
        "bay leaf", "nutmeg", "saffron", "fennel", "fenugreek", "asafoetida",
        "salt", "pepper", "vinegar", "soy sauce", "ketchup", "mayonnaise",
        "honey", "maple syrup", "jaggery", "sugar", "coconut oil", "olive oil",
        "sesame oil", "mustard oil", "oil", "sauce", "chutney", "pickle",
        "jam", "peanut butter", "almond butter", "tahini",
    ],
    "Nuts & Seeds": [
        "almond", "walnut", "cashew", "peanut", "pistachio", "hazelnut",
        "flaxseed", "chia seed", "sunflower seed", "pumpkin seed", "sesame",
        "coconut", "dried fruit", "raisin", "date", "fig", "apricot",
        "trail mix", "mixed nuts",
    ],
}


def _categorize_item(item_name: str) -> str:
    """Assign a grocery item to a category based on keyword matching."""
    lower = item_name.lower()
    for category, keywords in CATEGORY_MAP.items():
        for kw in keywords:
            if kw in lower:
                return category
    return "Other"


def _extract_grocery_items(plan_data: dict) -> list[dict]:
    """Extract and deduplicate ingredients from all meals in the plan."""
    seen = set()
    items = []

    for day in plan_data.get("days", []):
        meals = day.get("meals", {})
        for meal_type in ["breakfast", "lunch", "dinner", "snacks"]:
            meal = meals.get(meal_type)
            if not meal:
                continue
            meal_list = meal if isinstance(meal, list) else [meal]
            for m in meal_list:
                # Use meal name as the item if no ingredients list
                ingredients = m.get("ingredients", [])
                if not ingredients:
                    name = m.get("name", "")
                    if name and name.lower() not in seen:
                        seen.add(name.lower())
                        items.append({
                            "name": name,
                            "category": _categorize_item(name),
                            "from_meal": meal_type,
                        })
                else:
                    for ing in ingredients:
                        ing_name = ing if isinstance(ing, str) else ing.get("name", str(ing))
                        if ing_name and ing_name.lower() not in seen:
                            seen.add(ing_name.lower())
                            items.append({
                                "name": ing_name,
                                "category": _categorize_item(ing_name),
                                "from_meal": meal_type,
                            })

    return items


@router.get("/list")
async def get_grocery_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a categorized grocery list from the active nutrition plan."""
    plan = (
        db.query(NutritionPlan)
        .filter(NutritionPlan.user_id == current_user.id, NutritionPlan.is_active == True)
        .order_by(NutritionPlan.created_at.desc())
        .first()
    )
    if not plan or not plan.plan_data:
        raise HTTPException(status_code=404, detail="No active nutrition plan found. Generate one first.")

    items = _extract_grocery_items(plan.plan_data)

    # Group by category
    grouped: dict[str, list[dict]] = {}
    for item in items:
        cat = item["category"]
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({"name": item["name"], "from_meal": item["from_meal"]})

    # Sort categories in a nice order
    order = ["Produce", "Protein", "Dairy", "Grains", "Nuts & Seeds", "Spices & Condiments", "Other"]
    sorted_groups = []
    for cat in order:
        if cat in grouped:
            sorted_groups.append({"category": cat, "items": grouped[cat]})

    return {
        "plan_name": plan.plan_data.get("plan_name", "Nutrition Plan"),
        "total_items": len(items),
        "categories": sorted_groups,
    }
