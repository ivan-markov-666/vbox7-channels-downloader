import { Builder, WebDriver, WebElement, By, Key, until } from 'selenium-webdriver';
import 'chromedriver';
import axios from 'axios';
import fs from 'fs';
import * as puppeteer from 'puppeteer'; // Използвайте такова импортиране за TypeScript

require('dotenv').config();


const downloadFolder = process.env.DOWNLOAD_PATH;
// Проверка с оператора == null
if (downloadFolder == null) {
    throw new Error('Стойността на downloadFolder е null.');
} else {
    console.error('Стойността на downloadFolder не е null и е: ' + downloadFolder);
}

const downloadChannelsTxtFilePath = process.env.DOWNLOAD_CHANNELS_TXT_FILE_PATH;
// Проверка с оператора == null
if (downloadChannelsTxtFilePath == null) {
    throw new Error('Стойността на downloadChannelsTxtFilePath е null.');
} else {
    console.error('Стойността на downloadChannelsTxtFilePath не е null и е: ' + downloadChannelsTxtFilePath);
}

// Get the current time in unix format
const currentTime = getCurrentUnixTime();

const vbox7ChannelName = '//*[@class="left-col"]//h2//span';
const channelPages = `//*[@class='page-link']`;
const acceptCookiesButton = `//*[@id='didomi-notice-agree-button']`;
const allVideosInThatPage = `//*[@class="card video-cell "]/div/h3/a`;
const logFilePath = `./not-downloaded-videos-${currentTime}.txt`;

const channelsInArray = readLinesFromFile(downloadChannelsTxtFilePath);

