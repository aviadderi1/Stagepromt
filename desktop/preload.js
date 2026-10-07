// Gives the web app the same "native bridge" it has on Android (window.Android),
// so web search, sync, sign-in and updates work on Windows and Mac.
const { contextBridge, ipcRenderer } = require('electron');
const info = ipcRenderer.sendSync('sp:info');
const send = (ch, ...a) => ipcRenderer.send(ch, ...a);
contextBridge.exposeInMainWorld('Android', {
  httpGet: (id, url) => send('sp:http', id, 'GET', url, '', '', '0'),
  httpGetData: (id, url) => send('sp:http', id, 'GET', url, '', '', '1'),
  aiReq: (id, method, url, body, headers, bin) => send('sp:http', id, method, url, body || '', headers || '', bin || '0'),
  aiPost: (id, url, body) => send('sp:http', id, 'POST', url, body || '', '{"Content-Type":"application/json"}', '0'),
  httpPost: (id, url, body) => send('sp:http', id, 'POST', url, body || '', '{"Content-Type":"application/x-www-form-urlencoded"}', '0'),
  openUrl: (url) => send('sp:open', url),
  authScheme: () => 'stagepromt',
  appInfo: () => JSON.stringify(info),
  keepAwake: (on) => send('sp:awake', !!on),
  installUpdate: (url) => send('sp:update', url),
  showKeyboard: () => {}
});
ipcRenderer.on('sp:js', (_e, code) => { try { (0, eval)(code) } catch (e) {} });
