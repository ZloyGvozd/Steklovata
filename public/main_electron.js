const ips = document.getElementById("inp1")
const ports = document.getElementById("inp2")
const treads = document.getElementById("inp3")
const custom = document.getElementById("custom")
const proxy_ip = document.getElementById("inp4")
const proxy_port = document.getElementById("inp5")
const start_stop = document.getElementById("start/stop")
const err = document.getElementById("error")
const all = document.getElementById("all")
const find = document.getElementById("find")
const log_text = document.getElementById("log")
const finded = document.getElementById("finded")

const chart = new SmoothieChart({
    grid: {
        strokeStyle: '#2c2c2c', // Цвет линий сетки
        fillStyle: '#111111',   // Фон графика
        lineWidth: 1,
        millisPerLine: 1000,    // Шаг сетки (1 секунда)
        verticalSections: 20     // Количество горизонтальных делений
    },
    labels: {
        fillStyle: '#888888',   // Цвет текста с делениями
        fontSize: 12
    },
    millisPerPixel: 115,         // Скорость прокрутки (меньше = быстрее)
    interpolation: 'linear'     // Сглаживание углов ('linear', 'step', или 'bezier')
});

// Привязываем график к нашему тегу <canvas>
chart.streamTo(document.getElementById("log-canvas"), 500);

const logYMetricLine = new TimeSeries();
const logRMetricLine = new TimeSeries();
chart.addTimeSeries(logYMetricLine, {
    strokeStyle: '#f7ff00',
    fillStyle: 'rgba(255,204,0,0.05)',
    lineWidth: 1
});
chart.addTimeSeries(logRMetricLine, {
    strokeStyle: '#ff0000',
    fillStyle: 'rgba(255,0,0,0.05)',
    lineWidth: 1
});

function addYLogValue(value) {
    const timestamp = new Date().getTime();
    logYMetricLine.append(timestamp, value);
}
function addRLogValue(value) {
    const timestamp = new Date().getTime();
    logRMetricLine.append(timestamp, value);
}



let started = false;

function copyText(element) {
    const text = element.textContent;

    navigator.clipboard.writeText(text)
        .then(() => {
            notification("скопировано: " + text)
        })
        .catch(err => {
            console.error("Ошибка копирования: ", err);
        });
}
function notification(text){
    const notification = document.getElementById('copyNotification');
    notification.innerHTML = text
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000); // Уведомление исчезнет через 2 секунды
}

let interval

start_stop.onclick = () =>{
    started = !started
    start_stop.innerHTML = started? "стоп" : "старт"
    started? chart.start() : chart.stop()
    started? window.electronAPI.runSearch(ips.value,ports.value,treads.value,proxy_ip.value,proxy_port.value) : window.electronAPI.stopSearch()
    if(started){
        interval = setInterval(async () => {
            const stats = await window.electronAPI.getStats()
            addYLogValue(stats.success)
            addRLogValue(stats.errors)
            console.log(stats)
        },100)
    }else{
        clearInterval(interval)
    }
}
let LastResults = []
setInterval(async () => {
    const results = await window.electronAPI.getResults()
    if(results !== LastResults){
        LastResults = results

    }
},500)

function toggleActive() {
    this.classList.toggle('active');
}
chart.stop()

console.warn("котенко здесь нет")