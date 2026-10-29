import json, re

with open('chatgpt.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', text, re.DOTALL)
s8 = scripts[8]

start_marker = 'streamController.enqueue("'
start_idx = s8.find(start_marker)
if start_idx != -1:
    content_start = start_idx + len(start_marker)
    # The call ends with '");' or '"]\n");'
    end_idx = s8.rfind('");')
    if end_idx != -1:
        raw_json_str = s8[content_start:end_idx]
        print("Raw json str length:", len(raw_json_str))
        try:
            unescaped = json.loads('"' + raw_json_str + '"')
            data = json.loads(unescaped)
            print("Successfully parsed data array, length:", len(data))
            
            # Find all strings in data
            texts = []
            for item in data:
                if isinstance(item, str) and len(item) > 40:
                    texts.append(item)
            
            print("Found text items:", len(texts))
            with open('extracted_chat_messages.txt', 'w', encoding='utf-8') as out:
                for idx, t in enumerate(texts):
                    out.write(f"=== MESSAGE {idx+1} ===\n{t}\n\n")
            print("Written to extracted_chat_messages.txt")
        except Exception as e:
            print("JSON parse error:", e)
EOF
