### WARNING ###
This project will be updated soon. The current version is working good, but the most of the videos are splitted in audio and video files. The new version will use FFMPEG to merge the audio and video files into one file using new command. The new version will be released very soon, so stay tuned.

## Ако разбираш това виж файл ПРОЧЕТИ-МЕ.md ##

### Description ###
This is small project for downloading whole Vbox7 channels. It is written in Node.js and uses Selenium and Puppeteer for scraping the data.  
The most of the comments in the code are in Bulgarian, because the project is for Bulgarian users. The readme file is in English, because it is more common language for developers.

### Pre-requisites ###
1. Node.js installed (required version 18.0.0 or higher)
2. Google Chrome installed (Last stable version)

### Installation ###  
1. Clone the repository and navigate to the project (root) directory  
2. Run `npm install` command in the terminal to install all dependencies  
3. Rename `.env_example` to `.env` and fill the variables with your data  
- Add the folder where you want to save the videos in 'DOWNLOAD_FOLDER_PATH' variable.
    That means you need to provide empty folder path in the '.env' file. You can use absolute or relative path.
- Add the channels you want to download in a TXT file in 'DOWNLOAD_CHANNELS_TXT_FILE_PATH' variable.
    That means you need to create new txt file and put there URLs of the channels, that you want to scrap. Add that file path to '.env' file. You can use absolute or relative path.
    It is IMPORTANT to add one channel per line! 

### Usage ###
1. Run `npm run vbox7` command in the terminal to start scraping
2. If some videos are not downloaded, the names and urls of the videos will be saved in `./logs/not-downloaded-videos-${unix-time}.txt` file. You can download them manually. 
3. If you want to download the videos again, you can run `npm run vbox7` command again. The bot will skip the already downloaded videos and will download only the missing ones.
4. There is a debug mechanism, but you can use it only with VS Code. For more details see the `./.vscode/launch.json` file.

### Alternatives ###
If you can't use the bot for some reason you can use one of the following alternatives for downloading the videos directly from the browser:
1. [Download videos from new vbox7 servers] (https://youtube4kdownloader.com/)  
2. [Download videos from old vbox7 server] (https://downloader.tube/download-vbox7-video/)  
Remember that Vbox7 has two way for distributting the videos (downloading from old server or downloading from new servers). If the first method doesn't work try the second one and vice versa.

### License ###
Absolute free!!!
