import { chromium } from 'playwright';
import fs from 'fs/promises';
import teacherData from './matcheds.json' assert { type: 'json' };

const MAX_CONCURRENT_BROWSERS = 3; // Número máximo de navegadores.
const TABS_PER_BROWSER = 5; // Pestañas por navegador.

const processTeacherData = async () => {
  console.time('ProcessingTime');
  // Crea un pool de navegadores.
  const browsers = await Promise.all(
    new Array(MAX_CONCURRENT_BROWSERS).fill(null).map(() => chromium.launch({ headless: true }))
  );
  const allComments = [];
  const notAvailable = [];

  // Divide los datos de profesores en bloques según el número total de pestañas disponibles.
  const totalTabs = MAX_CONCURRENT_BROWSERS * TABS_PER_BROWSER;
  const chunks = [];
  for (let i = 0; i < teacherData.length; i += totalTabs) {
    chunks.push(teacherData.slice(i, i + totalTabs));
  }

  // Procesa cada bloque en serie, pero procesa a los profesores de cada bloque en paralelo.
  for (const chunk of chunks) {
    const promises = chunk.map((teacher, index) => {
      const browserIndex = Math.floor(index / TABS_PER_BROWSER);
      return processSingleTeacher(browsers[browserIndex], teacher, allComments, notAvailable);
    });
    await Promise.all(promises);
  }

  await saveData(allComments, notAvailable);
  await Promise.all(browsers.map(browser => browser.close())); // Cierra todos los navegadores.
  console.timeEnd('ProcessingTime');
};

const processSingleTeacher = async (browser, teacher, allComments, notAvailable) => {
  const page = await browser.newPage();
  await page.goto('https://www.nuevosemestre.com/');
  console.log('\x1b[32m%s\x1b[0m', `Processing ${teacher.name}`);

  await page.fill('input[name="query"]', teacher.matchedName);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle' })
  ]);

  const noOpinionsAvailable = await page.$(
    'img[src="https://www.nuevosemestre.com/images/confused.svg"]'
  );
  if (noOpinionsAvailable) {
    notAvailable.push(teacher);
    await page.close();
    return;
  }

  const teacherData = { name: teacher.name, id: teacher.id, comments: await extractComments(page) };
  allComments.push(teacherData);
  await page.close();
};

const saveData = async (comments, notAvailable) => {
  console.log('Saving data...');
  await fs.writeFile('comments-uasd-teachers2.json', JSON.stringify(comments, null, 2));
  await fs.writeFile('not-available-teachers.json', JSON.stringify(notAvailable, null, 2));
};

const extractComments = async page => {
  return page.$$eval('div[x-data="{ reply_box_is_visible: false }"]', comments =>
    comments.map(comment => ({
      username: comment.querySelector('p').textContent,
      period: comment.querySelector('p.text-sm').textContent,
      content: comment.querySelector('p.bg-neutral-300').textContent
    }))
  );
};

processTeacherData().catch(console.error); // Inicia el proceso de procesamiento de datos de profesores.
