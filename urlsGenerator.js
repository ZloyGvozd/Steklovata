const { animals } = require('unique-names-generator');
const dns = require('dns').promises;

const animalsList = animals.map(animal => animal.toLowerCase().replace(/[^a-z0-9]/g, ''));
console.log(`Найдено животных: ${animalsList.length}`);

ai_gen = "aardwolf, aardvark, alligator, alpaca, anaconda, ant, armadillo, axolotl, babirusa, badger, bandicoot, bison, boar, bobcat, buffalo, bunny, camel, caracal, cat, cheetah, chinchilla, coati, cockatoo, " +
    "coyote, cougar, cow, dingo, dog, dolphin, elephant, elk, ermine, ferret, gazelle, giraffe, goat, gorilla, gopher, guanaco, hamster, hare, hedgehog, hippopotamus, ibex, iguana, jackal, " +
    "jaguar, kangaroo, koala, lemming, lion, lizard, llama, lynx, macaw, magpie, manatee, mandrill, meerkat, moose, mouse, mule, narwhal, otter, panda, pangolin, parrot, peacock, pelican, penguin, pig, " +
    "platypus, polar-bear, poodle, porcupine, possum, prairie-dog, pug, python, rabbit, racoon, ram, rat, rhinoceros, seal, shark, sheep, sloth, snake, squirrel, stag, starfish, swan, tapir, tiger, toad, " +
    "tuatara, turkey, turkey-vulture, wallaby, walrus, wasp, wombat, wolf, wolverine, woodchuck, yak, zebra, albatross, auklet, bald-eagle, bat, beaver, blue-jay, buzzard, cardinal, catbird, chaffinch, chicken, cockatiel, condor, coucal, crow, curlew, dodo, dove, duck, egret, emu, flamingo, goldfinch, goose, " +
    "grouse, gull, heron, jay, kestrel, kiwi, lark, loon, magpie, mandarin-duck, mallard, manakin, merlin, mockingbird, nightingale, nuthatch, oriole, owl, parakeet, peacock, pelican, penguin, petrel, " +
    "phalarope, pigeon, pintail, plover, puffin, quetzal, raven, robin, seagull, sparrow, starling, swan, swift, thrush, titmouse, toucan, vulture, wren, alligator, anaconda, bearded-dragon, burmese-python, caimen, chameleon, cobra, coral-snake, gecko, iguana, lizard, newt, rattlesnake, salamander, snake, tortoise, tuatara, turtle, " +
    "barracuda, betta-fish, blenny, carp, catfish, clam, cod, dolphin-fish, eel, flounder, goldfish, gourami, guppy, halibut, herring, killifish, loach, mahi-mahi, marlin, moonfish, manta-ray, moray-eel, " +
    "mussel, octopus, parrotfish, piranha, platy-fish, pollock, pufferfish, remora, salmon, scallop, sea-bass, seahorse, shark, skates-and-rays, sole, squirrelfish, squid, starfish, sturgeon, sunfish, tilefish, " +
    "tuna, walleye, wrasse, ants, beetle, centipede, crayfish, crab, dragonfly, flea, fly, jellyfish, ladybug, lobster, millipede, mosquito, moth, octopus, scorpion, sea-anemone, sea-urchin, snail, spider, wasp, worm, axolotl, chameleon, platypus, tuatara"

ai_gen = ai_gen.replace("\n", ", ")
to_add = ai_gen.split(", ")
animalsList.push(...to_add)

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
    for (const e of [...new Set(animalsList)]) {
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