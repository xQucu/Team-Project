#!/usr/bin/env python
"""Script to list available Gemini models."""
import requests
import os
from pathlib import Path

# Find .env file in project root
env_path = Path(__file__).parent / ".env"
api_key = None

if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("GEMINI_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
            break

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env file")
    exit(1)

url = "https://generativelanguage.googleapis.com/v1beta/models"
params = {"key": api_key}

response = requests.get(url, params=params)
if response.status_code != 200:
    print(f"Error: {response.status_code} - {response.text}")
    exit(1)

data = response.json()
print("Available models:\n")
for m in data.get("models", []):
    print(f"{m['name']}")
    print(f"  Methods: {m.get('supportedGenerationMethods', [])}")
    print(f"  Input limit: {m.get('inputTokenLimit', 'N/A')}")
    print(f"  Output limit: {m.get('outputTokenLimit', 'N/A')}")
    print()