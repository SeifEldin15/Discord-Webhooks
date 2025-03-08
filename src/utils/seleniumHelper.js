import { Builder, By, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Key } from 'selenium-webdriver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = process.platform === 'win32' 
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome';

const CHROME_USER_DATA_DIR = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\User Data')
    : process.platform === 'darwin'
        ? path.join(process.env.HOME, 'Library/Application Support/Google/Chrome')
        : path.join(process.env.HOME, '.config/google-chrome');

const CHROME_PROFILE = 'Profile 1';
const EXTENSION_PATH = path.join(__dirname, '/encore-extension/');

export async function launchBrowserWithExtension() {
    let options = new chrome.Options();
    
    console.log('Launching Chrome with profile settings:');
    console.log('Chrome Binary Path:', CHROME_PATH);
    console.log('User Data Directory:', CHROME_USER_DATA_DIR);
    console.log('Profile Directory:', CHROME_PROFILE);

    options.setChromeBinaryPath(CHROME_PATH);
    options.addArguments(`--user-data-dir=${CHROME_USER_DATA_DIR}`);
    options.addArguments(`--profile-directory=${CHROME_PROFILE}`);
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--start-maximized');
    
    options.addArguments('--enable-profile-shortcut-manager');
    options.addArguments('--enable-profiles');
    
    try {
        let driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        
        const currentProfile = await driver.executeScript('return chrome.identity && chrome.identity.getProfileUserInfo()');
        console.log('Current Profile Info:', currentProfile);
        
        return driver;
    } catch (error) {
        console.error('Failed to launch browser:', error);
        throw error;
    }
}


export async function processLinks(driver, data) {
    for (let i = 0; i < data.length; i++) {
        const link = data[i]['Full Checkout Link'];
        if (!link) continue;
        
        try {
            await driver.get(link);
            await driver.sleep(2000);  // Wait for page load
            
            // Use the exact keyboard shortcut shown in the screenshot: Ctrl + Shift + E
            const actions = driver.actions({async: true});
            await actions
                .keyDown(Key.CONTROL)
                .keyDown(Key.SHIFT)
                .sendKeys('e')
                .keyUp(Key.SHIFT)
                .keyUp(Key.CONTROL)
                .perform();
            
            await driver.sleep(3000);
            
            console.log(`Processed link ${i + 1} with keyboard shortcut`);
            
        } catch (error) {
            console.error(`Error processing link ${i + 1}:`, error);
            console.log('Current URL:', await driver.getCurrentUrl());
        }
    }
}

export async function scrapeDiscordData(driver, url) {
    try {
        console.log('Navigating to:', url);
        await driver.get(url);
        
        // Wait for the embed fields to be present
        await driver.wait(until.elementLocated(By.className('embedFields__623de')), 30000);
        
        // Execute JavaScript in the browser to extract data
        const eventData = await driver.executeScript(() => {
            const embeds = document.querySelectorAll('.embedFields__623de');
            return Array.from(embeds).map(embed => {
                const fields = {};
                
                embed.querySelectorAll('.embedField__623de').forEach(field => {
                    const name = field.querySelector('.embedFieldName__623de').textContent.trim();
                    const value = field.querySelector('.embedFieldValue__623de').textContent.trim();
                    fields[name] = value;
                });
                
                const links = Array.from(embed.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href.includes('checkout.ticketmaster.com') || 
                                  href.includes('checkout.livenation.com') || 
                                  href.includes('encsoft.app'));
                
                fields['Checkout Link'] = links.find(link => 
                    link.includes('checkout.ticketmaster.com') || 
                    link.includes('checkout.livenation.com')
                ) || '';
                
                fields['Full Checkout Link'] = links.find(link => 
                    link.includes('encsoft.app')
                ) || '';
                
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
        return eventData;
        
    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    }
}
