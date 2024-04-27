import { chromium } from 'playwright';

import fs from 'fs/promises';

const proccesinExtract = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.nuevosemestre.com/calificar');

  //click in a with href contain '/iniciar-sesion'
  await page.click('a[href*="/iniciar-sesion"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });

  await page.fill('input[name="email"]', 'animeacademia09@gmail.com');
  await page.fill('input[name="password"]', 'svNN4MZuqXZCcZU');
  //Click in button type submit
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });

  await page.goto('https://www.nuevosemestre.com/calificar');

  //Get all options in select input with name 'materia'
  const options = await page.$$('select[name="name_teacher"] option');

  //Get all values of options
  const values = await Promise.all(
    options.map(async option => {
      return await option.evaluate(node => node.value);
    })
  );

  //Get all text of options
  const text = await Promise.all(
    options.map(async option => {
      return await option.evaluate(node => node.textContent);
    })
  );

  //Save option values and text in a object
  const optionsValues = values.map((value, index) => {
    return {
      value: value,
      name: text[index]
    };
  });

  //Save in json file
  await fs.writeFile('full_name_from_nuevosemestre.json', JSON.stringify(optionsValues, null, 2));

  await browser.close();
};

proccesinExtract().catch(error => console.error(error));
