"use strict"
const { firefox }  = require("playwright");
const readLine = require("readline");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const {request} = require("@playwright/test");

let randomLongTime = Math.random() * (5000 - 3000) + 3000;
let randomShortTime = Math.random() * (2000 - 1000) + 1000;

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Creating Account Sessions folder
const dirPath = path.join(process.cwd(), './nike_info/account-sessions');
if(!fs.existsSync(dirPath)){
  fs.mkdirSync(dirPath, {recursive: true});
}
// Reading accounts from the file + adding to array.
let usernames = [];
let passwords = [];
try {
  const data = fs.readFileSync('./nike_info/accounts.txt', 'utf8');
  const lines = data.split('\n');

  for (let line of lines) {
    line = line.replace('\r', '');
    if (line.trim() === '') continue;
    const [username, password] = line.split(':');
    usernames.push(username);
    passwords.push(password);
  }
} catch (error) {
  console.error(`Reading accounts error 🔴:`, error);
}

//  Read the card details from the file + adding to array.
let cardNumbers = [];
let cardExpiry = [];
let cardSecurityCodes = [];

try {
  const data = fs.readFileSync('./nike_info/payments.txt', 'utf8');
  const lines = data.split('\n');

  for (let line of lines) {
    line = line.replace('\r', '');
    if (line.trim() === '') continue;
    const [number, expiry, cvc] = line.split(':');
    cardNumbers.push(number);
    cardExpiry.push(expiry);
    cardSecurityCodes.push(cvc);
  }
} catch (error) {
  console.error(`Reading payment error 🔴:`, error);
}

// Read proxies from the file (if you want to use them)
let proxyServer = [];
let proxyPort = [];
let proxyUsername = [];
let proxyPassword = [];

try {
  const data = fs.readFileSync("./nike_info/proxies.txt", "utf8");
  const lines = data.split("\n");

  for (let line of lines) {
    line = line.replace("\r", " ");
    let [server, port, username, password] = line.replace(/\s+/g,' ').trim().split(":");
    proxyServer.push(server);
    proxyPort.push(port);
    proxyUsername.push(username);
    proxyPassword.push(password);
  }
} catch (error) {
  console.error(`Reading proxies error 🔴:`, error);
}
//////////////////////////////////////////////////// INPUT DETAILS //////////////////////////////////////////////////////

// INPUT REGION
let region;
function inputRegion() {
  return new Promise((resolve) => {
    rl.question("Region (XP/SEA):", (function (regionInput) {
      region = regionInput.toUpperCase();
      resolve();
    }));
  })
}

// INPUT SIZES function
let sizes = [];
function inputSizes() {
  return new Promise((resolve) => {
    rl.question("Sizes (US):", function(sizesInput) {
      let sizesToAdd = sizesInput.split(',').map(size => size.trim());
      sizes.push(...sizesToAdd);
      resolve();
    });
  });
}

// INPUT BROWSER TIMEOUT DELAYS
let browserDelayNumber;
function inputBrowserDelays() {
  return new Promise((resolve) => {
    rl.question("Browser delays (ms):", function (delays) {
      if(delays.trim() === "") {
        browserDelayNumber = 1000;
      } else {
        browserDelayNumber = delays;
      }
      resolve();
    });
  });
}
// TIMEOUT FUNCTION
function browserTimeout(browserDelayNumber) {
  return new Promise(resolve => setTimeout(resolve, browserDelayNumber));
}

