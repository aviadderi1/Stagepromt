const { app, BrowserWindow, ipcMain, shell, powerSaveBlocker, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let info = { code: 0, pkg: 'desktop', phone: false, desktop: true, platform: process.platform };
try { Object.assign(info, JSON.parse(fs.readFileSync(path.join(__dirname, 'build-info.json'), 'utf8'))); } catch (e) {}

let win = null, pendingAuth = null, awakeId = null;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ---- single instance + stagepromt:// links (Google sign-in returns here) ----
if (!app.requestSingleInstanceLock()) { app.quit(); }
if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient('stagepromt', process.execPath, [path.resolve(process.argv[1])]);
else app.setAsDefaultProtocolClient('stagepromt');
function handleLink(url) {
  if (!url || !/^stagepromt:\/\//i.test(url)) return;
  if (win && !win.webContents.isLoading()) { win.webContents.send('sp:js', 'window.__fbAuth&&window.__fbAuth(' + JSON.stringify(url) + ')'); if (win.isMinimized()) win.restore(); win.focus(); }
  else pendingAuth = url;
}
app.on('second-instance', (_e, argv) => { handleLink(argv.find(a => /^stagepromt:\/\//i.test(a))); if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('open-url', (e, url) => { e.preventDefault(); handleLink(url); });

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, backgroundColor: '#0B0C0E', title: 'StagePromt', show: false,
    icon: path.join(__dirname, 'web', 'logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]) : null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
  win.webContents.on('did-finish-load', () => { if (pendingAuth) { const u = pendingAuth; pendingAuth = null; setTimeout(() => handleLink(u), 800); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  createWindow();
  const arg = process.argv.find(a => /^stagepromt:\/\//i.test(a)); if (arg) pendingAuth = arg;
  app.on('activate', () => { if (!win) createWindow(); });
});
app.on('window-all-closed', () => { app.quit(); });

// ---- native bridge ----
ipcMain.on('sp:info', e => { e.returnValue = info; });
// Google sign-in: open the sign-in page in the browser and receive the result on a local address (no custom-link prompt needed)
let authSrv = null;
function startLogin(url) {
  if (authSrv) { try { authSrv.close(); } catch (e) {} authSrv = null; }
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/cb' || !u.searchParams.get('r')) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html dir="rtl" lang="he"><meta charset="utf-8"><title>StagePromt</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0B0C0E;color:#F4EFE6;font:20px Arial,sans-serif;text-align:center"><div><div style="font-size:54px;color:#E8A23A">✓</div><b>התחברת ל-StagePromt</b><p style="color:#9A948A">אפשר לסגור את הלשונית ולחזור לתוכנה.</p></div><script>setTimeout(function(){window.close()},1500)</script></body></html>');
    handleLink('stagepromt://fbauth?' + u.searchParams.toString());
    setTimeout(() => { try { srv.close(); } catch (e) {} if (authSrv === srv) authSrv = null; }, 1000);
  });
  srv.listen(0, '127.0.0.1', () => {
    authSrv = srv; const port = srv.address().port;
    const target = new URL(url); target.searchParams.set('app', 'stagepromt'); target.searchParams.set('ret', 'http://127.0.0.1:' + port + '/cb');
    shell.openExternal(target.toString());
    setTimeout(() => { if (authSrv === srv) { try { srv.close(); } catch (e) {} authSrv = null; } }, 10 * 60 * 1000);
  });
}
ipcMain.on('sp:open', (_e, url) => {
  if (/^https:\/\/aviadderi1\.github\.io\/Stagepromt\/auth\//i.test(url)) return startLogin(url);
  if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
});
ipcMain.on('sp:awake', (_e, on) => {
  if (on && awakeId === null) awakeId = powerSaveBlocker.start('prevent-display-sleep');
  else if (!on && awakeId !== null) { powerSaveBlocker.stop(awakeId); awakeId = null; }
});
ipcMain.on('sp:update', (_e, url) => shell.openExternal(/^https:\/\/(github\.com|objects\.githubusercontent)/.test(url || '') ? url : 'https://aviadderi1.github.io/Stagepromt/#download'));
ipcMain.on('sp:http', async (e, id, method, url, body, headers, bin) => {
  const done = (ok, text, finalUrl) => { if (!e.sender.isDestroyed()) e.sender.send('sp:js', 'window.__httpDone(' + JSON.stringify(id) + ',' + ok + ',' + JSON.stringify(String(text)) + ',' + JSON.stringify(finalUrl || '') + ')'); };
  try {
    let h = {}; try { h = headers ? JSON.parse(headers) : {}; } catch (x) {}
    const hdr = Object.assign({ 'User-Agent': UA, 'Accept-Language': 'he,en;q=0.8' }, h);
    let m = method || 'GET';
    const r = await fetch(url, { method: m, headers: hdr, body: (m === 'GET' || m === 'HEAD') ? undefined : body, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    if (bin === '1') {
      const buf = Buffer.from(await r.arrayBuffer()); const ct = (r.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
      if (!r.ok) return done(false, 'HTTP ' + r.status);
      return done(true, ct.startsWith('image/') ? 'data:' + ct + ';base64,' + buf.toString('base64') : buf.toString('base64'), r.url);
    }
    const text = await r.text();
    if (!r.ok && !(h['X-HTTP-Method-Override'] || /firestore|googleapis/.test(url))) return done(false, 'HTTP ' + r.status);
    if (!r.ok) return done(false, 'HTTP ' + r.status + ': ' + text.slice(0, 300));
    done(true, text, r.url);
  } catch (err) { done(false, String(err && err.message || err)); }
});
