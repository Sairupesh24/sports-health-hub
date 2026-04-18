const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Set a mobile viewport
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log("Navigating to http://localhost:3000/mobile/client");
    await page.goto('http://localhost:3000/mobile/client', { waitUntil: 'networkidle2' }).catch(e => console.log('Goto error:', e));

    setTimeout(async () => {
        await browser.close();
    }, 2000);
})();
