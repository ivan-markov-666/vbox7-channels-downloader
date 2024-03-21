### WARNING ###
This automation scrapper is still working with the VBox7 site, but most of the videos are not accessible anymore. However the videos related with BTV Media Group are still available publicly, and that script can be used.

## Ако разбираш това виж файл ПРОЧЕТИ-МЕ.md ##

### Description ###
This is a small project for downloading whole Vbox7 channels. It is written in Node.js and uses Selenium and Puppeteer for scraping the data.  
The most of the comments in the code are in Bulgarian because the project is for Bulgarian users. The readme file is in English because it is the more common language for developers.

### Pre-requisites ###
1. Node.js installed (required version 18.0.0 or higher)
2. Google Chrome installed (Last stable version)

### Installation ###  
1. Clone the repository and navigate to the project (root) directory  
2. Run the `npm install` command in the terminal to install all dependencies  
3. Rename `.env_example` to `.env` and fill in the variables with your data  
- Add the folder where you want to save the videos in the 'DOWNLOAD_FOLDER_PATH' variable.  
    That means you need to provide an empty folder path in the '.env' file. You can use absolute or relative path.
- Add the channels you want to download in a TXT file in the 'DOWNLOAD_CHANNELS_TXT_FILE_PATH' variable.  
    That means you need to create a new Txt file and put the URLs of the channels, that you want to scrap. Add that file path to the '.env' file. You can use absolute or relative path.  
    It is IMPORTANT to add one channel per line!  
- Add the video URLs you want to download in a TXT file in the 'DOWNLOAD_VIDEOS_TXT_FILE_PATH' variable.  
    That means you need to create a new txt file and put the URLs of the videos, that you want to scrap. Add that file path to the '.env' file. You can use absolute or relative path.
- Add the channel favorites URLs you want to download in a TXT file in the 'DOWNLOAD_CHANNELS_FAVORITES_TXT_FILE_PATH' variable.  
    That means you need to create a new txt file and put the URLs of the channel favorites, that you want to scrap. Add that file path to the '.env' file. You can use absolute or relative path.  
    It is IMPORTANT to add one video per line!
- Add the channels like URLs you want to download in a TXT file in the 'DOWNLOAD_CHANNELS_LIKES_TXT_FILE_PATH' variable.  
    That means you need to create a new txt file and put the URLs of the channel likes, that you want to scrap. Add that file path to the '.env' file. You can use absolute or relative path.  
    This functionality will work only with one (your) channel because the likes are private! So you need to add your channel likes URL in the file.
- Switch between 'true' and 'false' to use headless mode or not.  
    If you want to see the browser while scraping, set 'false'.  
    If you want to scrape in the background, set 'true'.

### Usage ###
1. Run the `npm run channels` command in the terminal to start scraping the channels.
2. Run the `npm run videos` command in the terminal to start scraping the videos.
3. Run the `npm run channelsFalorites` command in the terminal to start scraping the favorite videos.
4. Run the `npm run channelsLikes` command in the terminal to start scraping the likes videos. The likes are private, so you need to log in to the browser.  
    The bot will open the browser and will wait for you to log in manually (sorry no time for automating that). After that, the bot will continue with the scraping.
5. The robot generates two log files.  
    - The first one is `./logs/all-channels-${unix-time}.txt` or `./logs/all-videos-${unix-time}.txt` and contains the log of actions that the robot has done.
    - The second one is `./logs/not-downloaded-videos-${unix-time}.txt` and contains the names and URLs of the videos, that are not downloaded. You can download them manually. 
6. If you want to download the videos again, you can run the `npm run channels` command again. The bot will skip the already downloaded videos and will download only the missing ones.
7. There is a debug mechanism, but you can use it only with VS Code. For more details see the `./.vscode/launch.json` file.

### Alternatives ###
If you can't use the bot for some reason you can use one of the following alternatives for downloading the videos directly from the browser:
1. [Download videos from new vbox7 servers] (https://youtube4kdownloader.com/)  
2. [Download videos from old vbox7 server] (https://downloader.tube/download-vbox7-video/)  
Remember that Vbox7 has two way for distributing the videos (downloading from old server or downloading from new servers). If the first method doesn't work try the second one and vice versa.

### License ###
Absolute free!!!
