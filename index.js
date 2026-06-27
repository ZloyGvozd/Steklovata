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
    mainWindow.webContents.openDevTools()

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
let errors = 0
let success = 0

ipcMain.handle('runSearch', async (event,urlsPath,ports,treads,proxy_ip,proxy_port)=>{
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

        workers.push(new Worker('./worker.js', {
            workerData: {
                workerId: i,
                startIdx,
                endIdx,
                hosts, // Передавать массив ссылкой в workerData — дешево, он не копируется дублированием памяти для строк в V8 (используются общие структуры под капотом для read-only)
                startPort,
                portsCount,
                proxy_ip,
                proxy_port
            }
        }))
    }
    workers.forEach((e) => {
        e.on('message',(result)=>{
            if(result.reason === 'serverResponse'){
                success++

                const aboutServer = result.json
                if(aboutServer.players.online > 0){

                }
            }if(result.reason === 'serverError'){
                errors++
            }if(result.reason === 'serverTimeout'){
                errors++
            }
        })
    })

    console.log(hosts,startPort,endPort,tasksPerWorker)
})

ipcMain.handle('stopSearch', async () => {
    workers.forEach((e) => {
        e.postMessage({task:'stop'})
    })
    workers = []
})

ipcMain.handle('getStats', async () => {
    return {success: success,errors: errors}
})