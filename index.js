const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('node:fs/promises');
const { Worker } = require('worker_threads');
const net = require("net");
const {spawn} = require("child_process");

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
    //mainWindow.webContents.openDevTools()

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
let founded = []

const TOR_PASSWORD = 'pisun';

let tors = []
for(let i = 0; i < 20; i++) {
    const torArgs = [
        '--ControlPort', (9051+i).toString(),
        '--HashedControlPassword', '16:61F657AD90C9A4DB603CC4CA3A7BC10163D9CA3F973D68B04F22C0E45C',
        '--SocksPort', (9050-i).toString(),
        '--UseBridges', '1',
        '--ClientTransportPlugin', 'obfs4 exec obfs4proxy.exe',
        '--Bridge', 'obfs4 136.61.9.205:9999 BCA9A01D0525CCA0832CEC963570724EE7079925 cert=okCbzFRm58G8f0E0w/wg06JYf+sErNRJvRpPlpHGBpn9CGMLzcdBLTwZ8cSYpX1lXiR+bQ iat-mode=0',
        '--DataDirectory', path.join(__dirname,`Tor${i}\\tor\\tor_data`)
    ];

    const torProcess = spawn(path.join(__dirname, `Tor${i}\\tor\\tor.exe`), torArgs, {
        windowsHide: false,
        stdio: 'ignore'
    });
    tors.push({pr: torProcess,ar: torArgs,er: 0})
}

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

        let proxy_ports = []
        tors.forEach((e)=>{proxy_ports.push(e.ar[5])})
        console.log(proxy_ports)
        workers.push(new Worker('./worker.js', {
            workerData: {
                workerId: i,
                startIdx,
                endIdx,
                hosts,
                startPort,
                portsCount,
                proxy_ip,
                proxy_ports
            }
        }))
    }
    workers.forEach((e) => {
        e.on('message',async (result)=>{
            if(result.reason === 'serverResponse'){
                success++

                const aboutServer = result.json
                console.log(result)
                if(aboutServer.players.online > 0){
                    founded.push({ip: result.server.ip, port: result.server.port, modt: aboutServer.description, version: aboutServer.version.name, player_count: aboutServer.players.online,players: aboutServer.players.sample})
                }
            }if(result.reason === 'serverError'){
                errors++
                tors[result.num].er++
                await restartTor(false,tors[result.num])
                console.log(tors)
            }if(result.reason === 'serverTimeout'){
                errors++
                tors[result.num].er++
                await restartTor(false,tors[result.num])
                console.log(tors)
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
    let ers = []
    tors.forEach((e) => {ers.push(e.er)})
    return {success: success,errors: ers}
})

ipcMain.handle('getResults', () => {
    return founded
})

async function restartTor(manual,tor){
    if ((tor.er % 25 === 0) || manual) {
        return new Promise((resolve, reject) => {
            const socket = net.connect(parseInt(tor.ar[1]), '127.0.0.1', () => {
                socket.write(`AUTHENTICATE "${TOR_PASSWORD}"\r\n`);
            });

            let stage = 0;

            socket.on('data', (data) => {
                const msg = data.toString();
                if (stage === 0 && msg.includes('250 OK')) {
                    stage = 1;
                    socket.write('SIGNAL NEWNYM\r\n');
                } else if (stage === 1 && msg.includes('250 OK')) {
                    console.log(`[${new Date().toLocaleTimeString()}] Tor IP был сменён.`);
                    socket.end();
                    resolve();
                } else if (msg.includes('515')) {
                    reject('Ошибка авторизации. Проверь пароль в torrc и в скрипте.');
                    socket.end();
                }
            });

            socket.on('error', (err) => {
                reject('Ошибка подключения к Tor: ' + err.message);
            });
        });
    }
}