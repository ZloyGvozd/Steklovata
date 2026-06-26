const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('node:fs/promises');
const { Worker } = require('worker_threads');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 850,
        icon: path.join(__dirname, 'public\\chiken.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.setResizable(false)
    mainWindow.removeMenu()

    mainWindow.loadFile('public\\index.html');
}

//Electron готов к работе
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});


//Ядро
let workers = []

ipcMain.handle('runSearch', async (event,urlsPath,ports,treads)=>{
    console.log(urlsPath,ports,treads)

    const data = await fs.readFile(urlsPath, { encoding: 'utf8' })
    const hosts = data.split("\r\n")

    const startPort = parseInt(ports.split("-")[0])
    const endPort = parseInt(ports.split("-")[1])

    const portsCount = endPort - startPort + 1;
    const totalTasks = hosts.length * portsCount;

    const tasksPerWorker = Math.ceil(totalTasks / treads);

    //создание воркеров
    for(let i=0; i<treads; i++){
        const startIdx = i * tasksPerWorker;
        const endIdx = Math.min(startIdx + tasksPerWorker - 1, totalTasks - 1);

        workers.push(new Worker())
    }

    console.log(hosts,startPort,endPort,tasksPerWorker)
})