import os
result = os.path.exists(r'C:\backend')
with open('C:\Users\Lenovo\Desktop\ipts\check.txt', 'w') as f:
    f.write(str(result))