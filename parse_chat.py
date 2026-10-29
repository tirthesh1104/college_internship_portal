import re

with open('chatgpt.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', text, re.DOTALL)
if len(scripts) > 8:
    s8 = scripts[8]
else:
    s8 = text

chunks = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', s8)
print('Total string chunks in script 8:', len(chunks))

results = []
for c in chunks:
    if len(c) > 40:
        if r'\u09' in c or any(k in c.lower() for k in ['ipts', 'internship', 'coordinator', 'संकल्पना', 'चार्ट', 'डॅशबोर्ड', 'विद्यार्थी']):
            try:
                dec = bytes(c, 'utf-8').decode('unicode_escape')
                results.append(dec)
            except Exception:
                results.append(c)

print('Filtered chunks count:', len(results))
with open('chat_conversations.txt', 'w', encoding='utf-8') as out:
    for idx, r in enumerate(results):
        out.write(f"=== ENTRY {idx+1} ===\n{r}\n\n")

print("Saved to chat_conversations.txt")
