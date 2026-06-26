const { Worker } = require('worker_threads');

const hosts = ["waryfish.aternos.host"];

const startPort = 31413;
const endPort = 31417;

const portsCount = endPort - startPort + 1;
const totalTasks = hosts.length * portsCount;

// Для теста берем 1 воркер
const totalWorkers = 1;
const tasksPerWorker = Math.ceil(totalTasks / totalWorkers);

// Индекс ПЕРВОГО воркера должен быть 0, а не 1
const currentWorkerId = 0;

const startIdx = currentWorkerId * tasksPerWorker;
const endIdx = Math.min(startIdx + tasksPerWorker - 1, totalTasks - 1);

console.log(`Запуск тест-воркера. Индексы: от ${startIdx} до ${endIdx}`);

const worker = new Worker('./worker.js', {
    workerData: {
        workerId: currentWorkerId,
        startIdx,
        endIdx,
        hosts,
        startPort,
        portsCount
    }
});

// Обязательно слушаем события от воркера, чтобы увидеть результат или ошибку
worker.on('message', (msg) => console.log('[Worker Log]:', msg));
worker.on('error', (err) => console.error('[Worker Error]:', err));
worker.on('exit', (code) => console.log(`Воркер завершился с кодом ${code}`));