/**
 * Това е скрипт за сваляне на видеата на цели канали от vbox7.com.
 * Коментарите са на нашия си език (с малки изключения), защото този код е предназначен за българи.
 */

import { Builder, WebDriver, WebElement, By, until } from 'selenium-webdriver';
import 'chromedriver';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import * as puppeteer from 'puppeteer'; // Използвайте такова импортиране за TypeScript
import { Options } from 'selenium-webdriver/chrome';

require('dotenv').config();

// Get the current time in unix format
const currentTime = getCurrentUnixTime();
// Дефинираме локаторите използвани в страниците на vbox7
const vbox7ChannelName = '//*[@class="left-col"]//h2//span';
const channelPages = `//*[@class='page-link']`;
const acceptCookiesButton = `//*[@id='didomi-notice-agree-button']`;
const allVideosInThatPage = `//*[@class="card video-cell "]/div/h3/a`;
const logFilePath_videosWasntDownloaded = `./logs/not-downloaded-videos-${currentTime}.txt`;
const allLogFile = `./logs/all-channels${currentTime}.txt`;
writeToLogFile(allLogFile, `Целият лог:\n\n`);

const downloadFolder = process.env.DOWNLOAD_PATH;
// Проверка с оператора == null
if (downloadFolder == null) {
    throw new Error('Стойността на downloadFolder е null.');
} else {
    informMessage(`Стойността на downloadFolder е ${downloadFolder} и е валидна.`);
}
if (!isDirectoryExists(downloadFolder)) {
    alertMessage(`Папката ${downloadFolder} НЕ съществува. Ще я създам за теб.`);
    createFolderIfNotExists(downloadFolder);
}

const downloadChannelsTxtFilePath = process.env.DOWNLOAD_CHANNELS_TXT_FILE_PATH;
// Проверка с оператора == null
if (downloadChannelsTxtFilePath == null) {
    throw new Error('Стойността на downloadChannelsTxtFilePath е null.');
} else {
    informMessage(`Стойността на downloadFolder е ${downloadChannelsTxtFilePath} и е валидна.`);
}

// Проверяваме дали TXT файла съдържащ vbox7 каналите за сваляне съществува, в него трябва да има поне една стойност.
const fileExists = doesFileExist(downloadChannelsTxtFilePath);
if (!fileExists) {
    throw new Error(`Файлът ${downloadChannelsTxtFilePath} НЕ съществува. Създайте го и добавете vbox7 каналите за сваляне в него.`);
}

const headlessMode = process.env.HEADLESS;
// Проверка с оператора == null
if (headlessMode == null) {
    throw new Error('Стойността на headlessMode е null.');
} else {
    informMessage(`Стойността на headlessMode е ${headlessMode} и е валидна.`);
}

// Проверка дали стойността на headlessMode е true или false - тази валидация е lame хак за да се избегне грешката 'This comparison appears to be unintentional because the types '"true"' and '"false"' have no overlap.'.
if (headlessMode !== 'true') {
    if (headlessMode !== 'false') {
        throw new Error(`Стойността на 'HEADLESS' от '.env' файла трябва да е 'true' или 'false'. Изглежда, че стойността е ${headlessMode}, което е различно от 'true' или 'false'. Моля променете стойността на 'HEADLESS' в '.env' файла и опитайте отново.`);
    }
}

// Проверка дали съществува папката за сваляне на видео файловете от vbox7
createFolderIfNotExists(`./logs/`);
// Дефиниране на пътя на файла който съдържа списък с URL адреси на vbox7 каналите за сваляне
const channelsInArray = readLinesFromFile(downloadChannelsTxtFilePath);

