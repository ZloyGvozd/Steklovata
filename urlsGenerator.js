const { animals } = require('unique-names-generator');
const dns = require('dns').promises;

const animalsList = animals.map(animal => animal.toLowerCase().replace(/[^a-z0-9]/g, ''));
console.log(`Найдено животных: ${animalsList.length}`);

let somethingFish = []
animalsList.forEach((e) => {
    somethingFish.push(`${e}fish`)
})
animalsList.push(...somethingFish)

async function checkSubdomain(subdomain) {
    try {
        const addresses = await dns.resolve(subdomain, 'A');
        console.log(`Поддомен ${subdomain} существует и активен. IP:`, addresses);
        return true;
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.log(`Поддомена ${subdomain} не существует.`);
        } else if (error.code === 'ENODATA') {
            console.log(`Поддомен ${subdomain} существует, но нет A-записи.`);
        } else {
            console.error(`Ошибка: ${error.message}`);
        }
        return false;
    }
}

// Оборачиваем основной код в асинхронную функцию, чтобы использовать await
async function main() {
    let outList = [];

    // Используем обычный цикл for...of, который поддерживает await
    for (const e of animalsList) {
        const domain = `${e}.aternos.host`;
        const res = await checkSubdomain(domain); // Теперь мы РЕАЛЬНО ждем ответа

        if (res) {
            outList.push(domain);
        }
    }

    console.log("\n--- Результат проверки ---");
    console.log(outList.join("\n"));
}

main();