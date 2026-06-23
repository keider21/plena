import re

with open('src/screens/FinanzasScreen.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the fmtDate definition at the top
bad_fmt_pattern = r'const fmtDate = \(d\) => format\(d, "d \'de\' MMM", \{ locale: es\s+miniFilter: \{[\s\S]*?\}\);'
content = re.sub(bad_fmt_pattern, 'const fmtDate = (d) => format(d, "d \'de\' MMM", { locale: es });', content)

# 2. Fix the accidental style block that might be floating after fmtDate
bad_floating_styles = r'  miniFilterOn: \{ backgroundColor: COLORS\.purple, borderColor: COLORS\.purple \},[\s\S]*?filteredSummaryText: \{ fontSize: 12, color: COLORS\.textSub \},\s*\}\);'
content = re.sub(bad_floating_styles, '', content)

# 3. Add the styles to the actual StyleSheet at the bottom
new_fin_styles = """  miniFilter: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.bg3, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  miniFilterOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  miniFilterText: { fontSize: 11, fontWeight: '700', color: COLORS.textSub },
  miniFilterTextOn: { color: '#fff' },
  filteredSummary: { backgroundColor: COLORS.bg2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.purple },
  filteredSummaryText: { fontSize: 12, color: COLORS.textSub },"""

if 'miniFilter:' not in content:
    content = content.replace("searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 0 },",
                              "searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 0 },\n" + new_fin_styles)

with open('src/screens/FinanzasScreen.js', 'w', encoding='utf-8') as f:
    f.write(content)
