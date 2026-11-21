# Confitext — Privacy Policy

**Effective Date:** November 21, 2026  
**Project:** Confitext (Obsidian Community Plugin)  
**Author:** Dheeraz ([@dheeraz101](https://github.com/dheeraz101))  
**Initiative:** [An YABP Initiative](https://yabp.netlify.app/) (Yet Another Boring Project)  
**Online Web Policy:** [https://dheeraz101.github.io/Confitext/privacy.html](https://dheeraz101.github.io/Confitext/privacy.html)  
**Documentation:** [https://dheeraz101.github.io/Confitext/docs.html](https://dheeraz101.github.io/Confitext/docs.html)  

---

## 1. Absolute Transparency & Core Principle

At Confitext, privacy is not an afterthought or an optional toggle—it is the foundational reason the software exists. 

Confitext is built with an uncompromising architectural guarantee: **100% Client-Side Local Execution, Zero Network Communication, and Zero Telemetry.**

---

## 2. No Data Collection (Zero Telemetry)

- **No Analytics:** Confitext contains zero tracking scripts, analytics trackers, or user behavior monitors.
- **No Diagnostic Telemetry:** Confitext does not report diagnostic data, usage counts, crash reports, device identifiers, or environment telemetry.
- **No Account Required:** You do not need to register, log in, or provide any personal information to use Confitext.

---

## 3. Zero Network Activity

- **Zero Outbound Requests:** Confitext makes **no network calls** whatsoever. It contains no `fetch()`, `XMLHttpRequest`, `WebSocket`, or external resource requests.
- **Self-Contained Bundles:** All glyph sets, styles, and animation routines are bundled locally inside the plugin. No remote CDN resources or tracking pixels are ever contacted.
- **Offline First & Always:** The plugin functions identically with or without an active internet connection. Your notes, remembered terms, custom patterns, and settings never leave your device.

---

## 4. Local Storage Only

All data managed by Confitext remains strictly inside your local device vault:
- **Plugin Settings:** Settings (such as active glyph palette, animation speed, and trigger modes) are stored locally in `.obsidian/plugins/confitext/data.json`.
- **Fast Startup Cache:** A synchronous cache is saved in local `localStorage` to ensure instant 0ms pre-render masking on cold boot (preventing cleartext flashes on mobile devices).
- **Global Remembered Words:** Words you choose to mask globally are saved exclusively in your local `data.json`.
- **Note-Specific Masked Words:** Words designated for a specific note are written into that note's own local YAML frontmatter (`confitext-masked-words: [...]`).
- **No Cloud Synchronization by Plugin:** Confitext does not operate any cloud sync backend. Any synchronization of your vault is handled exclusively by your chosen vault sync provider (e.g., Obsidian Sync, iCloud, Git).

---

## 5. Non-Destructive Visual Layer

- Visual masking occurs entirely in-memory using CodeMirror 6's screen presentation layer (`Decoration.replace`).
- Your underlying Markdown files are **never encrypted, modified, or overwritten** by the masking engine.
- Highlighting, selecting, or copying text from an editor tab copies your original, unmasked Markdown text.

---

## 6. Global Regulatory Standards (GDPR & CCPA)

Because Confitext processes zero personal data and maintains zero servers, it exceeds the requirements of major international data protection frameworks:
- **GDPR Article 25:** Embodies Data Protection by Design and by Default.
- **California CCPA/CPRA:** Collects, retains, sells, and shares zero consumer personal information.
- **HIPAA Display Discretion:** Acts as a technical safeguard against visual snooping and shoulder-surfing in public and clinical settings.

---

## 7. Open Source & Verifiable

Confitext is free and open-source software licensed under the [MIT License](LICENSE). Every line of code, compilation pipeline, and release asset is public and verifiable on GitHub:

- **Repository:** [https://github.com/dheeraz101/Confitext](https://github.com/dheeraz101/Confitext)
- **Author:** Dheeraz ([https://github.com/dheeraz101](https://github.com/dheeraz101))
- **YABP Initiative:** [https://yabp.netlify.app/](https://yabp.netlify.app/)
- **Live Website:** [https://dheeraz101.github.io/Confitext/](https://dheeraz101.github.io/Confitext/)

---

## 8. Contact & Inquiries

If you have questions about Confitext's architecture, security, or privacy guarantees, please open an issue or discussion on the official GitHub repository:
- GitHub Issues: [https://github.com/dheeraz101/Confitext/issues](https://github.com/dheeraz101/Confitext/issues)
