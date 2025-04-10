import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { launchBrowserWithExtension, processLinks, scrapeEncsoftData } from './utils/seleniumHelper.js';

app.commandLine.appendSwitch('no-sandbox');

let mainWindow;
let orders = [];

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

ipcMain.on('fetch-data', async (event, { url }) => {
    let driver;
    try {
        driver = await launchBrowserWithExtension();
        const scrapedOrders = await scrapeEncsoftData(driver, url);
        orders = scrapedOrders; // Store the orders in memory
        event.reply('data-fetch-complete', { orders });
    } catch (error) {
        console.error('Error fetching data:', error);
        event.reply('data-fetch-error', { error: error.message });
    } finally {
        if (driver) await driver.quit();
    }
});

ipcMain.on('process-order', async (event, { index }) => {
    const order = orders[index];
    if (!order) {
        event.reply('order-update', { index, status: 'Error: Order not found' });
        return;
    }

    let driver;
    try {
        driver = await launchBrowserWithExtension();
        
        await processLinks(driver, [{ 'Full Checkout Link': order.checkoutUrl }], {
            cardName: 'Test User',
            cardNumber: '4111111111111111',
            expiration: '1225',
            cvv: '123',
            address1: '123 Test St',
            city: 'Test City',
            state: 'California',
            postalCode: '12345',
            phone: '1234567890'
        });

        event.reply('order-update', { index, status: 'Successfully Processed' });
    } catch (error) {
        console.error('Error processing order:', error);
        event.reply('order-update', { index, status: 'Error: ' + error.message });
    } finally {
        if (driver) await driver.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
