const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const XLSX = require('xlsx');
const { exec } = require('child_process');
const fs = require('fs');
const puppeteer = require('puppeteer');

let mainWindow;

// Define Chrome paths - Update these for your system!
const CHROME_PATH = process.platform === 'win32' 
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'  // Windows path
    : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // macOS path
        : '/usr/bin/google-chrome';  // Linux path

const CHROME_USER_DATA_DIR = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\User Data')
    : process.platform === 'darwin'
        ? path.join(process.env.HOME, 'Library/Application Support/Google/Chrome')
        : path.join(process.env.HOME, '.config/google-chrome');

const CHROME_PROFILE = 'JAKE'; // Your profile name

// Function to find Chrome profile directory
async function findChromeProfile(profileName) {
    const localStatePath = path.join(CHROME_USER_DATA_DIR, 'Local State');
    
    try {
        const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
        const profiles = localState.profile.info_cache;
        
        // Find profile by name
        for (const [dirName, profile] of Object.entries(profiles)) {
            if (profile.name.toLowerCase() === profileName.toLowerCase()) {
                return dirName;
            }
        }
        
        throw new Error(`Profile "${profileName}" not found`);
    } catch (error) {
        console.error('Error reading Chrome profiles:', error);
        throw error;
    }
}

async function scrapeDiscordData(url) {
    let browser;
    try {
        const profileDir = await findChromeProfile(CHROME_PROFILE);
        console.log('Using Chrome profile directory:', profileDir);

        const launchOptions = {
            executablePath: CHROME_PATH,
            userDataDir: CHROME_USER_DATA_DIR,
            defaultViewport: null,
            args: [
                `--user-data-dir=${CHROME_USER_DATA_DIR}`,
                `--profile-directory=${profileDir}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            headless: false
        };

        browser = await puppeteer.launch(launchOptions);
        const page = (await browser.pages())[0] || await browser.newPage();

        // Add stealth configurations
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = {};
            window.navigator.chrome = {};
        });

        console.log('Navigating to:', url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        // Wait for Discord content to load
        await page.waitForSelector('.embedFields__623de', { timeout: 30000 });

        // Extract data including links and event IDs
        const eventData = await page.evaluate(() => {
            const embeds = document.querySelectorAll('.embedFields__623de');
            return Array.from(embeds).map(embed => {
                const fields = {};
                
                // Extract all field data
                embed.querySelectorAll('.embedField__623de').forEach(field => {
                    const name = field.querySelector('.embedFieldName__623de').textContent.trim();
                    const value = field.querySelector('.embedFieldValue__623de').textContent.trim();
                    fields[name] = value;
                });

                // Extract links
                const links = Array.from(embed.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href.includes('checkout.ticketmaster.com') || 
                                  href.includes('checkout.livenation.com') ||
                                  href.includes('encsoft.app'));

                // Add links to fields object
                fields['Checkout Link'] = links.find(link => 
                    link.includes('checkout.ticketmaster.com') || 
                    link.includes('checkout.livenation.com')
                ) || '';
                
                fields['Full Checkout Link'] = links.find(link => 
                    link.includes('encsoft.app')
                ) || '';

                // Add event ID if not already present
                if (!fields['Event ID'] && fields['Checkout Link']) {
                    const match = fields['Checkout Link'].match(/checkout\.[^/]+\/([a-zA-Z0-9]+)/);
                    if (match) {
                        fields['Event ID'] = match[1];
                    }
                }

                return fields;
            });
        });

        console.log('Data extracted:', eventData);
        await browser.close();
        return eventData;

    } catch (error) {
        console.error('Scraping error:', error);
        if (browser) await browser.close();
        throw error;
    }
}

// Function to save data to XLSX
async function saveToExcel(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `event_data_${timestamp}.xlsx`;
    
    // Create a map to store unique events using Event ID as key
    const uniqueEvents = new Map();
    
    // Process each item, keeping only the latest entry for each Event ID
    data.forEach(fields => {
        const eventId = fields['Event ID'] || '';
        if (eventId) {
            uniqueEvents.set(eventId, fields);
        }
    });
    
    // Convert unique events back to array and format for Excel
    const formattedData = Array.from(uniqueEvents.values()).map(fields => ({
        'Event Name': fields['Event name'] || '',
        'Event ID': fields['Event ID'] || '',
        'Section': fields['Section'] || '',
        'Row': fields['Row'] || '',
        'Seat': fields['Seat'] || '',
        'Single Price': parseFloat(fields['Price']) || 0,
        'Single Fees': 0,
        'Total Price': parseFloat(fields['Price']) * (parseInt(fields['Amount']) || 1),
        'Total Fees': 0,
        'Quantity': parseInt(fields['Amount']) || 1,
        'Ticket Type': 'STANDARD TICKET',
        'Status': 'Available',
        'Time Left': fields['Expiration'] || '',
        'Checkout Link': fields['Checkout Link'] || '',
        'Full Checkout Link': fields['Full Checkout Link'] || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    ws['!cols'] = [
        { wch: 20 }, // Event Name
        { wch: 10 }, // Event ID
        { wch: 10 }, // Section
        { wch: 8 },  // Row
        { wch: 10 }, // Seat
        { wch: 12 }, // Single Price
        { wch: 12 }, // Single Fees
        { wch: 12 }, // Total Price
        { wch: 12 }, // Total Fees
        { wch: 10 }, // Quantity
        { wch: 20 }, // Ticket Type
        { wch: 15 }, // Status
        { wch: 10 }, // Time Left
        { wch: 20 }, // Checkout Link
        { wch: 20 }  // Full Checkout Link
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Event Data');
    const savePath = path.join(app.getPath('downloads'), filename);
    XLSX.writeFile(wb, savePath);
    return savePath;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            partition: 'persist:discord'
        }
    });

    mainWindow.loadFile('index.html');
}

// Handle URL processing
ipcMain.on('fetch-url', async (event, url) => {
    try {
        if (!url.includes('discord.com')) {
            throw new Error('Not a valid Discord URL');
        }

        // Directly use puppeteer for scraping without opening Chrome separately
        const eventData = await scrapeDiscordData(url);
        
        if (eventData.length === 0) {
            throw new Error('No event data found');
        }

        // Save to Excel
        const savePath = await saveToExcel(eventData);
        
        event.reply('process-complete', {
            message: `Data saved to ${savePath}`,
            count: eventData.length
        });

    } catch (error) {
        console.error('Error:', error);
        event.reply('fetch-error', error.message);
    }
});

// Handle saving data to XLSX
ipcMain.on('save-data', async (event, data) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `event_data_${timestamp}.xlsx`;
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        ws['!cols'] = [
            { wch: 20 }, // Event Name
            { wch: 10 }, // Section
            { wch: 8 },  // Row
            { wch: 10 }, // Seat
            { wch: 12 }, // Single Price
            { wch: 12 }, // Single Fees
            { wch: 12 }, // Total Price
            { wch: 12 }, // Total Fees
            { wch: 10 }, // Quantity
            { wch: 20 }, // Ticket Type
            { wch: 15 }, // Status
            { wch: 10 }  // Time Left
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Event Data');
        
        const savePath = path.join(app.getPath('downloads'), filename);
        XLSX.writeFile(wb, savePath);
        
        event.reply('save-complete', savePath);
    } catch (error) {
        console.error('Save error:', error);
        event.reply('save-error', error.message);
    }
});

app.whenReady().then(async () => {
    // Set up session permissions
    const ses = session.fromPartition('persist:discord');
    await ses.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});