async function vbox7() {
    // Добавяне на заглавие в log файла
    writeToLogFile(logFilePath, `Следните видеа не бяха свалени:\n\n`);

    let driver = await new Builder().forBrowser('chrome').build();
    try {

        for (let channelIndex = 0; channelIndex < channelsInArray.length; channelIndex++) {

            const vbox7ChannelUrl = channelsInArray[channelIndex];
            console.log(`--------------------- Channel URL: ${vbox7ChannelUrl}`);
            await navigateAndWaitForPageLoad(driver, vbox7ChannelUrl);
            try {
                await clickElement(driver, acceptCookiesButton);
            } catch (error) {
                console.log("Cookies банерът не съществува.");
            }
            const channelNameElement = await findElement(driver, vbox7ChannelName);
            const channelName = await getElementText(channelNameElement);
            // Създаване на нова папка за свалянето на видео файловете от конкретния канал в vbox7
            const folderPath = `${downloadFolder}/${sanitizeFileName(channelName)}`;

            // Проверка дали директорията съществува. Това е папката с името на канала, която съдържа видео файловете от vbox7
            const isExists = isDirectoryExists(folderPath);
            if (isExists) {
                // Ако папката съществува, я изтрийте
                console.log(`Папката "${folderPath}" вече съществува.`);
            }
            else {
                // Създайте новата папка
                fs.mkdirSync(folderPath);
                console.log(`Създадена нова папка за канал "${folderPath}".`);
            }

            // Проверка дали елементът allPages съществува
            const allPagesExistsBoolean = await isElementPresent(driver, By.xpath(channelPages), 20000);
            console.log(`Елементът allPages съществува: ${allPagesExistsBoolean}`);

            let allPagesExists = 0;
            if (allPagesExistsBoolean) {
                const getChannelPages = await countElements(driver, channelPages);
                const channelPagesAllPagesCounted = `(${channelPages})[${getChannelPages - 1}]`;
                const allPagesExistsText = await getElementText(await findElement(driver, channelPagesAllPagesCounted));
                // Convert allPagesExistsText from string to number
                allPagesExists = parseInt(allPagesExistsText, 10);
                console.log(`--------------------- All pages for that channel: ${allPagesExists}`);
            } else {
                // Your code for when the element does not exist
            }

            // Минаване през всички страници на канала
            for (let pageIndex = 1; pageIndex <= allPagesExists; pageIndex++) {
                const currentPageUrl = `${vbox7ChannelUrl}?page=${pageIndex}`;
                // Навигиране до текущата страница
                await navigateAndWaitForPageLoad(driver, currentPageUrl);
                // Вземане на всички видеа на текущата страница
                const allVideos = await countElements(driver, allVideosInThatPage);
                // Минаване през всички видеа на текущата страница
                for (let videoIndex = 1; videoIndex <= allVideos; videoIndex++) {
                    let videoRetryCount = 0;
                    const maxVideoRetries = 3;

                    while (videoRetryCount < maxVideoRetries) {
                        // Get the locator of element that we are using to navigate to the video page and click on it.
                        let videoLinkLocator = `(${allVideosInThatPage})[${videoIndex}]`;
                        // Get the link of the video.
                        const videoLink = await findElement(driver, videoLinkLocator);
                        // Get the name of the video.
                        const videoName = await getElementText(videoLink);
                        // Get the URL of the video.
                        const videoUrl = await getAttributeOfElement(driver, videoLinkLocator, "href");
                        // Извикване на extractMp4Urls за да получите MP4 файловете от страницата
                        const mp4Files = await extractMp4Urls(videoUrl);
                        const uniqueMp4Files = uniqueMp4Urls(mp4Files);

                        // Define the strings that we are looking for in the array of mp4 files.
                        const audioFileExist = "track1";
                        const videoFileExist = "track2";

                        let filteredMp4Files: string[] = [];
                        if (uniqueMp4Files.some(element => element.includes(audioFileExist)) || uniqueMp4Files.some(element => element.includes(videoFileExist))) {
                            console.log("Видеата се намират на новите сървъри на vbox7.");
                            filteredMp4Files = filterMp4Tracks(uniqueMp4Files);

                            if (filteredMp4Files.length === 0) {
                                console.log(`Неуспешно извличане на MP4 URL адреси за видео '${videoName} номер ${videoIndex}. Опит ${videoRetryCount + 1} от ${maxVideoRetries}.`);
                                videoRetryCount++;
                                continue;
                            }
                        }
                        else if (!uniqueMp4Files.some(element => element.includes(audioFileExist)) && !uniqueMp4Files.some(element => element.includes(videoFileExist))) {
                            console.log("Видеото се намира на старите сървъри на vbox7.");
                            filteredMp4Files = filterNonBlankTracks(uniqueMp4Files);

                            if (filteredMp4Files.length === 0) {
                                console.log(`Неуспешно извличане на MP4 URL адреси за видео '${videoName} номер ${videoIndex}. Опит ${videoRetryCount + 1} от ${maxVideoRetries}.`);
                                videoRetryCount++;
                                if (videoRetryCount === maxVideoRetries) {
                                    console.log("Достигнат максимален брой опити за извличане на видео файлове. Продължавам със следващия видео клип.");
                                    writeToLogFile(logFilePath, `Канал: ${channelName}\nВидео файл с име: ${videoUrl}\nURL адрес на видео файла: ${videoUrl}\n\n`);
                                }
                                continue;
                            }
                        }
                        else {
                            throw new Error("Изглежда, че mp4 файловете не идват нито от старите, нито от новите сървъри на Vbox7, или има друга грешка. При всяка вероятност трябва да се разбере, защо сме изпаднали в този statement. Тоест... happy debbuging :) !");
                        }

                        // Сваляне на MP4 файловете от страницата и записването им в папката за сваляне
                        for (let fileIndex = 0; fileIndex < filteredMp4Files.length; fileIndex++) {
                            // Саниране на името на видео файла (заместване на недопустимите символи)
                            const sanitizedVideoName = sanitizeFileName(videoName);
                            const maxRetries = 3;
                            for (let retry = 0; retry < maxRetries; retry++) {
                                try {
                                    if (filteredMp4Files[fileIndex].includes('track1')) {


                                        const onlyVideoFilePath = `${folderPath}/${sanitizedVideoName}-video.mp4`;
                                        const isExists = isFileExists(onlyVideoFilePath);
                                        if (isExists) {
                                            console.log(`Файлът "${sanitizedVideoName}" вече съществува (т.е. няма да се сваля).`);
                                            break;
                                        }
                                        await downloadMp4File(filteredMp4Files[fileIndex], onlyVideoFilePath);
                                    } else if (filteredMp4Files[fileIndex].includes('track2')) {
                                        const audioFilePath = `${folderPath}/${sanitizedVideoName}-audio.mp4`;
                                        const isExists = isFileExists(audioFilePath);
                                        if (isExists) {
                                            console.log(`Файлът "${sanitizedVideoName}" вече съществува (т.е. няма да се сваля).`);
                                            break;
                                        }
                                        await downloadMp4File(filteredMp4Files[fileIndex], audioFilePath);
                                    }
                                    else if (filteredMp4Files[fileIndex] && fileIndex == 0) {
                                        const videoFilePath = `${folderPath}/${sanitizedVideoName}.mp4`;
                                        const isExists = isFileExists(videoFilePath);
                                        if (isExists) {
                                            console.log(`Файлът "${sanitizedVideoName}" вече съществува (т.е. няма да се сваля).`);
                                            break;
                                        }
                                        await downloadMp4File(filteredMp4Files[fileIndex], videoFilePath);
                                    }
                                    else {
                                        throw new Error(`Изглежда, че не са подадени mp4 файлове за сваляне. Този statement не трябва да се случва. Вероятно има друг сценарий (за начина по който Vbox7 предоставят видеата си) който не е обхванат тук. Тоест happy debbuging :) !`);
                                    }
                                    console.log(`Файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален след ${retry + 1} опит(а).`);
                                    break;
                                } catch (error) {
                                    console.error(`Грешка при свалянето на файл '${sanitizedVideoName}' от канала '${channelName}'.\nНаправени са ${retry + 1} опита от общо ${maxRetries} зададени.\nПрихванатата грешка е:`, error);
                                    console.error(`Видео файл с име: ${sanitizedVideoName} и URL адрес: ${videoUrl} не беше свален!`)
                                    if (retry === maxRetries) {
                                        console.log("Достигнати са максималения брой опити за сваляне на един файл. Продължаваме със следващия файл.");
                                        writeToLogFile(logFilePath, `Канал: ${channelName}\nВидео файл с име: ${videoUrl}\n                                                                    URL адрес на видео файла: ${videoUrl}\n\n`);
                                    }
                                }
                            }
                        }
                        break; // Излизаме от while цикъла, ако успешно извлечем и свалим файловете
                    }
                }
            }
        }
    } finally {
        await driver.quit();
    }
}


