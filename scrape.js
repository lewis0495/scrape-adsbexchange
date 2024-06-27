const puppeteer = require('puppeteer');
const fs = require('fs');

const icaos = ['40809a', '407fb9', '40809b', '408099'];
let data = [];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const pages = {};

  // Create a page for each ICAO and store it in the pages object
  for (const icao of icaos) {
    pages[icao] = await browser.newPage();
    const url = `https://globe.adsbexchange.com/?icao=${icao}`;
    await pages[icao].goto(url, { waitUntil: 'networkidle2' });
  }

  const scrapeData = async () => {
    const newData = [];

    for (const icao of icaos) {
      const page = pages[icao];
      try {
        await page.waitForSelector('#selected_position', { visible: true });
        await page.waitForSelector('#selected_track1', { visible: true });
        await page.waitForSelector('#selected_tas', { visible: true });

        const position = await page.$eval('#selected_position', el => el.textContent.trim());
        const track = await page.$eval('#selected_track1', el => el.textContent.trim());
        const tas = await page.$eval('#selected_tas', el => el.textContent.trim());

        const [latitude, longitude] = position.split('°, ').map(coord => coord.replace('°', '').trim());
        const speed = tas.replace('kt', '').trim();

        newData.push({ icao, latitude, longitude, track, speed });
      } catch (error) {
        console.error(`Error extracting data for ICAO ${icao}:`, error);
      }
    }

    // Update the data and write it to a JSON file
    data = newData;
    fs.writeFileSync('aircraft_data.json', JSON.stringify(data, null, 2));
    console.log("Data updated successfully.");
  };

  // Initial data scrape
  await scrapeData();

  // Schedule the scrapeData function to run every 30 seconds
  setInterval(scrapeData, 30000);
})();
