p='apps/analytics/views.py'
lines=open(p).read().splitlines()
out=[]
for l in lines:
    if l=='from apps.accounts.permissions import IsAdminUserRole, IsAdminOrCoordinator':
        continue
    out.append(l)
open(p,'w').write('\n'.join(out))
print('removed duplicate')