vbox7();

// Метод за намиране на елемент по XPath
async function findElement(driver: WebDriver, xpath: string): Promise<WebElement> {
    // Проверка за уникалност на елемента
    const elements = await driver.findElements(By.xpath(xpath));
    if (elements.length === 0) {
        throw new Error(`No element found for XPath: ${xpath}`);
    } else if (elements.length > 1) {
        throw new Error(`More than one element found for XPath: ${xpath}`);
    }

    // Получаване на елемента
    const element = elements[0];

    // Проверка, че елементът е зареден и видим
    await driver.wait(until.elementIsVisible(element));

    // Проверка, че елементът е активиран
    if (!await element.isEnabled()) {
        throw new Error(`Element found by XPath ${xpath} is not enabled`);
    }

    return element;
}

// Метод за намиране на всички елементи по XPath
async function countElements(driver: WebDriver, xpath: string): Promise<number> {
    const elements = await driver.findElements(By.xpath(xpath));
    return elements.length;
}

// Проверка дали даден елемент съществува в DOM дървото
async function isElementPresent(driver: WebDriver, by: By, timeout: number): Promise<boolean> {
    try {
        await driver.wait(until.elementLocated(by), timeout);
        return true;
    } catch (error) {
        return false;
    }
}



async function navigateAndWaitForPageLoad(driver: WebDriver, url: string): Promise<void> {
    await driver.get(url); // Навигира до URL
    await driver.wait(async () => {
        const readyState = await driver.executeScript<string>("return document.readyState");
        return readyState === "complete";
    }, 30000); // Изчаква до 30 секунди за зареждане на страницата

    const currentUrl = await driver.getCurrentUrl(); // Вземете текущия URL
    if (currentUrl !== url) {
        throw new Error(`URL mismatch: Expected ${url} but found ${currentUrl}`);
    }
}

// Метод за кликване върху елемент, идентифициран чрез XPath
async function clickElement(driver: WebDriver, xpath: string): Promise<void> {
    const element = await findElement(driver, xpath);
    await element.click();
}

// Метод за вземане на текста на елемент.
async function getElementText(element: WebElement): Promise<string> {
    return await element.getText();
}

