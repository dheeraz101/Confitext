# Confitext: Release Guide & Distribution

## 1. Distribution Artifacts

An installable Obsidian community plugin requires three core files:
1. `main.js`: The bundled CommonJS production script.
2. `manifest.json`: Plugin identification and version metadata.
3. `styles.css`: CSS styling for masked glyphs, animations, status badges, and settings UI.

Additionally, Confitext provides a ready-to-extract ZIP archive:
- `Confitext-Obsidian-Plugin.zip`
  └── `confitext/`
      ├── `main.js`
      ├── `manifest.json`
      └── `styles.css`

---

## 2. Release Build Steps

1. **Verify Typecheck and Tests:**
   ```bash
   npm run typecheck
   npm test
   ```
2. **Build Production Bundle:**
   ```bash
   npm run build
   ```
3. **Verify File Outputs:**
   Check that `main.js`, `manifest.json`, and `styles.css` exist and are up to date.
4. **Generate Release Archive:**
   Compress `confitext/` into `Confitext-Obsidian-Plugin.zip`.

---

## 3. Manual Installation in Obsidian

1. Locate your Obsidian vault directory.
2. Open the `.obsidian/plugins/` directory inside the vault (enable hidden files if needed).
3. Create a folder named `confitext`.
4. Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/confitext/`.
5. Open Obsidian, go to **Settings > Community plugins**, and click the reload icon.
6. Toggle **Confitext** to enabled.
