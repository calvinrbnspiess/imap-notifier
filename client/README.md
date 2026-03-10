# IMAP Notifier – Windows Client (NeutralinoJS)

A lightweight Windows desktop notifier. Runs silently in the background, connects to the WebSocket server, and shows an alarm popup with sound for every incoming notification.

Built with [NeutralinoJS](https://neutralino.js.org) — output is a **single signed `.exe`**, no runtime required.

---

## Configuration

Create `notifier.config.json` next to the `.exe`:

```json
{ "wsUrl": "ws://YOUR_SERVER_IP:8000/ws" }
```

The alarm sound is `resources/alarm.mp3` — replace it with any `.mp3` file before building.

---

## Expected WebSocket Message Format

```json
{ "title": "New Email", "message": "From: someone@example.com" }
```

Raw non-JSON messages are shown as-is.

---

## Build

Run on a **Windows machine** with [Node.js](https://nodejs.org) installed:

```powershell
cd client
powershell -ExecutionPolicy Bypass -File build.ps1
```

The script will:
1. Install the `neu` CLI (`npm install -g @neutralinojs/neu`)
2. Download NeutralinoJS binaries (`neu update`)
3. Build a single self-contained `.exe` (`neu build --embed-resources`)
4. Patch version info and icon with `rcedit`

Output: `dist\ImapNotifier-win_x64.exe`

### Signing (optional, separate step)

```powershell
powershell -ExecutionPolicy Bypass -File sign.ps1
```

The script will:
1. Look up (or create) a self-signed code signing certificate for `calvinreibenspiess@gmail.com`
2. Sign `dist\ImapNotifier-win_x64.exe` with `signtool.exe`

> **Requirement:** `signtool.exe` comes with the Windows SDK.
> Install via: `winget install Microsoft.WindowsSDK.10.0.22621`

---

## Deployment

Copy two files to each machine:

```
notifier-win_x64.exe
notifier.config.json
```

To start automatically at login, add the `.exe` to the user's startup folder:

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
```

---

## How It Works

- App starts **hidden** — no window, no tray icon
- Connects to the WebSocket server and reconnects automatically every 10 s on disconnect
- On notification: window appears (always on top, centered), alarm loops
- User clicks **OK**: alarm stops, window hides
- Clicking the window's **X** also stops the alarm and hides (process keeps running)

---

## Development

```powershell
# Install neu CLI
npm install -g @neutralinojs/neu

# Download binaries and client library
neu update

# Create a local config file (not committed)
cp notifier.config.json.example notifier.config.json
# Edit notifier.config.json with your dev server URL

# Run in dev mode
neu run
```
