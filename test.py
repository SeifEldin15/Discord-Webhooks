from selenium import webdriver 
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup 
from lxml import etree
from time import sleep 
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
# import smtplib
# import imghdr
# from email.message import EmailMessage


driver = webdriver.Chrome()

# Navigate to the website (base URL)
driver.get('https://checkout.ticketmaster.com/')  # Use the base URL of the site

# Load cookies from a file
with open('cookies.json', 'r') as file:
    cookies = json.load(file)
    for cookie in cookies:
        # Ensure the cookie domain matches the current domain
        if 'domain' in cookie:
            cookie['domain'] = '.ticketmaster.com'  # Adjust the domain if necessary
        driver.add_cookie(cookie)

# Now navigate to the specific page after adding cookies
driver.get("https://checkout.ticketmaster.com/8a183ca2985346e484be2fe553622095?ccp_src=2&ccp_channel=0&edp=https%3A%2F%2Fwww.ticketmaster.com%2Fwicked-touring-tempe-arizona-03-29-2025%2Fevent%2F190060F1D6A333B6%3FrefArtist%3DK8vZ91754JV%26f_simplified_filter%3Dtrue%26f_enable_merch_slot%3Dtrue&f_appview=false&f_appview_ln=false&f_appview_version=1&f_layout=")
sleep(3)

# Wait for the iframe to be present
WebDriverWait(driver, 20).until(EC.frame_to_be_available_and_switch_to_it((By.CLASS_NAME, "zoid-component-frame")))

# Click on the "Add New Card" button
WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tid='add-new-card-link']"))).click()

checkbox1 = WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "save-cardSave this card for future purchasesinput")))
driver.execute_script("arguments[0].click();", checkbox1)

# # Wait for the name on card field and enter the name
# WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.ID, "name-on-card"))).send_keys("Giovanni Post")

# # Switch to the Braintree hosted field for credit card number
# WebDriverWait(driver, 20).until(EC.frame_to_be_available_and_switch_to_it((By.ID, "braintree-hosted-field-number")))
# WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.TAG_NAME, "input"))).send_keys("5563101607902586")  #

# driver.switch_to.parent_frame()  

# # Switch to the Braintree hosted field for expiration date
# WebDriverWait(driver, 20).until(EC.frame_to_be_available_and_switch_to_it((By.ID, "braintree-hosted-field-expirationDate")))

# # Enter the expiration date
# WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.TAG_NAME, "input"))).send_keys("0128")  # Assuming the input is the first element

# # Switch back to the zoid-component-frame to access other fields
# driver.switch_to.parent_frame()  # Switch back to the parent frame

# # Switch to the Braintree hosted field for CVV
# WebDriverWait(driver, 20).until(EC.frame_to_be_available_and_switch_to_it((By.ID, "braintree-hosted-field-cvv")))

# # Enter the CVV
# WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.TAG_NAME, "input"))).send_keys("447")  # Assuming the input is the first element

# driver.switch_to.parent_frame()  

# country_dropdown = driver.find_element(By.ID, "country-dropdown")
# country_dropdown.click()

# desired_country = "United States"
# country_options = driver.find_elements(By.CSS_SELECTOR, ".fwm__dropDownItem")

# for option in country_options:
#     if option.text == desired_country:
#         option.click() 
#         break

# driver.find_element(By.ID, "address").send_keys("773 De Wolf")  

# driver.find_element(By.ID, "city").send_keys("Brooklyn")


# state_dropdown = driver.find_element(By.ID, "state-dropdown")
# state_dropdown.click()

# sleep(1) 

# desired_state = "California"
# state_options = driver.find_elements(By.CSS_SELECTOR, ".fwm__dropDownItem")

# for option in state_options:
#     if option.text == desired_state:
#         option.click() 
#         break


# driver.find_element(By.ID, "postal-code").send_keys("10002")  
# driver.find_element(By.ID, "phone").send_keys("3479012829")  

# add_card_button = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tid='add-wallet-item-btn']")))
# add_card_button.click()


WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.ID, "nofalselabel"))).click()

checkbox = WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "placeOrderOptIn1-input")))
driver.execute_script("arguments[0].click();", checkbox)


WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-tid='place-order-btn']"))).click

sleep(30)

