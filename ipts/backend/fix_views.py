p='apps/documents/views.py'
lines=open(p).read().splitlines()
out=[]
i=0
while i < len(lines):
    out.append(lines[i])
    if lines[i].startswith('class DocumentViewSet'):
        out.append('    serializer_class = DocumentSerializer')
        out.append('    permission_classes = [permissions.IsAuthenticated]')
        out.append('')
        out.append('    def destroy(self, request, *args, **kwargs):')
        out.append('        doc = self.get_object()')
        out.append('        user = request.user')
        out.append('        if user.is_student and doc.student != user:')
        out.append("            return Response({'error': 'Students cannot delete documents.'}, status=status.HTTP_403_FORBIDDEN)")
        out.append('        storage_dir = getattr(settings, "PRIVATE_STORAGE_DIR", settings.BASE_DIR / "media" / "private_documents")')
        out.append('        file_path = os.path.join(storage_dir, doc.file_key)')
        out.append('        if os.path.exists(file_path):')
        out.append('            try:')
        out.append('                os.remove(file_path)')
        out.append('            except Exception:')
        out.append('                pass')
        out.append('        return super().destroy(request, *args, **kwargs)')
        out.append('')
        out.append('    def get_queryset(self):')
        i+=1
        while i < len(lines) and not lines[i].startswith('    def get_queryset'):
            i+=1
        continue
    i+=1
open(p,'w').write('\n'.join(out))
print('done')
