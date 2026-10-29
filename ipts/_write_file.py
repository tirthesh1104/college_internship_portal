import base64

# The profile settings content encoded in base64 (simplified version)
content = base64.b64decode('SGVsbG8gd29ybGQh').decode('utf-8')
with open('C:\Users\Lenovo\Desktop\ipts\test.txt', 'w', encoding='utf-8') as f:
    f.write(content)
print('ok')
