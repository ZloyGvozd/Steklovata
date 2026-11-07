const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('node:fs/promises');
const fss = require('fs');
const { Worker } = require('worker_threads');
const net = require("net");
const {spawn} = require("child_process");
const starost = require("./Starost")

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
        '--Bridge', 'webtunnel [2001:db8:3ce4:c7c7:1316:3072:b8e9:b915]:443 07E8A7DFCA7B76DD0E2F1E8C6C74D9910AAF279E url=https://shenvalleygamers.com/7HxRIWqsmkPOemUcLFTGuPaW ver=0.0.4',
        '--DataDirectory', path.join(__dirname,`tmp\\Tor${i}\\tor\\tor_data`)
    ];

    const torProcess = spawn(path.join(__dirname, `tmp\\Tor${i}\\tor\\tor.exe`), torArgs, {
        windowsHide: false,
        stdio: "pipe"
    });

    torProcess.stdout.on('data', async (data) => {
        true? console.log(`[Tor ${i} STDOUT]: ${data.toString()}`) : undefined;
        if(data.toString().includes("We tried for 15 seconds to connect to")){
            if(tors[i].er !== undefined){
                errors++
                tors[i].er++
                await restartTor(false,tors[i])
            }
        }
    });

// Вывод ошибок
    torProcess.stderr.on('data', (data) => {
        console.error(`[Tor ${i} STDERR]: ${data.toString()}`);
    });

// Отслеживание завершения процесса (для диагностики)
    torProcess.on('close', (code) => {
        console.log(`[Tor ${i}] stopped: ${code}`);
        torProcess[i] = spawn(path.join(__dirname, `tmp\\Tor${i}\\tor\\tor.exe`), torArgs, {
            windowsHide: false,
            stdio: "pipe"
        })
    });

    tors.push({pr: torProcess,ar: torArgs,er: 0})
}

function getShuffledPortOffset(index, max, salt) {
    // Используем простую хэш-функцию (Knuth's multiplicative method)
    // Число 2654435761 — это золотое сечение для 32-битных чисел, отлично распределяет
    const hash = Math.imul(index+salt, 2654435761);
    return Math.abs(hash) % max;
}

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function contWork(){
    workers.forEach((e) => {
        if(!e.inWork) {
            const salt = Math.floor(Math.random() * 1000000);
            const i = e.currentI
            const ipIndex = Math.floor(i / e.portsCount);
            const currentIp = e.hosts[ipIndex];
            const sequentialPortOffset = i % e.portsCount;
            const randomPortOffset = getShuffledPortOffset(sequentialPortOffset, e.portsCount, salt);
            const currentPort = e.startPort + randomPortOffset;
            const randomPort = getRandomInt(0, e.proxy_ports.length)

            starost.send(e.proxy_ip, parseInt(e.proxy_ports[randomPort]), currentIp, currentPort, randomPort,e.workerId)
            //starost.send("127.0.0.1", 10808, currentIp, currentPort, randomPort, e.workerId)
            e.inWork = true
            e.currentI +=1
        }
    })
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
    let proxy_ports = []
    tors.forEach((e)=>{proxy_ports.push(e.ar[5])})
    console.log(proxy_ports)

    //создание воркеров
    for(let i=0; i<treads; i++){
        const startIdx = i * tasksPerWorker;
        const endIdx = Math.min(startIdx + tasksPerWorker - 1, totalTasks - 1);
        workers.push({
                workerId: i,
                startIdx: startIdx,
                endIdx: endIdx,
                hosts: hosts,
                startPort: startPort,
                portsCount: portsCount,
                proxy_ip: proxy_ip,
                proxy_ports: proxy_ports,
                inWork: false,
                currentI: startIdx
        })
    }
    contWork()
    console.log(hosts,startPort,endPort,tasksPerWorker)
})

function serverResponse(result){
    //console.log("kruto",result)
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
    setTimeout(()=>{
        workers[result.ID].inWork = false
        contWork()
    },getRandomArbitrary(5000,10000))
}

async function serverError(result){
    errors++
    tors[result.num].er++
    await restartTor(false,tors[result.num])
    console.log(tors)
    setTimeout(()=>{
        workers[result.ID].inWork = false
        contWork()
    },getRandomArbitrary(5000,10000))
}

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

exports.serverResponse = serverResponse
exports.serverError = serverError