// Това е основния метод в този файл. Той отговаря за извикването на всички останали методи и за изпълнението на основната логика на скрипта за сваляне на видео файлове от vbox7 канали.
// Знам, че е направен lame, бързах да завърша скрипта възможно най-бързо. А й нали работи ;).
export async function vbox7() {
    // Добавяне на заглавие в log файловете
    writeToLogFile(logFilePath_videosWasntDownloaded, `Ако виждате стойности по-долу в този log файл, това означава, че поради някаква причина някои видеа не са се свалили.\nТези видеа са добавени в този log и могат да се свалят ръчно с помоща на един от двата инструмента посочени в секция 'Alternatives' от README.md файла.\n\nВидеа които не са се свалили:\n`);
    // Да си дефинираме драйвъра
    let driver;

    // И да решим дали ще е headless или не
    if (headlessMode === 'true') {
        // Настройка на опции за Chrome, за да работи в headless режим
        let chromeOptions = new Options();
        chromeOptions.addArguments("--headless").addExtensions('C:/Users/test657/Desktop/vbox7/vbox7-channels-downloader/GIGHMMPIOBKLFEPJOCNAMGKKBIGLIDOM_5_18_0_0.crx');
        // Стартиране на Chrome браузъра в headless режим
        driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
    }
    else if (headlessMode === 'false') {
        // // Стартиране на Chrome браузъра използвайки selenium-webdriver и chromedriver.
        driver = await new Builder().forBrowser('chrome').build();
    }
    else {
        throw new Error(`Тази грешка НИКОГА не трябва да се случва. Все пак ако се случи, виж повече информация: Стойността на 'HEADLESS' от '.env' файла трябва да е 'true' или 'false'. Изглежда, че стойността е ${headlessMode}, което е различно от 'true' или 'false'. Моля променете стойността на 'HEADLESS' в '.env' файла и опитайте отново.`);
    }

    // Започва се...
    try {
        // Въртим толкова пъти, колкото канала сме вкарали в txt файла
        for (let channelIndex = 0; channelIndex < channelsInArray.length; channelIndex++) {
            // Вземаме URL адреса на канала
            const vbox7ChannelUrl = channelsInArray[channelIndex];
            informMessage(`URL на канала който ще скрапваме: ${vbox7ChannelUrl}`);
            await navigateAndWaitForPageLoad(driver, vbox7ChannelUrl);
            try {
                await clickElement(driver, acceptCookiesButton);
            } catch (error) {
                informMessage(`Cookies банерът не съществува. Продължаваме напред.`);
            }
            const channelNameElement = await findElement(driver, vbox7ChannelName);
            const channelName = await getElementText(channelNameElement);
            // Създаване на нова папка за свалянето на видео файловете от конкретния канал в vbox7
            const folderPath = `${downloadFolder}/${sanitizeFileName(channelName)}`;

            // Проверка дали директорията съществува. Това е папката с името на канала, която съдържа видео файловете от vbox7
            const isDirExists = isDirectoryExists(folderPath);
            if (isDirExists) {
                // Ако папката съществува, я изтрийте
                informMessage(`Папката "${folderPath}" вече съществува.`);
            }
            else {
                // Създайте новата папка
                fs.mkdirSync(folderPath);
                informMessage(`Създадена е нова папка за канал "${folderPath}".`);
            }

            // Проверка дали елементът allPages съществува
            const allPagesExistsBoolean = await isElementPresent(driver, By.xpath(channelPages), 20000);

            let allPagesExists = 0;
            if (allPagesExistsBoolean) {
                informMessage(`Елементът allPages съществува: ${allPagesExistsBoolean}`);
                const getChannelPages = await countElements(driver, channelPages);
                const channelPagesAllPagesCounted = `(${channelPages})[${getChannelPages - 1}]`;
                const allPagesExistsText = await getElementText(await findElement(driver, channelPagesAllPagesCounted));
                // Convert allPagesExistsText from string to number
                allPagesExists = parseInt(allPagesExistsText, 10);
                informMessage(`Този канал има общо ${allPagesExists} страници с видеа. Това прави между ${allPagesExists + 1} и ${allPagesExists + 20} видео файла.`);
            } else {
                allPagesExists = 1;
                informMessage(`Елементът allPages НЕ съществува: ${allPagesExistsBoolean}. Това означава, че този канал има само една страница с видеа. Това прави между 1 и 20 видео файла.`);
            }

            // Минаване през всички страници на канала
            for (let pageIndex = 1; pageIndex <= allPagesExists; pageIndex++) {
                // Дефинираме URL адреса на текущата страница с видео файлове.
                const currentPageUrl = `${vbox7ChannelUrl}?page=${pageIndex}`;
                // Навигиране до текущата страница
                await navigateAndWaitForPageLoad(driver, currentPageUrl);
                // Вземане на всички видеа на текущата страница
                const allVideos = await countElements(driver, allVideosInThatPage);
                // Минаване през всички видеа на текущата страница
                for (let videoIndex = 1; videoIndex <= allVideos; videoIndex++) {
                    // Това са променливи (флагове) използвани за изготвянето на механизъм за повторен опит за сваляне, ако не успеем да извлечем URL адресите на видео файловете от vbox7.
                    // Първо ползвах опцията, после добавих и втори подход за изтегляне на видеата които бяха зад login wall. Тоест механизма е оставен като функционалност, но не се използва, защото в моемнта няма да се опита отново да свали файла, ако не успее. Файловете които не могат да се свалят, са недостъпни, защото самите Vbox7 не могат да ги предоставят, но имат линкове за тях.
                    let videoRetryCount = 0;
                    const maxVideoRetries = 1;
                    // И започваме да върим толкова пъти, колкото е максималния брой опити за сваляне на видео файлове от vbox7.
                    while (videoRetryCount < maxVideoRetries) {
                        // Get the locator of element that we are using to navigate to the video page and click on it.
                        let videoLinkLocator = `(${allVideosInThatPage})[${videoIndex}]`;
                        // Get the link of the video.
                        const videoLink = await findElement(driver, videoLinkLocator);
                        // Get the name of the video.
                        const videoName = await getElementText(videoLink);
                        // Саниране на името на видео файла (заместване на недопустимите символи)
                        const sanitizedVideoName = sanitizeFileName(videoName);
                        const onlyVideoFilePath = `${folderPath}/${sanitizedVideoName}-video.mp4`;
                        const isOonlyVideoFilePathExists = isFileExists(onlyVideoFilePath);
                        if (isOonlyVideoFilePathExists) {
                            informMessage(`Файлът "${sanitizedVideoName}" вече съществува (т.е. няма да се сваля).`);
                            break;
                        }
                        const audioFilePath = `${folderPath}/${sanitizedVideoName}-audio.mp4`;
                        const isAudioFilePathExists = isFileExists(audioFilePath);
                        if (isAudioFilePathExists) {
                            informMessage(`Файлът "${sanitizedVideoName}" вече съществува (т.е. няма да се сваля).`);
                            break;
                        }
                        const videoFilePath = `${folderPath}/${sanitizedVideoName}.mp4`;
                        const isSanitizedVideoNameExists = isFileExists(videoFilePath);
                        if (isSanitizedVideoNameExists) {
                            informMessage(`Файлът "${sanitizedVideoName}" вече съществува (т.е. няма да се сваля).`);
                            break;
                        }

                        // Get the URL of the video.
                        const videoUrl = await getAttributeOfElement(driver, videoLinkLocator, "href");
                        // Get the ID of the video.
                        const videoId = extractVideoIdFromVideoUrl(videoUrl);

                        // Извикване на extractMp4Urls за да получите MP4 файловете от страницата
                        const mp4Files = await extractMp4Urls(videoUrl, sanitizedVideoName, channelName);
                        const uniqueMp4Files = uniqueMp4Urls(mp4Files);

                        // Define the strings that we are looking for in the array of mp4 files.
                        const audioFileExist = "track1";
                        const videoFileExist = "track2";

                        let filteredMp4Files: string[] = [];
                        if (uniqueMp4Files.some(element => element.includes(audioFileExist)) || uniqueMp4Files.some(element => element.includes(videoFileExist))) {
                            informMessage("Видеата се намират на новите сървъри на vbox7.");
                            filteredMp4Files = filterMp4Tracks(uniqueMp4Files);

                            if (filteredMp4Files.length === 0) {
                                informMessage(`Неуспешно извличане на MP4 URL адреси за видео '${videoName} номер ${videoIndex}. Опит ${videoRetryCount + 1} от ${maxVideoRetries}.`);
                                videoRetryCount++;
                                continue;
                            }
                        }
                        else if (!uniqueMp4Files.some(element => element.includes(audioFileExist)) && !uniqueMp4Files.some(element => element.includes(videoFileExist))) {
                            informMessage("Видеото се намира на старите сървъри на vbox7.");
                            filteredMp4Files = filterNonBlankTracks(uniqueMp4Files);
                            if (filteredMp4Files.length === 0) {
                                // Алтернативен начин за извличане на видео файлове от vbox7. Това е алтернатива ако не успеем да прихванем URL адресите на видео файловете от vbox7 използвайки puppeteer.
                                let url;
                                try {
                                    await postTask(videoId); // Изпълнение на POST заявката
                                    const videoInfo: VideoInfo = await fetchVideoInfo(videoId); // Прихващане на отговора от GET заявката

                                    // Достъпване на URL
                                    url = videoInfo.result.url;
                                } catch (error) {
                                    // Защото и алтернативния начин се проваля, ще пробваме по още един (на практика 3ти начин) за сваляне на видео файлове от vbox7.
                                    try {
                                        informMessage(`Ще опитаме да свалим видео файлът '${sanitizedVideoName}' от канала '${channelName} използвайки 3ти начин за сваляне на видео файлове от vbox7.`);
                                        await downloadApproachThree(driver, videoId, onlyVideoFilePath, vbox7ChannelName, sanitizedVideoName);
                                        successMessage(`Видео файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален.`);
                                    }
                                    catch (error) {
                                        errorMessage(`Неуспешно извличане на MP4 URL адреси за видео '${videoName} номер ${videoIndex}. Опит ${videoRetryCount + 1} от ${maxVideoRetries}.`);
                                        videoRetryCount++;
                                        if (videoRetryCount === maxVideoRetries) {
                                            informMessage("Достигнат максимален брой опити за извличане на видео файлове. Продължавам със следващия видео клип.");
                                            alertMessage(`Видео файл с име: ${sanitizedVideoName} и URL адрес: ${url} няма да може да се свали!`);
                                            alertMessage(`Информацията за това видео е записана в log файла ${logFilePath_videosWasntDownloaded}`);
                                            writeToLogFile(logFilePath_videosWasntDownloaded, `Канал: ${channelName}\nВидео файл с име: ${sanitizedVideoName}\nURL адрес на видео файла: ${url}\n\n`);
                                        }
                                        continue;
                                    }
                                }
                                filteredMp4Files = url ? [url] : [];
                            }
                        }
                        else {
                            throw new Error("Изглежда, че mp4 файловете не идват нито от старите, нито от новите сървъри на Vbox7, или има друга грешка. При всяка вероятност трябва да се разбере, защо сме изпаднали в този statement. Тоест... happy debbuging :) !");
                        }

                        // Сваляне на MP4 файловете от страницата и записването им в папката за сваляне
                        for (let fileIndex = 0; fileIndex < filteredMp4Files.length; fileIndex++) {
                            const maxRetries = 1;
                            for (let retry = 0; retry < maxRetries; retry++) {
                                try {
                                    if (filteredMp4Files[fileIndex].includes('track1')) {
                                        await downloadMp4File(filteredMp4Files[fileIndex], onlyVideoFilePath);
                                        successMessage(`Видео файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален след ${retry + 1} опит(а).`);
                                    } else if (filteredMp4Files[fileIndex].includes('track2')) {

                                        await downloadMp4File(filteredMp4Files[fileIndex], audioFilePath);
                                        successMessage(`Аудио файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален след ${retry + 1} опит(а).`);
                                    }
                                    else if (filteredMp4Files[fileIndex].includes(videoId) && fileIndex == 0) {
                                        await downloadMp4File(filteredMp4Files[fileIndex], videoFilePath);
                                        successMessage(`Видео файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален след ${retry + 1} опит(а).`);
                                    }
                                    else if (filteredMp4Files[fileIndex] && fileIndex == 0) {
                                        await downloadMp4File(filteredMp4Files[fileIndex], videoFilePath);
                                        successMessage(`Видео файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален след ${retry + 1} опит(а).`);
                                    }
                                    else {
                                        // тука
                                        // Алтернативен начин за извличане на видео файлове от vbox7. Това е алтернатива ако не успеем да прихванем URL адресите на видео файловете от vbox7 използвайки puppeteer.
                                        let url;
                                        try {
                                            await postTask(videoId); // Изпълнение на POST заявката
                                            const videoInfo: VideoInfo = await fetchVideoInfo(videoId); // Прихващане на отговора от GET заявката

                                            // Достъпване на URL
                                            url = videoInfo.result.url;
                                        } catch (error) {
                                            errorMessage(`Неуспешно извличане на MP4 URL адреси за видео '${videoName} номер ${videoIndex}. Опит ${videoRetryCount + 1} от ${maxVideoRetries}.`);
                                            videoRetryCount++;
                                            if (videoRetryCount === maxVideoRetries) {
                                                informMessage("Достигнат максимален брой опити за извличане на видео файлове. Продължавам със следващия видео клип.");
                                                alertMessage(`Видео файл с име: ${sanitizedVideoName} и URL адрес: ${url} няма да може да се свали!`);
                                                alertMessage(`Информацията за това видео е записана в log файла ${logFilePath_videosWasntDownloaded}`);
                                                writeToLogFile(logFilePath_videosWasntDownloaded, `Канал: ${channelName}\nВидео файл с име: ${sanitizedVideoName}\nURL адрес на видео файла: ${url}\n\n`);
                                            }
                                            continue;
                                        }
                                        filteredMp4Files = url ? [url] : [];

                                        await downloadMp4File(filteredMp4Files[fileIndex], videoFilePath);
                                        successMessage(`Видео файлът '${sanitizedVideoName}' от канала '${channelName}' е успешно свален след ${retry + 1} опит(а).`);
                                    }
                                    break;
                                } catch (error) {
                                    alertMessage(`Грешка при свалянето на файл '${sanitizedVideoName}' от канала '${channelName}'`);
                                    alertMessage(`Прихванатата грешка е:`, error);
                                    errorMessage(`Видео файл с име: ${sanitizedVideoName} и URL адрес: ${videoUrl} не беше свален!`);
                                    errorMessage(`Информацията за това видео е записана в log файла ${logFilePath_videosWasntDownloaded}`);
                                    writeToLogFile(logFilePath_videosWasntDownloaded, `Канал: ${channelName}\nВидео файл с име: ${sanitizedVideoName}\nURL адрес на видео файла: ${videoUrl}\n\n`);
                                    if (retry === maxRetries) {
                                        alertMessage(`Достигнати са максималения брой опити за сваляне на един файл. Продължаваме със следващия файл.`);
                                        alertMessage(`Информацията за това видео е записана в log файла ${logFilePath_videosWasntDownloaded}`);
                                    }
                                }
                            }
                        }
                        break; // Излизаме от while цикъла, ако успешно извлечем и свалим файловете
                    }
                }
            }
        }
    }
    // Най-после, затворете браузъра... :)
    finally {
        await driver.quit();
    }
}

