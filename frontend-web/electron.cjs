const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;

function startBackend() {
  if (app.isPackaged) {
    // Când aplicația e compilată final, folosim executabilul python din folderul extra
    const backendExe = path.join(process.resourcesPath, 'extra', 'run_server.exe');
    backendProcess = spawn(backendExe, []);
  } else {
    // Când suntem în faza de dezvoltare, folosim mediul virtual (venv)
    const backendPath = path.join(__dirname, '..', 'backend');
    const pythonExe = path.join(backendPath, 'venv', 'Scripts', 'python.exe');
    
    backendProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
      cwd: backendPath,
      detached: false
    });
  }

  // Afișăm logurile backend-ului în consola Electron pentru debugging ușor
  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend]: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Eroare]: ${data}`);
  });
}

function createWindow () {
  const win = new BrowserWindow({
    width: 450,
    height: 750,
    title: "Weather Chatbot",
    autoHideMenuBar: true, // Ascunde meniul clasic (File, Edit, etc)
    webPreferences: {
      nodeIntegration: true,
    }
  });

  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    // În modul de dezvoltare, încărcăm serverul Vite local
    win.loadURL('http://localhost:5173'); 
  } else {
    // În modul de producție (.exe), încărcăm fișierele React înghețate
    win.loadFile(path.join(__dirname, 'dist', 'index.html')); 
  }
}

app.whenReady().then(() => {
  startBackend(); // Pornim serverul de Python fix înainte să se deschidă fereastra
  createWindow();
});

// Pentru Windows/Linux, ieșim din aplicație când toate ferestrele sunt închise
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Când executabilul Electron se închide definitiv, oprim procesul Python din fundal 
// pentru a nu lăsa procese fantomă care consumă memorie RAM.
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});