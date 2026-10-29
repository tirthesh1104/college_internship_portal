import os
import re

# Search for API keys in frontend and backend
patterns = [r'sk-ant', r'sk_ant', r'gsk_', r'AI_API_KEY', r'ANTHROPIC_KEY', r'GEMINI_API_KEY', r'GROQ_API_KEY']

print("=== SEARCHING FOR API KEYS ===")
found_any = False
for root, dirs, files in os.walk('C:/Users/Lenovo/Desktop/ipts'):
    # Skip node_modules
    if 'node_modules' in root.split(os.sep):
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.py', '.json', '.env', '.env.example')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    for i, line in enumerate(f, 1):
                        for pattern in patterns:
                            if re.search(pattern, line, re.IGNORECASE):
                                print(f"FOUND: {file}: Line {i}: {line.strip()[:100]}")
                                found_any = True
            except:
                pass

if not found_any:
    print("No API keys found.")
print("Search complete.")