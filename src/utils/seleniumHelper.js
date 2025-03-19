import { Builder, By, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Key } from 'selenium-webdriver';
import fs from 'fs';

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


export async function processLinks(driver, data, cardData) {
    for (let i = 0; i < data.length; i++) {
        const link = data[i]['Full Checkout Link'];
        if (!link) continue;
        try {
            await driver.get(link);
            await activateExtension(driver);

            // Enter the email
            // await driver.findElement(By.id("email[objectobject]__input")).sendKeys("superuser123@post.com");
            // await driver.findElement(By.id("password[objectobject]__input")).sendKeys("Ticketmaster!123");
            // await driver.findElement(By.name("sign-in")).click();

            await driver.sleep(7000); // Wait for options to load

            // Wait for the iframe to be present
            await driver.wait(until.ableToSwitchToFrame(driver.findElement(By.className("zoid-component-frame"))));
        
            // Click on the "Add New Card" button
            await driver.wait(until.elementIsVisible(driver.findElement(By.css("button[data-tid='add-new-card-link']")))).click();


            // Wait for the name on card field and enter the name
            await driver.wait(until.elementIsVisible(driver.findElement(By.id("name-on-card")))).sendKeys(cardData.cardName);

            // Switch to the Braintree hosted field for credit card number
            await driver.wait(until.ableToSwitchToFrame(driver.findElement(By.id("braintree-hosted-field-number"))));
            await driver.wait(until.elementIsVisible(driver.findElement(By.id("credit-card-number")))).sendKeys(cardData.cardNumber);

            await driver.switchTo().parentFrame();
        
            // Switch to the Braintree hosted field for expiration date
            await driver.wait(until.ableToSwitchToFrame(driver.findElement(By.id("braintree-hosted-field-expirationDate"))));
            await driver.wait(until.elementIsVisible(driver.findElement(By.id("expiration")))).sendKeys(String(cardData.expiration));

            await driver.switchTo().parentFrame();

            // Switch to the Braintree hosted field for CVV
            await driver.wait(until.ableToSwitchToFrame(driver.findElement(By.id("braintree-hosted-field-cvv"))));
            await driver.wait(until.elementIsVisible(driver.findElement(By.id("cvv")))).sendKeys(String(cardData.cvv));

            await driver.switchTo().parentFrame();

            // Select country
            const countryDropdown = await driver.findElement(By.id("country-dropdown"));
            await countryDropdown.click();

            const desiredCountry = "United States";
            const countryOptions = await driver.findElements(By.css(".fwm__dropDownItem"));

            for (let option of countryOptions) {
                if (await option.getText() === desiredCountry) {
                    await option.click();
                    break;
                }
            }

            // Fill in address fields
            await driver.findElement(By.id("address")).sendKeys(cardData.address1);
            await driver.findElement(By.id("city")).sendKeys(cardData.city);

            // Select state
            const stateDropdown = await driver.findElement(By.id("state-dropdown"));
            await stateDropdown.click();

            await driver.sleep(1000); // Wait for options to load

            const stateOptions = await driver.findElements(By.css(".fwm__dropDownItem"));
            

            for (let option of stateOptions) {
                if (await option.getText() === cardData.state) {
                    await option.click();
                    break;
                }
            }
        

            // Fill in postal code and phone
            await driver.findElement(By.id("postal-code")).sendKeys(cardData.postalCode);
            await driver.findElement(By.id("phone")).sendKeys(cardData.phone);

            // Wait for the checkbox to be present and click it
            const checkbox1 = await driver.wait(until.elementLocated(By.id("save-cardSave this card for future purchasesinput")));
            await driver.executeScript("arguments[0].click();", checkbox1);
            await driver.sleep(3000);

            // Click the "Add Card" button
            const addCardButton = await driver.wait(until.elementIsVisible(driver.findElement(By.css("button[data-tid='add-wallet-item-btn']"))));
            await addCardButton.click();
            await driver.sleep(5000);


            await driver.switchTo().parentFrame();
            // Click the "No, do not protect my resale ticket purchase" option
            const noProtectLabel = await driver.findElement(By.id("nofalselabel"));
            await noProtectLabel.click();

            // Click the checkbox
            const checkbox = await driver.wait(until.elementLocated(By.id(("placeOrderOptIn1-input"))));
            await driver.executeScript("arguments[0].click();", checkbox);

            // Click the "Place Order" button
            const placeOrderButton = await driver.wait(until.elementIsVisible(driver.findElement(By.css("button[data-tid='place-order-btn']"))));
            await placeOrderButton.click();

            await driver.sleep(30000); 

        
            
            console.log(`Processed link ${i + 1}`);

        } catch (error) {
            console.error(`Error processing link ${i + 1}:`, error);
        }
    }
}


async function activateExtension(driver) {
    const actions = driver.actions({async: true});
    await actions
        .keyDown(Key.CONTROL)
        .keyDown(Key.SHIFT)
        .sendKeys('e')
        .keyUp(Key.SHIFT)
        .keyUp(Key.CONTROL)
        .perform();
    
    await driver.sleep(3000);
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
