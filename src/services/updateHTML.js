"use strict";

const fs = require("fs");
const puppeteer = require('puppeteer');
const request = require('request');

const mainURL = "https://eecsappsrv.mit.edu/cgi-bin-secure/eecsis/degree_requirements.cgi";
const participationURL = "https://eecsappsrv.mit.edu/cgi-bin-secure/eecsis/whos_taken_what.cgi";

module.exports = async () => {
    let page;
    let browser;
    
    // switch to using the other functions if you want to run headlessly w/ certificate files.
    // [ page, browser ] = await launchHeadless();
    [ page, browser ] = await launchNotHeadless();


    await page.goto(mainURL);
    let html = await page.content();
    await fs.writeFile('src/lib/html/main.html', html, (err) => {
        if (err) throw err;
      });
    await page.goto(participationURL);
    html = await page.content();
    await fs.writeFile('src/lib/html/participation.html', html, (err) => {
        if (err) throw err;
      });
    await browser.close();
}

const launchNotHeadless = async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    return [ page, browser ];
};

const launchHeadless = async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    // Enable Request Interception
    await page.setRequestInterception(true);
  
    // Client cert files
    const cert = fs.readFileSync('lib/certs/cert.pem'); // certifiate file
    const key = fs.readFileSync('lib/certs/server.key'); // rsa key
  
    page.on('request', interceptedRequest => {
        // Intercept Request, pull out request options, add in client cert
        const options = {
            uri: interceptedRequest.url(),
            method: interceptedRequest.method(),
            headers: interceptedRequest.headers(),
            body: interceptedRequest.postData(),
            cert: cert,
            key: key
        };
  
        // Fire off the request manually (example is using using 'request' lib)
        request(options, function(err, resp, body) {
            // Abort interceptedRequest on error
            if (err) {
                console.error(`Unable to call ${options.uri}`, err);
                return interceptedRequest.abort('connectionrefused');
            }
  
            // Return retrieved response to interceptedRequest
            interceptedRequest.respond({
                status: resp.statusCode,
                contentType: resp.headers['content-type'],
                headers: resp.headers,
                body: body
            });
        });
  
    });

    return [page, browser];
};