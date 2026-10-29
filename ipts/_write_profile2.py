import base64

# Read base64 content from a file and decode it
with open('C:\Users\Lenovo\Desktop\ipts\_profile_b64.txt', 'r') as f:
    b64_content = f.read().strip()

content = base64.b64decode(b64_content).decode('utf-8')

with open('C:\Users\Lenovo\Desktop\ipts\frontend\src\pages\student\ProfileSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ProfileSettings.tsx written')
print('Length:', len(content))
