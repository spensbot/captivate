# Demo project for screenshot capture

| File | Role |
|------|------|
| `demo.cap` | Versioned project (DMX patch + default light/visual scenes) |
| `demo.cfx` | Sibling fixture library (bundled types + demo fog) |

Regenerate from the Captivate fixture library:

```bash
npm run screenshots:demo-project
```

Capture loads `demo.cap` automatically when present (`CAPTIVATE_SCREENSHOT_PROJECT` overrides the path).

## Contents

- Generic RGB washes, dimmer RGB, AFX LED bar, Altman cyc
- Chauvet / Betopper movers (Movers page)
- Captivate-native fog type with `fxtrTrigger` / `fxtrLevel` (Atmospherics page)
- One WLED string + `ledSidebarEnabled` (LED page)
- Default generated light scenes (same generator as Extras → Generate Scenes)
