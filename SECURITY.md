# Security Policy

## Architecture & Privacy Posture

**Serpentis** is a 100% static, client-side web application:

- **Zero Backend / Zero Telemetry** — No gameplay data, player names, or analytics are transmitted to any external server.
- **Local Persistence Only** — Settings, unlocked labyrinth stages, achievements, and Hall of Fame entries are stored exclusively in browser `localStorage` and strictly sanitized against schema tampering on load (`src/game/storage.ts`).
- **No Secrets Required** — The application requires no API keys, tokens, or authentication credentials.

## Supported Versions

| Version | Supported |
| :--- | :---: |
| `1.0.x` | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability (for example, a cross-site scripting vector, unsafe storage handling, or a compromised dependency):

1. **Do not** open a public GitHub Issue describing the exploit.
2. Report the finding privately using [GitHub Security Advisories](https://github.com/DoctorLestrange/Serpentis/security/advisories/new).
3. Include a clear description of the issue, reproduction steps, and potential impact.

We will acknowledge receipt promptly and coordinate a fix and release disclosure once verified.
