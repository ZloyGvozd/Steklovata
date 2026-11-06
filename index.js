const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('node:fs/promises');
const fss = require('fs');
const { Worker } = require('worker_threads');
const net = require("net");
const {spawn} = require("child_process");

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 850,
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

const logFilePath = path.join(__dirname, 'app.log');

function logToFile(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    // appendFile создает файл, если его нет, и добавляет запись в конец
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            console.error('Ошибка записи в лог-файл:', err);
        }
    });
}


//Ядро
let workers = []
let errors = 0
let success = 0
let founded = []
//founded.push({ip: "zhopa.aternos.host", port: "19827", modt: "Welcome to the server of Huesos!", version: "26.3", player_count: 1,players: [{"id":"5e6d9af9-67db-388b-8b04-414c8a76161e","name":"Huesos"}], md: [true,true]})

const TOR_PASSWORD = 'pisun';

const NUM_OF_TORS = 40
const NEED_TO_DELETE = false

if(NEED_TO_DELETE) {
    const files = fss.readdirSync("tmp");
    for (const file of files) {
        fss.rmSync(path.join("tmp", file), {recursive: true, force: true});
    }

    for (let i = 0; i < NUM_OF_TORS; i++) {
        const targetDir = path.join(__dirname, 'tmp', `Tor${i}`)
        fss.cpSync('./Tor', targetDir, {recursive: true})
    }
}

let tors = []
for(let i = 0; i < NUM_OF_TORS; i++) {
    const torArgs = [
        '--ControlPort', (9051+i).toString(),
        '--HashedControlPassword', '16:61F657AD90C9A4DB603CC4CA3A7BC10163D9CA3F973D68B04F22C0E45C',
        '--SocksPort', (9050-i).toString(),
        '--UseBridges', '1',
        '--ClientTransportPlugin', 'webtunnel exec pluggable_transports/lyrebird.exe',
        '--Bridge', 'webtunnel [2001:db8:1169:5d59:447d:1feb:3595:b174]:443 9E22636EA817AD4FE43F2EC14DEED5131FED1CB0 url=https://cdn-40.triplebit.dev/aif5ohWa4aWiephu ver=0.0.2',
        '--DataDirectory', path.join(__dirname,`tmp\\Tor${i}\\tor\\tor_data`)
    ];

    const torProcess = spawn(path.join(__dirname, `tmp\\Tor${i}\\tor\\tor.exe`), torArgs, {
        windowsHide: false,
        stdio: "pipe"
    });

    torProcess.stdout.on('data', (data) => {
        false? console.log(`[Tor ${i} STDOUT]: ${data.toString()}`) : undefined;
    });

// Вывод ошибок
    torProcess.stderr.on('data', (data) => {
        console.error(`[Tor ${i} STDERR]: ${data.toString()}`);
    });

// Отслеживание завершения процесса (для диагностики)
    torProcess.on('close', (code) => {
        console.log(`[Tor ${i}] stopped: ${code}`);
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
                if(tors[result.num].er>0) tors[result.num].er -= 0.5
                success++

                const aboutServer = result.json
                //console.log(result)
                if(aboutServer.players.online > 0){
                    logToFile(result.debug)
                    let msg = ""
                    try {
                        const ChatMessage = require('prismarine-chat')(aboutServer.version.name)
                        const rawData = aboutServer.description
                        msg = new ChatMessage(rawData)
                    }catch(e){
                        logToFile("piplich")
                        msg = aboutServer.description
                    }
                    const sd = 'enforcesSecureChat' in aboutServer
                    const fd = 'modinfo' in aboutServer
                    founded.push({ip: result.server.ip, port: result.server.port, modt: msg.toString(), version: aboutServer.version.name, player_count: aboutServer.players.online,players: aboutServer.players.sample,md:[fd,sd]})
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
    if ((tor.er >=50) || manual) {
        tor.er = 0
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

