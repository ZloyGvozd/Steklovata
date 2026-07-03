# Steklovata ![Platform Windows](https://img.shields.io/badge/platform-Windows-0078d7?style=flat-square&logo=windows&logoColor=white) ![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

### 🇷🇺
**Steklovata** - это **интернет-сканер**, предназначеный для большинства популярных Minecraft хостингов, которые имеют **широкий разброс портов** (например, от 10000 до 40000), а так-же ip (или поддомены) нод, **которые вы знаете** хотя бы частично.

В качестве примера код уже настроен на сервера **Aternos**. Для использования поиска по другим хостингам следует изменить `urls.txt`, либо заменить его в интерфейсе, а так же, возможно, сменить диапазон портов на более подходящий. **Я не вижу причин**, почему сканер не станет работать с другими хостингами, но проверялось всё только лишь на aternos.

### Установка и запуск (пока что только под Windows):
1. **Скачайте последнюю сборку с [Releases](https://github.com/ZloyGvozd/Steklovata/releases/tag/v1.0.1)**
2. **Разархивируйте в удобное место**
3. **Установите зависимости в папке проекта:** `npm install`
4. **Установите Bridges в файле по пути:** `Tor\tor\torrc`, их вы можете 
 взять в [@GetBridgesBot](https://t.me/GetBridgesBot)
5. **Запустите** `run.bat`. Или же запустите вручную `npm start`

---
### 🇬🇧
**Steklovata** is an **internet scanner** designed for most popular Minecraft hostings that have **a wide range of ports** (for example, from 10000 to 40000), as well as node IPs (or subdomains) that **you know** at least partially.

As an example, the code is already configured for **Aternos** servers. To search on other hostings, you should modify `urls.txt` or replace it in the interface, and possibly change the port range to a more suitable one. **I see no reason** why the scanner wouldn't work with other hostings, but it has only been tested on Aternos.

### Installation and Launch (currently Windows only):
1. **Download the latest build from [Releases](https://github.com/ZloyGvozd/Steklovata/releases/tag/v1.0.1)**
2. **Unzip it to a convenient location**
3. **Install the dependencies in the project folder:** `npm install`
4. **Set up Bridges in the file at:** `Tor\tor\torrc`. You can get them from [@GetBridgesBot](https://t.me/GetBridgesBot)
5. **Run** `run.bat`. Alternatively, you can start it manually with `npm start`
