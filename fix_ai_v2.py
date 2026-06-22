import re

with open('src/screens/AsistenteIAScreen.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove any accidental recording style definitions that might be floating around
# (though they seem missing from the tail)

# Ensure they are at the end of the StyleSheet
new_styles = """  recordingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.bg + 'EE', zIndex: 100, alignItems: 'center', justifyContent: 'center', gap: 20 },
  recordingPulse: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.red + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.red },
  recordingText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },"""

if 'recordingOverlay' not in content:
    content = content.replace("modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },",
                              "modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },\n" + new_styles)

with open('src/screens/AsistenteIAScreen.js', 'w', encoding='utf-8') as f:
    f.write(content)
