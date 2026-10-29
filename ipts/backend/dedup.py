p='apps/documents/views.py'
lines=open(p).read().splitlines()
out=[]
seen=False
for l in lines:
    if l=='    def get_queryset(self):':
        if seen:
            continue
        seen=True
    out.append(l)
open(p,'w').write('\n'.join(out))
print('done')
