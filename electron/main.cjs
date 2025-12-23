const { app, BrowserWindow, session, systemPreferences } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow;
let server;
const PORT = 45789; // Random port for local server

async function requestMicrophoneAccess() {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    console.log('Microphone access status:', status);

    if (status !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone');
      console.log('Microphone access granted:', granted);
      return granted;
    }
    return true;
  }
  return true;
}

function startLocalServer() {
  return new Promise((resolve) => {
    const expressApp = express();
    const distPath = path.join(__dirname, '../dist');

    expressApp.use(express.static(distPath));

    // Fallback to index.html for SPA
    expressApp.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    server = expressApp.listen(PORT, '127.0.0.1', () => {
      console.log(`Local server running at http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

async function createWindow() {
  // Request microphone access before creating window
  await requestMicrophoneAccess();

  // Start local server for production
  if (process.env.NODE_ENV !== 'development') {
    await startLocalServer();
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Grant microphone permission automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission requested:', permission);
    if (permission === 'media' || permission === 'microphone') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Also handle permission check
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media' || permission === 'microphone') {
      return true;
    }
    return false;
  });

  // In development, load from vite dev server
  // In production, load from local express server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});
