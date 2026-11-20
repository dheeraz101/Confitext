# Confitext — Privacy Policy

**Last Updated:** November 20, 2026  
**Project:** Confitext (Obsidian Plugin)  
**Author:** Dheeraz ([@dheeraz101](https://github.com/dheeraz101))  
**Initiative:** [An YABP Initiative](https://yabp.netlify.app/) (Yet Another Boring Project)  

---

## 1. Absolute Transparency & Core Principle

At Confitext, privacy is not an afterthought or a policy toggle—it is the foundational reason the software exists. 

Confitext is designed with an uncompromising architectural guarantee: **100% Local Execution, Zero Network Communication, and Zero Telemetry.**

---

## 2. No Data Collection (Zero Telemetry)

- **No Analytics:** Confitext contains zero tracking scripts, analytics trackers, or user behavior monitors.
- **No Telemetry:** Confitext does not report diagnostic data, usage counts, crash reports, device identifiers, or environment telemetry.
- **No Account Required:** You do not need to register, log in, or provide any personal information to use Confitext.

---

## 3. Zero Network Activity

- **Zero Outbound Requests:** Confitext makes **no network calls** whatsoever. It contains no `fetch()`, `XMLHttpRequest`, `WebSocket`, or external resource requests.
- **Offline First & Always:** The plugin functions identically with or without an active internet connection. Your notes, remembered terms, custom patterns, and settings never leave your device.

---

## 4. Local Storage Only

All data managed by Confitext remains strictly inside your local Obsidian vault:
- **Plugin Settings:** Settings (such as active glyph palette, animation speed, and trigger modes) are stored locally in `.obsidian/plugins/confitext/data.json`.
- **Global Remembered Words:** Words you choose to mask globally are saved exclusively in your local `data.json`.
- **Note-Specific Masked Words:** Words designated for a specific note are written into that note's own local YAML frontmatter (`confitext-masked-words: [...]`).
- **No Cloud Synchronization by Plugin:** Confitext does not operate any cloud sync backend. Any synchronization of your vault is handled exclusively by your chosen vault sync provider (e.g., Obsidian Sync, iCloud, Git).

---

## 5. Non-Destructive Visual Layer

- Visual masking occurs entirely in-memory using CodeMirror 6's screen presentation layer (`Decoration.replace`).
- Your underlying Markdown files are **never encrypted, modified, or overwritten** by the masking engine.
- Highlighting, selecting, or copying text from an editor tab copies your original, unmasked Markdown text.

---

## 6. Open Source & Verifiable

Confitext is free and open-source software licensed under the [MIT License](LICENSE). Every line of code, compilation pipeline, and release asset is public and verifiable on GitHub:

- **Repository:** [https://github.com/dheeraz101/Confitext](https://github.com/dheeraz101/Confitext)
- **Author:** Dheeraz ([https://github.com/dheeraz101](https://github.com/dheeraz101))
- **YABP Initiative:** [https://yabp.netlify.app/](https://yabp.netlify.app/)

---

## 7. Contact & Inquiries

If you have questions about Confitext's architecture, security, or privacy guarantees, please open an issue or discussion on the official GitHub repository:
- GitHub Issues: [https://github.com/dheeraz101/Confitext/issues](https://github.com/dheeraz101/Confitext/issues)
