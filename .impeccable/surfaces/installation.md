# Instalar no celular

- Mode: Operate.
- Route: `/instalar`.
- Target: `src/modules/pwa/InstallScreen.tsx`, `src/styles/guide-install.css`.
- Direction: extend the shipped Service Guide identity and shared Header/Footer.
- Task: install through the browser or follow platform instructions without code.
- Main action: browser install prompt when supported; readable manual steps otherwise.
- Brand: supplied Service Guide logo, existing navy/blue/green system and typography.
- States: manual instructions, available prompt, busy, dismissed/failed, installed.
- Mobile: one instruction column, 44+ px controls, safe areas, ordinary scrolling.
- Truth: same account/backend; internet required for fresh catalog and administration.
- No nagging, forced reload, fake successful installation or store availability claim.
- QA: static detector clear; browser automation disabled in Work settings. Desktop/mobile
  visual inspection and real Android/iPhone installation remain pending.
