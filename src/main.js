import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { launchBrowserWithExtension, processLinks, scrapeDiscordData } from './utils/seleniumHelper.js';
import { processExcelFile, saveToExcel } from './utils/fileProcessor.js';

app.commandLine.appendSwitch('no-sandbox');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile('index.html');
});

ipcMain.on('process-xlsx', async (event, { filePath }) => {
    let driver;
    try {
        driver = await launchBrowserWithExtension();
        const data = processExcelFile(filePath);
        await processLinks(driver, data);
        event.reply('xlsx-process-complete', { count: data.length });
    } catch (error) {
        event.reply('xlsx-process-error', error.message);
    } finally {
        if (driver) await driver.quit();
    }
});

ipcMain.on('scrape-discord', async (event, { url }) => {
    let driver;
    try {
        driver = await launchBrowserWithExtension();
        const data = await scrapeDiscordData(driver, url);
        
        // Save the data to Excel
        const savedFilePath = saveToExcel(data);
        
        event.reply('discord-scrape-complete', { 
            data,
            savedFilePath 
        });
    } catch (error) {
        event.reply('discord-scrape-error', error.message);
    } finally {
        if (driver) await driver.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
