Neutralino.init();

// ── Configuration ─────────────────────────────────────────────────────────────

async function getWsUrl() {
  try {
    const json = await Neutralino.filesystem.readFile(NL_PATH + '/notifier.config.json');
    const cfg = JSON.parse(json);
    if (cfg.wsUrl) return cfg.wsUrl;
  } catch {}
  throw new Error(
    'notifier.config.json not found or missing wsUrl.\n' +
    'Place notifier.config.json next to the exe with { "wsUrl": "ws://..." }.'
  );
}

// ── Audio ─────────────────────────────────────────────────────────────────────

let alarmProcessId = null;
let alarmRunning   = false;
let alarmMediaPath = null;
let alarmStopFile  = null;  // Windows: signal file for graceful MCI shutdown

async function extractAlarm() {
  try {
    const fetchRes = await fetch('alarm.mp3');
    if (!fetchRes.ok) throw new Error('fetch alarm.mp3 failed: ' + fetchRes.status);
    const mp3Buf = await fetchRes.arrayBuffer();

    if (NL_OS === 'Windows') {
      const res  = await Neutralino.os.execCommand('powershell -NoProfile -Command "Write-Output $env:TEMP"');
      const temp = res.stdOut.trim();
      const mp3  = temp + '\\imap-notifier-alarm.mp3';
      const ps1  = temp + '\\imap-notifier-alarm.ps1';
      const stop = temp + '\\imap-notifier-alarm.stop';

      await Neutralino.filesystem.writeBinaryFile(mp3, mp3Buf);

      // PS script plays MP3 via MCI (winmm.dll).
      // Polls every 300ms for: stop-file (graceful dismiss) or parent-process-gone (auto-exit).
      const script = [
        'Add-Type @"',
        'using System;',
        'using System.Runtime.InteropServices;',
        'using System.Text;',
        'public class Mci {',
        '    [DllImport("winmm.dll", CharSet=CharSet.Auto)]',
        '    public static extern int mciSendString(string cmd, StringBuilder ret, int bufSize, IntPtr cb);',
        '}',
        '"@',
        `[Mci]::mciSendString('open "${mp3}" type mpegvideo alias alarm', $null, 0, [IntPtr]::Zero) | Out-Null`,
        `[Mci]::mciSendString('play alarm from 0', $null, 0, [IntPtr]::Zero) | Out-Null`,
        'while ($true) {',
        '    Start-Sleep -Milliseconds 300',
        `    if (Test-Path '${stop}') { Remove-Item '${stop}' -Force; break }`,
        '    if (-not (Get-Process -Name "ImapNotifier-win_x64","neutralino-win_x64" -ErrorAction SilentlyContinue)) { break }',
        '    $sb = New-Object System.Text.StringBuilder 32',
        `    [Mci]::mciSendString('status alarm mode', $sb, 32, [IntPtr]::Zero) | Out-Null`,
        '    if ($sb.ToString() -eq "stopped") {',
        `        [Mci]::mciSendString('seek alarm to start', $null, 0, [IntPtr]::Zero) | Out-Null`,
        `        [Mci]::mciSendString('play alarm', $null, 0, [IntPtr]::Zero) | Out-Null`,
        '    }',
        '}',
        `[Mci]::mciSendString('stop alarm', $null, 0, [IntPtr]::Zero) | Out-Null`,
        `[Mci]::mciSendString('close alarm', $null, 0, [IntPtr]::Zero) | Out-Null`,
      ].join('\r\n');

      await Neutralino.filesystem.writeBinaryFile(ps1, new TextEncoder().encode(script).buffer);
      alarmMediaPath = ps1;
      alarmStopFile  = stop;

    } else {
      const mp3 = '/tmp/imap-notifier-alarm.mp3';
      await Neutralino.filesystem.writeBinaryFile(mp3, mp3Buf);
      alarmMediaPath = mp3;
    }
  } catch (e) {
    console.error('extractAlarm failed:', e);
  }
}

async function startAlarm() {
  if (!alarmMediaPath || alarmRunning) return;
  try {
    let cmd;
    if (NL_OS === 'Windows') {
      cmd = `powershell -ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -File "${alarmMediaPath}"`;
    } else {
      cmd = `bash -c "while true; do afplay '${alarmMediaPath}'; done"`;
    }
    const proc = await Neutralino.os.spawnProcess(cmd);
    alarmProcessId = proc.id;
    alarmRunning   = true;
  } catch (e) {
    console.error('startAlarm failed:', e);
  }
}

async function stopAlarm() {
  if (!alarmRunning) return;
  try {
    if (NL_OS === 'Windows') {
      // Write stop-file → PS script calls mciSendString('stop') then exits cleanly
      await Neutralino.filesystem.writeBinaryFile(alarmStopFile, new Uint8Array([0]).buffer);
      // Give the script ~500ms to stop MCI and exit on its own
      await new Promise(r => setTimeout(r, 500));
      // Force-kill whatever remains
      try { await Neutralino.os.updateSpawnedProcess(alarmProcessId, 'terminate'); } catch {}
    } else {
      await Neutralino.os.execCommand("pkill -f 'imap-notifier-alarm'");
    }
  } catch (e) {
    console.error('stopAlarm failed:', e);
  }
  alarmProcessId = null;
  alarmRunning   = false;
  // alarmStopFile intentionally kept — path is reused on next alarm
}

// ── Notification display ──────────────────────────────────────────────────────

async function showNotification(title, message) {
  document.getElementById('notif-title').textContent   = title;
  document.getElementById('notif-message').textContent = message;
  await Neutralino.window.setTitle(title);
  await Neutralino.window.show();
  await Neutralino.window.focus();
  await startAlarm();
}

async function dismiss() {
  await stopAlarm();
  await Neutralino.window.hide();
}

document.getElementById('ok-btn').addEventListener('click', dismiss);
Neutralino.events.on('windowClose', dismiss);

// ── WebSocket ─────────────────────────────────────────────────────────────────

async function getHostname() {
  try {
    const cmd    = NL_OS === 'Windows' ? 'powershell -NoProfile -Command "hostname"' : 'hostname';
    const result = await Neutralino.os.execCommand(cmd);
    return result.stdOut.trim();
  } catch {
    return 'unknown';
  }
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);

  ws.onopen = async () => {
    const hostname = await getHostname();
    ws.send(JSON.stringify({ type: 'register', hostname }));
  };

  ws.onmessage = async (event) => {
    const raw = typeof event.data === 'string' ? event.data : await event.data.text();
    try {
      const data = JSON.parse(raw);
      if (data.type === 'notification') {
        await showNotification(data.title || 'New Notification', data.message || raw);
      }
    } catch {
      await showNotification('New Notification', raw);
    }
  };

  ws.onerror = (e) => console.error('WebSocket error:', e);
  ws.onclose = () => setTimeout(() => connect(wsUrl), 10_000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Config dimensions are ignored by NeutralinoJS on Windows; setSize with
  // physical pixels (logical × devicePixelRatio) is required.
  const dpr = window.devicePixelRatio || 1;
  await Neutralino.window.setSize({ width: Math.round(500 * dpr), height: Math.round(210 * dpr) });

  const wsUrl = await getWsUrl();
  await extractAlarm();
  connect(wsUrl);
}

init().catch(async (err) => {
  document.getElementById('notif-title').textContent   = 'Configuration Error';
  document.getElementById('notif-message').textContent = err.message;
  await Neutralino.window.show();
});
