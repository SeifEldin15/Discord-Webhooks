
import undetected_chromedriver as uc
import json
import sys
from selenium import webdriver

options = uc.ChromeOptions()
options.add_argument('--no-sandbox')
options.add_argument('--start-maximized')

# Configure undetected-chromedriver
driver = uc.Chrome(
    options=options,
    driver_executable_path=None,  # Let it auto-download the correct version
    version_main=133,  # Specify your Chrome version here
    use_subprocess=True,
    suppress_welcome=True
)

print(json.dumps({'port': driver.service.port}))
sys.stdout.flush()
