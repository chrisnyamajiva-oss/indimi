# WCAG 2.1 AA contrast verification (programmatic)
All text/background token pairs, WCAG relative-luminance formula. Threshold 4.5:1.

| Pair | Ratio | Result |
|---|---|---|
| ink #201F1D on white | 16.47:1 | PASS |
| ink-soft #55524C on white | 7.78:1 | PASS |
| ink-soft on panel #F6F5F1 | 7.14:1 | PASS |
| green-700 #0B5A44 on white | 8.20:1 | PASS |
| white on green-700 (buttons) | 8.20:1 | PASS |
| red-700 #A0341A on white | 7.00:1 | PASS |
| red-700 on red-050 #FBEEEA | 6.17:1 | PASS |
| amber-800 #6F4A05 on amber-050 #FBF3E0 (badge, heat mid) | 7.15:1 | PASS |
| green-800 #084535 on green-050 #E8F2EE (heat good) | 9.60:1 | PASS |
| ink on panel | 15.10:1 | PASS |

| green-700 #0B5A44 on green-050 #E8F2EE (secondary button hover) | 7.17:1 | PASS |

Also verified headlessly (Chromium 141):
- Empty filter combinations show an accessible notice (role=status), KPIs degrade to em-dashes, reset recovers fully
- Heatmap cells carry visually-hidden status text ("below target" etc.) so colour is never the sole indicator; a visible bin legend explains the colour scale
- All 20 district map markers are keyboard-focusable (tabindex=0, role=button, per-district aria-label); Enter/Space opens the popup
- Leaflet zoom controls and popup close button enlarged to 44×44 CSS px
- Hotspot CSV download and clipboard briefing summary verified end-to-end (content inspected)
- No horizontal scroll at 320 / 768 / 1920 px viewports
- First Tab press focuses the skip link
- Full UI renders in EN, SN and ND; document.lang updates with toggle
- Aggregations match an independent pandas analysis of the CSV exactly