async function extractMp4Urls(url: string): Promise<string[]> { // Типизиране на 'url' и връщаемия тип
    const browser = await puppeteer.launch({
        headless: "new" // Използване на новия headless режим
    });
    const page = await browser.newPage();
    const mp4Urls: string[] = []; // Указване на типа на mp4Urls

    // Наслушване на мрежовия трафик
    page.on('response', (response: any) => {
        const url = response.url();
        if (url.endsWith('.mp4')) {
            mp4Urls.push(url);
        }
    });

    await page.goto(url);
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
    return mp4Urls;
}


// Метод за вземане на стойността на атрибут от елемент.
async function getAttributeOfElement(driver: WebDriver, xpath: string, attributeName: string): Promise<string> {
    const element = await findElement(driver, xpath);
    return await element.getAttribute(attributeName);
}

// Редуциране на масива до уникални стойности (използва си при вземане на MP4 файловете)
function uniqueMp4Urls(mp4Urls: string[]): string[] {
    const uniqueUrls: string[] = [];
    mp4Urls.forEach((url: string) => {
        if (!uniqueUrls.includes(url)) {
            uniqueUrls.push(url);
        }
    });
    return uniqueUrls;
}

// Филтриране на MP4 файловете по определени критерии (използва си при вземане на MP4 файловете)
function filterMp4Tracks(mp4Urls: string[]): string[] {
    return mp4Urls.filter(url => url.includes('track1') || url.includes('track2'));
}

// Филтриране на MP4 файловете по определени критерии (използва си при вземане на MP4 файловете)
function filterNonBlankTracks(mp4Urls: string[]): string[] {
    return mp4Urls.filter(url => !url.includes('blank'));
}


// Метод за изтегляне на MP4 файлове
async function downloadMp4File(url: string, filePath: string): Promise<void> {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}


// Метод за изтегляне на MP4 файлове
async function createOrDeleteFolder(folderPath: string) {
    try {
        // Проверете дали папката съществува
        if (fs.existsSync(folderPath)) {
            // Ако папката съществува, я изтрийте
            fs.rmdirSync(folderPath, { recursive: true });
            console.log(`Папката "${folderPath}" беше изтрита.`);
        }

        // Създайте новата папка
        fs.mkdirSync(folderPath);
        console.log(`Създадена нова папка "${folderPath}".`);
    } catch (err) {
        console.error('Възникна грешка при създаване или изтриване на папката:', err);
    }
}

// Метод за саниране на името на файла (заместване на недопустимите символи)
function sanitizeFileName(fileName: string): string {
    return fileName.replace(/[/\\?%*:|"<>]/g, '-');
}

// Метод за четене на редове от файл и връщане като масив (използва се при четене на списък с URL адреси)
function readLinesFromFile(filePath: string) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Разделяне на съдържанието на редове и премахване на символите за нов ред
        return fileContent.split(/\r?\n/).map(line => line.trim());
    } catch (error) {
        console.error(`Грешка при четене на файла: ${error}`);
        return [];
    }
}

// Метод за записване на съобщение в log файл
function writeToLogFile(logFilePath: string, message: string) {
    try {
        const logMessage = `${message}\n`;
        fs.appendFileSync(logFilePath, logMessage, 'utf8');
    } catch (error) {
        console.error(`Грешка при запис в log файла: ${error}`);
    }
}

// Метод за изтриване на файл
function deleteFile(filePath: string) {
    try {
        fs.unlinkSync(filePath);
        console.log(`Файлът '${filePath}' беше успешно изтрит.`);
    } catch (error) {
        console.error(`Грешка при изтриване на файла: ${error}`);
    }
}

// Вземане на текущото време във unix формат
function getCurrentUnixTime() {
    return Math.floor(Date.now() / 1000);
}

// Метод за проверка дали дадена директория съществува
function isDirectoryExists(path: string): boolean {
    try {
        // Стартирайте стандартния метод на fs за проверка на съществуването на директория
        fs.statSync(path);

        // Ако успеете да извършите горната операция без грешки, директорията съществува
        return true;
    } catch (err) {
        // Ако стане грешка, директорията не съществува
        return false;
    }
}

// Метод за проверка дали даден файл съществува
function isFileExists(filePath: string): boolean {
    try {
        // Стартирайте стандартния метод на fs за проверка на съществуването на файл
        fs.statSync(filePath);

        // Ако успеете да извършите горната операция без грешки, файла съществува
        return true;
    } catch (err) {
        // Ако стане грешка, файла не съществува
        return false;
    }
}