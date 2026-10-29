p = "frontend/src/pages/student/Documents.tsx"
with open(p, encoding="utf-8") as f:
    lines = f.readlines()

new_section = """                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => handleViewFile(doc)} className="btn btn-outline btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}>
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="btn btn-outline btn-sm" style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
"""

start_idx = None
for i, line in enumerate(lines):
    if "Download File" in line:
        start_idx = i - 3
        break

if start_idx is not None:
    end_idx = start_idx + 20
    lines[start_idx:end_idx+1] = [new_section]
    with open(p, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Replacement done")