// Изпълняваме това безумие по-горе!
vbox7();

// От тук надолЕ са всички методи, които се използват в горния метод vbox7(). Дам няма POM оптимизация или друг шаблон. Уви няма време за това ;) !
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

// New method to fill a text field
async function fillTextField(driver: WebDriver, xpath: string, textToFill: string): Promise<void> {
    // Find the element using your existing method
    const element = await findElement(driver, xpath);

    // Clear any existing text in the element
    await element.clear();

    // Fill the element with new text
    await element.sendKeys(textToFill);

    // Optional: Verify that the text has been correctly filled
    const filledText = await element.getAttribute('value');
    if (filledText !== textToFill) {
        throw new Error(`Text in the element does not match the expected text. Expected: "${textToFill}", Found: "${filledText}"`);
    }
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

// Навигиране до URL и изчакване на зареждането на страницата
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

// Метод за извличане на MP4 файлове от страница
async function extractMp4Urls(url: string, sanitizedVideoName: string, channelName?: string): Promise<string[]> { // Типизиране на 'url' и връщаемия тип
    try {
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
        // Искам тук да добавя код, който да кликва на този елемент "//*[@id='bumper-player']"
        await new Promise(resolve => setTimeout(resolve, 20000));

        await browser.close();
        return mp4Urls;
    }
    catch (error) {
        errorMessage(`Неуспешно извличане на MP4 URL адрес/и за видео '${url}'.`);
        errorMessage(`Прихванатата грешка е:`, error);
        errorMessage(`Информацията за това видео е записана в log файла ${logFilePath_videosWasntDownloaded}`);
        if (channelName) {
            writeToLogFile(logFilePath_videosWasntDownloaded, `Канал: ${channelName}\nВидео файл с име: ${sanitizedVideoName}\nURL адрес на видео файла: ${url}\n\n`);
        } else {
            writeToLogFile(logFilePath_videosWasntDownloaded, `Видео файл с име: ${sanitizedVideoName}\nURL адрес на видео файла: ${url}\n\n`);
        }
    }
    return [];
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

// Метод за създаване на папка, ако не съществува
function createFolderIfNotExists(folderPath: string): void {
    // Проверете дали папката не съществува
    if (!fs.existsSync(folderPath)) {
        try {
            // Създайте папката
            fs.mkdirSync(folderPath);
            informMessage(`Създадена нова папка: ${folderPath}`);
        } catch (error) {
            errorMessage(`Грешка при създаване на папка: ${error}`);
        }
    } else {
        informMessage(`Папката вече съществува: ${folderPath}`);
    }
}

// Функция за проверка дали файлът съществува
function doesFileExist(filePath: string): boolean {
    try {
        // Проверете дали файлът съществува
        fs.accessSync(filePath, fs.constants.F_OK);
        return true; // Файлът съществува
    } catch (error) {
        return false; // Файлът не съществува
    }
}

// Функция за извеждане на оцветено съобщение в конзолата
function alertMessage(text: string, error: unknown = ""): void {
    const textContent = `Alert:     ${text}`;
    console.log(`\x1b[33m${text}\x1b[0m`, error); // Оцветява текста в жълто и извежда го в конзолата
    writeToLogFile(allLogFile, `${textContent}`);
}

// Функция за извеждане на текст в синьо
function informMessage(text: string, error: unknown = ""): void {
    const textContent = `info:      ${text}`;
    console.log(`\x1b[34m${text}\x1b[0m`, error); // Син цвят
    writeToLogFile(allLogFile, `${textContent}`);
}

// Функция за извеждане на текст в червено
function errorMessage(text: string, error: unknown = ""): void {
    const textContent = `ERROR:     ${text}`;
    console.log(`\x1b[31m${text}\x1b[0m`, error); // Червен цвят
    writeToLogFile(allLogFile, `${textContent}`);
}

// Функция за извеждане на текст в зелено
function successMessage(text: string, error: unknown = ""): void {
    const textContent = `success:   ${text}`;
    console.log(`\x1b[32m${text}\x1b[0m`, error); // Зелен цвят
    writeToLogFile(allLogFile, `${textContent}`);
}

//* Сваляне на видео използвайки системата на downloader.tube (това е алтернатива ако не успеем да прихванем URL адресите на видео файловете от vbox7 използвайки puppeteer) *//
// Определете интерфейса на данните, които очаквате от втората заявка
interface VideoInfo {
    id: string;
    result: {
        // Добавете тук другите свойства, които очаквате в обекта 'result'
        url: string;
        // ...
    };
    state: string;
    type: string;
}

// Функция за изпълнение на POST заявка
async function postTask(videoId: string): Promise<void> {
    const url = 'https://api02.downloader.tube/tasks';
    const data = {
        type: 'info',
        url: `https://www.vbox7.com/play:${videoId}`
    };
    const headers = {
        'Content-Length': '59', // Този хедър обикновено се управлява автоматично от Axios
        'Sec-Ch-Ua': 'Chromium;v="121", Not A(Brand;v="99"',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Sec-Ch-Ua-Mobile': '?0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Safari/537.36',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Origin': 'https://downloader.tube',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://downloader.tube/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Priority': 'u=1, i'
    };

    try {
        await axios.post(url, data, { headers });
    } catch (error) {
        console.error('Error in POST request:', error);
        throw error;
    }
}

// Функция за изпълнение на GET заявка
async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
    const url = `https://api02.downloader.tube/videos/Vbox7-${videoId}-info`;
    const headers = {
        'Sec-Ch-Ua': 'Chromium;v="121", Not A(Brand;v="99"',
        'Accept': 'application/json, text/plain, */*',
        'Sec-Ch-Ua-Mobile': '?0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Safari/537.36',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Origin': 'https://downloader.tube',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://downloader.tube/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Priority': 'u=4, i'
    };

    try {
        const response: AxiosResponse<VideoInfo> = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in GET request:', error);
        throw error;
    }
}

// Функция за извличане на видео ID-то от URL адреса на видеото
function extractVideoIdFromVideoUrl(inputString: string): string {
    const delimiter = 'https://www.vbox7.com/play:';

    // Използваме метода split, за да разделим низа по указания разделител
    const parts = inputString.split(delimiter);

    // Проверяваме дали имаме поне две части след разделението
    if (parts.length >= 2) {
        // Използваме slice, за да вземем дясната част на низа след разделителя
        const rightPart = parts[1];
        return rightPart;
    } else {
        // Ако няма дясна част, можем да върнем празен низ или друг стойност, която е подходяща за вашата логика
        return '';
    }
}

async function downloadApproachThree(driver: WebDriver, videoUrl: string, downloadFilePath: string, vbox7ChannelNameе: string, videoName: string) {
    try {
        // Отваряне на нов таб
        await driver.executeScript('window.open()');

        // Превключване към новия таб
        const tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[1]); // Превключване към втория таб

        // Навигация до сайта
        await driver.get('https://downloader.tube/download-vbox7-video/');

        // Попълване на полето със стойността от променливата videoUrl
        await driver.findElement(By.xpath('//input[@placeholder="Paste Link Here"]')).sendKeys(`https://www.vbox7.com/play:${videoUrl}`);
        // Кликване върху рекламата.
        await driver.findElement(By.xpath("//*[@id='___gatsby']/following::a")).click();
        // Натискане на бутона за сваляне
        await driver.findElement(By.xpath('//input[@placeholder="Paste Link Here"]/parent::form/button')).click();

        // Чакане за появата на хиперлинка
        await driver.wait(until.elementLocated(By.xpath('//a[@rel="noreferrer"]')), 10000); // Чака до 10 секунди

        // Взимане на стойността на атрибута 'href'
        const downloadLink = await driver.findElement(By.xpath('//a[@rel="noreferrer"]')).getAttribute('href');

        // Тук добавете вашата логика за сваляне на файла в указаната директория
        // За сваляне може да използвате външни библиотеки или да изпратите заявка към URL адреса на хиперлинка
        console.log('Download link:', downloadLink);

        try {
            await downloadMp4File(downloadLink, downloadFilePath);
        }
        catch (error) {
            errorMessage('Грешка при свалянето на видео файл с име ' + videoName + ' от канал с име ' + vbox7ChannelNameе);
        }

        // Затваряне на текущия таб
        await driver.close();

        // Превключване обратно към първоначалния таб
        await driver.switchTo().window(tabs[0]);
    } finally {
        // Затваряне на браузъра (опционално, ако искате да продължите работа в първия таб, не го затваряйте)
        // await driver.quit();
    }
}

// Функция за изчакване (sleep)
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Пример за използване на функцията sleep
async function wait(seconds: number) {
    informMessage('Изчакване започва');
    await sleep(seconds * 1000); // Изчаквайте за определен брой секунди
    informMessage('Изчакването приключи');
}