import re
import json


def parse_gemini_response(text: str) -> dict:
    """Parse Gemini response to extract JSON with user data."""
    # Try to find JSON in the response
    try:
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass

    # Try finding JSON array with modifications
    try:
        matches = re.findall(r"\[[\s\S]*\]", text)
        for match in matches:
            try:
                parsed = json.loads(match)
                if isinstance(parsed, list) and len(parsed) > 0:
                    return {"reply": text, "modifications": parsed}
            except:
                continue
    except:
        pass

    # Fallback: check if there's a standalone number that could be data
    numbers = re.findall(r'\b(\d{1,3})\b', text)
    if numbers and len(numbers) == 1:
        num = int(numbers[0])
        if 10 <= num <= 150:
            return {"reply": text, "extracted": {"age": num}, "complete": False}

    return {"reply": text, "extracted": {}, "complete": False}


def extract_numbers_from_text(text: str) -> list:
    """Extract all numbers from text."""
    return re.findall(r'\b(\d+)\b', text)