// INPUT SKU
let sku;
function inputSKU() {
  return new Promise((resolve) => {
    rl.question("SKU:", function (skuInput) {
      sku = skuInput.toUpperCase();
      resolve();
    });
  });
}
// INPUT ACCOUNT SESSIONS CONDITION
let saveSessionsInput;
function inputSaveSessions() {
  return new Promise((resolve) => {
    rl.question("Save accounts session? (Y/N):", function (sessionsInput) {
      saveSessionsInput = sessionsInput.toUpperCase()
      resolve();
    });
  })
}
// INPUT PROXIES CONDITION
let useProxiesInput;
function inputUseProxies() {
  return new Promise((resolve) => {
    rl.question(("Use proxies? (Y/N):"), function (proxiesInput) {
      useProxiesInput = proxiesInput.toUpperCase();
      resolve();
    })
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// REQUEST TO GET PRODUCT INFO
let productId;
let startEntryDate;

async function getProductInfo(sku) {
  try {
    const link =`https://api.nike.com/product_feed/threads/v2?filter=language(en-GB)&filter=marketplace(${region})&filter=channelId(010794e5-35fe-4e32-aaff-cd2c74f89d61)&filter=productInfo.merchProduct.styleColor(${sku})`;
    const response = await axios.get(`${link}`);
    const productResponse = response.data;
    productId = productResponse.objects[0].publishedContent.properties.products[0].productId;
    startEntryDate = productResponse.objects[0].productInfo[0].launchView.startEntryDate;
    return productId;
  } catch (error) {
    console.error(error);
  }
}

async function startBrowsers () {

  console.log(`
██╗ ██████╗██╗   ██╗    ███████╗███╗   ██╗██╗  ██╗██████╗ ███████╗    ██████╗  ██████╗ ████████╗
██║██╔════╝╚██╗ ██╔╝    ██╔════╝████╗  ██║██║ ██╔╝██╔══██╗██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
██║██║      ╚████╔╝     ███████╗██╔██╗ ██║█████╔╝ ██████╔╝███████╗    ██████╔╝██║   ██║   ██║   
██║██║       ╚██╔╝      ╚════██║██║╚██╗██║██╔═██╗ ██╔══██╗╚════██║    ██╔══██╗██║   ██║   ██║   
██║╚██████╗   ██║       ███████║██║ ╚████║██║  ██╗██║  ██║███████║    ██████╔╝╚██████╔╝   ██║   
╚═╝ ╚═════╝   ╚═╝       ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚═════╝  ╚═════╝    ╚═╝   
\nRELEASE SETTINGS: \n`)

  await inputRegion();
  await inputSKU()
  await getProductInfo(sku);
  await inputSizes();
  await inputBrowserDelays();
  await inputSaveSessions();
  await inputUseProxies();

  rl.close();
  console.log(`\nStarting browsers... 🚀\n`)
  if (useProxiesInput === "Y") {
    console.log(`Loaded PROXIES: ${proxyServer.length}`)
  }
  for (let i = 0; i < sizes.length; ++i) {

    // Read the accounts session from file
    let sessionsRead;
    if(saveSessionsInput === "Y"){
      sessionsRead = {};
    } else {
      const filePath = path.join(dirPath, `session_${usernames[i]}.json`);
      sessionsRead = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    // Read proxies from file
    let proxy;
    if(useProxiesInput === "Y") {
      proxy = {
        server: proxyServer[i]+":"+proxyPort[i],
        username: proxyUsername[i],
        password: proxyPassword[i]
      }
    }

    firefox.launch({
      proxy: proxy,
      headless: false,
      slowMo: 75,
      devtools: false,
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: true,
    }).then(async (browser) => {
      const context = await browser.newContext({
        viewport: {
          width: 1024,
          height: 768
        },
        timeout: 0,
        storageState: sessionsRead,
      });
      const page = await context.newPage();
      let link = `https://nike.com/${region.toLowerCase()}/launch`;
      await page.goto(`${link}`, {timeout: 0, waitUntil: 'load'});
      page.setDefaultTimeout(0);

      ///////////////////////////////// AUTO SCROLL form + speed ///////////////////////////////////////

      async function scrollToBottomThenTop(page) {
        await page.evaluate(() => {
          const scrollInterval = setInterval(() => {
            window.scrollBy(0, 500); // Adjust this value to change the scroll speed
            if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
              clearInterval(scrollInterval);
            }
          }, 500);
        });
        await page.waitForTimeout(3000);

        await page.evaluate(() => {
          const scrollInterval = setInterval(() => {
            window.scrollBy(0, -500);
            if (window.scrollY === 0) {
              clearInterval(scrollInterval);
            }
          }, 500);
        });
      }

      //////////////////////////////// Mouse movement GEN  ///////////////////////////////////////
      let lastX = 0;
      let lastY = 0;

      async function mouseGen(page) {
        const viewport = page.viewportSize();
        const width = viewport.width;
        const height = viewport.height;

        const randomX = Math.floor(Math.random() * width);
        const randomY = Math.floor(Math.random() * height);

        const steps = 25;
        const delay = 0;

        for (let i = 0; i < steps; i++) {
          const randomOffsetX = Math.random() * 2 - 1;
          const randomOffsetY = Math.random() * 2 - 1;
          const intermediateX = lastX + ((randomX - lastX) * (i / steps)) + randomOffsetX;
          const intermediateY = lastY + ((randomY - lastY) * (i / steps)) + randomOffsetY;

          // Add a random variation to the intermediate coordinates
          const variation = 3; // Adjust this value to change the amount of variation
          const variationX = Math.random() * variation - variation / 2;
          const variationY = Math.random() * variation - variation / 2;

          await page.mouse.move(intermediateX + variationX, intermediateY + variationY);

          await page.waitForTimeout(delay);
        }

        lastX = randomX;
        lastY = randomY;
      }

      //////////////////////////////// SHOW CURSOR ///////////////////////////////////////
      async function showCursor(page) {
        await page.evaluate(() => {
          // Create a new element to represent the cursor
          const cursor = document.createElement('div');
          cursor.style.position = 'absolute';
          cursor.style.height = '20px';
          cursor.style.width = '20px';
          cursor.style.border = '1px solid rgba(0, 207, 255, 0.75)';
          cursor.style.borderRadius = '50%';
          cursor.style.backgroundColor = 'rgba(0, 202, 255, 0.14)';
          cursor.style.backdropFilter = 'blur(10px)';
          cursor.style.pointerEvents = 'none';
          cursor.style.zIndex = '999999';
          cursor.style.default = 'true';
          cursor.id = 'customCursor';
          document.body.appendChild(cursor);

          document.addEventListener('mousemove', (e) => {
            cursor.style.left = `${e.pageX}px`;
            cursor.style.top = `${e.pageY}px`;
          });
        });
      }

      ///////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////// STEP 1 //////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////
      showCursor(page); // cursor shown

      // Accept cookies in case they are displayed
      try {
        const cookieDialog = await page.getByTestId("cookie-dialog-root");
        const cookieSettings = await page.locator(".cookie-settings-layout");
        await mouseGen(page);
        if (await cookieDialog.isVisible()) { // Cookie Dialog
          await page.waitForTimeout(Number(`${randomLongTime}`));
          await page.getByTestId('dialog-accept-button').click();
          console.log(`Cookie Dialog accepted! (${i + 1})`);
          await page.waitForTimeout(Number(`${randomShortTime}`));
          showCursor(page);
          await mouseGen(page);
        } else if (await cookieSettings.isVisible()) { // Cookie Settings
          await page.waitForTimeout(Number(`${randomLongTime}`));
          await page.locator('[data-qa="accept-cookies"]').click();
          console.log(`Cookie Settings accepted! (${i + 1})`);
          await page.waitForTimeout(Number(`${randomShortTime}`));
          showCursor(page);
          await mouseGen(page);
        }
      } catch (error) {
        await mouseGen(page);
        console.log(`No cookies found to ACCEPT! 🟡 (${i + 1})`);
      }

      // When you have to accept cookies you are not logged in and you have to reconfirm the account
      if (await page.locator(".join-log-in").isVisible() === true && saveSessionsInput === "N") {
        try {
          await page.locator(".join-log-in").click();
          await page.waitForTimeout(Number(`${randomLongTime}`));
          await page.waitForSelector(".nds-btn.css-hj7pkf.btn-primary-dark.btn-md", {timeout: 30000});
          await page.click(".nds-btn.css-hj7pkf.btn-primary-dark.btn-md");
          console.log(`Account second CHECK confirmed! 🟢 (${i+1})`)
        } catch (error) {
          console.log("Error clicking on Join/Login button 🔴:", error);
        }
      }

      ///////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////// STEP 2 //////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////

      // Waiting few seconds then click on the Upcoming button
      try {
        await page.waitForTimeout(Number(`${randomShortTime}`));
        await page.waitForSelector('text=Upcoming')
        showCursor(page);
        await mouseGen(page);
        await page.click('text=Upcoming');
        console.log(`Upcoming page opened. (${i+1})`)
        await page.waitForTimeout(Number(`${randomShortTime}`));
        await scrollToBottomThenTop(page);
        await page.waitForTimeout(Number(`${randomLongTime}`));
        await mouseGen(page);
      } catch (error) {
        console.log(`No upcoming button found 🔴 (${i+1})`);
      }

      ///////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////// STEP 3 //////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////

      // Waiting few seconds then click on the product we want to buy
      try {
        showCursor(page);
        await mouseGen(page);
        await page.getByAltText(`${sku}`).scrollIntoViewIfNeeded();
        await mouseGen(page);
        await page.getByAltText(`${sku}`).click();
        await page.waitForTimeout(Number(`${randomShortTime}`));
        await page.keyboard.press('Space');
        await mouseGen(page);
        console.log(`Product page opened. (${i+1})`);
      } catch (error) {
        console.log(`No product found 🔴 (Redirect to checkout page...) (${i+1})`);
      }

      ///////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////// STEP 4 //////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////

      // Login in with your credentials [AVAILABLE ONLY WHEN YOU WANT TO MAKE SESSIONS]
      if(saveSessionsInput === "Y") {
        try {
          await page.waitForTimeout(Number(`${randomShortTime}`));
          await mouseGen(page);
          await page.locator(".join-log-in").scrollIntoViewIfNeeded()
          await page.click(".join-log-in");
          console.log(`Login page opened. (${i+1})`);
          await page.waitForTimeout(Number(`${randomLongTime}`));
          await page.locator("#username").click();
          await page.waitForTimeout((721));
          console.log(`Typing email address... (${i+1})`);
          await page.locator("#username").pressSequentially(`${usernames[i]}`, {delay: 271});
          await page.waitForTimeout(Number(`${randomShortTime}`));
          await page.click('text=Continue');
          await page.waitForTimeout(Number(`${randomShortTime}`));
          await page.locator("#password").click();
          await page.waitForTimeout((672));
          console.log(`Typing password... (${i+1})`);
          await page.locator("#password").pressSequentially(`${passwords[i]}`, {delay: 243});
          await page.waitForTimeout(Number(`${randomShortTime}`));
          await page.getByRole("button", {name: "Sign in"}).click();
          console.log(`Waiting for IMAP... (${i+1})`);
          await page.waitForTimeout((10000));
          await page.waitForNavigation();
          console.log(`Sign In... (${i+1})`);

          // Save the session
          try {
            const filePath = path.join(dirPath, `session_${usernames[i]}.json`);
            const storageExport = await context.storageState();
            fs.writeFileSync(filePath, JSON.stringify(storageExport));
            console.log(`Session saved! 🟢 (${usernames[i]})`)
          } catch (error) {
            console.log(`Error saving session 🔴:`, error);
          }
        } catch (error) {
          console.log(`Login In error found 🔴 (${i+1}):`, error);
        }
      }



      ///////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////// STEP 5 //////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////

      // Select the size and add to cart [AVAILABLE ONLY WHEN YOU WANT TO BE MORE "SAFE"] (Modify by your preferences)
      // try {
      //     await mouseGen(page);
      //     await page.waitForTimeout(Number(`${randomLongTime}`));
      //     await page.keyboard.press('Space');
      //     await mouseGen(page);
      //     await page.waitForSelector('.size-layout', {timeout: 0});
      //     await page.$eval(".size-layout", (element) => {
      //       element.scrollIntoView();
      //     });
      //     await page.waitForTimeout(Number(`${randomShortTime}`));
      //     await mouseGen(page);
      //     await page.click(`text=EU ${sizes[i]}`); // ="${regionSize} ${sizes[i]}" - format
      //     await mouseGen(page);
      //     await page.click('.buying-tools-cta-button');
      // } catch (error) {
      //   console.log(`Size not found 🔴 (${i+1}):`, error);
      // }


      ///////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////// STEP 6 //////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////



      // Redirecting to GS Checkout link PAGE (In case you want to use another entry flow)
      try {
        let redirectLink = `https://www.nike.com/${region.toLowerCase()}/launch/r/${sku.toUpperCase()}?size=${sizes[i]}&productId=${productId}`;
        await page.goto(`${redirectLink}`, {timeout: 0, waitUntil: 'load'});
        await page.waitForTimeout(Number(`${randomShortTime}`));
        console.log(`Redirecting to GS Checkout link page. (${i+1})`);
      } catch(error) {
        console.log("Error redirecting to GS Checkout link page 🔴:", error)
      }
      // Sometimes nike adds a GS TERMS pop-up to accept
      try {
        const gsTerms = await page.locator('a.ncss-btn-primary-dark');
        await gsTerms.waitFor({timeout: 5000});
        if (await gsTerms.isVisible()) {
          showCursor(page);
          await page.waitForTimeout(Number(`${randomShortTime}`));
          await gsTerms.click();
          console.log(`GS TERMS Accepted! (${i+1})`);
        }
      } catch (error) {
        console.log(`No GS TERMS to accept! (${i+1})`);
      }

      ////////////////////// Getting to GS Checkout link page//////////////////////

      // Wait for the iframe to load + access it
      try {
        await page.waitForTimeout(Number(`${randomLongTime}`));
        showCursor(page);
        await mouseGen(page);

        // Fill the card number
        try {
          console.log(`Filling the card number. (${i+1})`);
          const cardNumber = await page.frameLocator(".newCard").locator(".card-number-col");
          await page.waitForTimeout(Number(`${randomShortTime}`));
          showCursor(page);
          await cardNumber.click();
          await cardNumber.pressSequentially(`${cardNumbers[i]}`, {delay: 382});
        } catch (error) {
          console.log("Error getting to card input 🔴:", error)
        }

        // Fill the card MM/YY
        try {
          console.log(`Filling the card MM/YY. (${i+1})`);
          await page.waitForTimeout(Number(`${randomShortTime}`));
          const cardExp = await page.frameLocator(".newCard").locator(".card-expiry-col");
          await mouseGen(page);
          await cardExp.click();
          await cardExp.pressSequentially(`${cardExpiry[i]}`, {delay: 414});
        } catch (error) {
          console.log("Error getting to card MM/YY 🔴:", error)
        }

        // Fill the card CVC
        try {
          console.log(`Filling the card CVC. (${i+1})`)
          await page.waitForTimeout(Number(`${randomShortTime}`));
          const cardCvc = await page.frameLocator(".newCard").locator(".card-cvc-col");
          await mouseGen(page);
          await cardCvc.click();
          await cardCvc.pressSequentially(`${cardSecurityCodes[i]}`, {delay: 552});
        } catch (error) {
          console.log("Error getting to card CVC 🔴:", error)
        }

        // Click on the "Continue" button
        await page.waitForTimeout(Number(`${randomShortTime}`));
        await mouseGen(page);
        await page.click('text=Continue');
        await page.waitForTimeout(Number(`${randomShortTime}`));
        // Check box of Terms in case it is not checked
        if(await page.locator(".container.isChecked .checkmark").nth(1).isVisible() === false) {
          await mouseGen(page);
          await page.locator(".gdprConsentCheckbox .checkmark").click();
        }

        // Submit the order + adding timer
        await page.waitForTimeout(Number(`${randomShortTime}`));
        let targetTime = new Date(startEntryDate);
        let randomSubmitSec = Math.floor(Math.random() * 10) + 1;
        let randomSubmitMilSec = Math.floor(Math.random() * 1000);
        targetTime.setHours(`${targetTime.getHours()}`, 0, `${randomSubmitSec}`, `${randomSubmitMilSec} `);
        console.log(targetTime);
        console.log(`Submitting on ${targetTime} (ms: ${targetTime.getMilliseconds()})...⏳ (${i+1})`);
        let currentTime = new Date();
        let delay = targetTime.getHours() - currentTime.getHours();
        if (delay < 0) {
          delay += 24 * 60 * 60 * 1000;
        }
        setTimeout(async function () {
          let currentHour = new Date();
          if (currentHour >= targetTime) {
            await mouseGen(page);
            await page.click('text=Submit Order');
            console.log(`Entry Submitted 🟢 (${i+1})`);
          } else {
            console.log(`Waiting to submit order...🟡 (${i+1})`);
          }
        }, delay);
      } catch (error) {
        console.log("Error getting to GS checkout link page 🔴:", error)
      }
    })
    await browserTimeout(browserDelayNumber);
  }
}
startBrowsers();