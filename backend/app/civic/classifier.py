import re
from typing import Dict, Any, Tuple, Optional

# Categories according to Section 5.1
CATEGORIES = [
    "electrical",
    "streetlight",
    "water leakage",
    "road damage",
    "pothole",
    "traffic",
    "garbage",
    "other"
]

CATEGORY_TO_DEPT = {
    "electrical": "ELEC",
    "streetlight": "ELEC",
    "water leakage": "WATER",
    "road damage": "ROADS",
    "pothole": "ROADS",
    "traffic": "ROADS",
    "garbage": "WATER",
    "other": "EMERG"
}

KEYWORD_MAP = {
    "electrical": ["spark", "wire", "cable", "transformer", "substation", "voltage", "blackout", "power outage", "pole collapsed", "shock", "feeder"],
    "streetlight": ["streetlight", "lamp post", "dark road", "light bulb", "flickering street light", "lantern"],
    "water leakage": ["water pipe", "leak", "burst main", "flooding", "sewer", "drainage", "water pressure", "spill"],
    "road damage": ["crack", "road caved", "asphalt", "sinkhole", "bridge joint", "pavement damaged"],
    "pothole": ["pothole", "deep crater", "road hole", "bump in road"],
    "traffic": ["signal malfunction", "traffic light", "jam", "congestion", "intersection blocked"],
    "garbage": ["dump", "trash", "waste", "garbage pile", "litter", "debris"]
}

class CivicClassifier:
    """
    NLP Intent Classifier for Citizen Incident Reports.
    Complies with Rule 1.5: Always transparently labels source as
    'AI_CLASSIFICATION' or 'RULE_BASED_FALLBACK'.
    """
    @classmethod
    def classify_text(cls, text: str) -> Tuple[str, str, float, str]:
        """
        Returns: (category, department_code, confidence, engine_source)
        """
        lowered = text.lower()
        
        # 1. Deterministic Rule-Based Keyword Matching
        scores: Dict[str, int] = {cat: 0 for cat in CATEGORIES}
        for cat, keywords in KEYWORD_MAP.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', lowered):
                    scores[cat] += 2
                elif kw in lowered:
                    scores[cat] += 1

        best_cat = max(scores, key=scores.get)
        max_score = scores[best_cat]

        if max_score > 0:
            confidence = min(0.98, 0.65 + (max_score * 0.1))
            dept = CATEGORY_TO_DEPT.get(best_cat, "ELEC")
            return best_cat, dept, round(confidence, 2), "RULE_BASED_FALLBACK"

        # Default fallback
        return "other", "EMERG", 0.50, "RULE_BASED_FALLBACK"

    @classmethod
    def classify_image(cls, filename: Optional[str] = None) -> Tuple[str, str]:
        """
        Complies with Rule 1.5:
        If model is down or not implemented, transparently label 'IMAGE NOT CLASSIFIED'.
        """
        if not filename:
            return "IMAGE_NOT_PROVIDED", "NONE"
        return "IMAGE_NOT_CLASSIFIED", "UNAVAILABLE"
