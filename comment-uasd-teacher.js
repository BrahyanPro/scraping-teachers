import { firefox } from 'playwright';
import fs from 'fs/promises';
import teacherData from './matcheds.json' assert { type: 'json' };

const MAX_CONCURRENT_PAGES = 20; // Número máximo de páginas concurrentes.

const processTeacherData = async () => {
  console.time('ProcessingTime');
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const pages = await Promise.all(
    Array.from({ length: MAX_CONCURRENT_PAGES }, () => context.newPage())
  );

  const allComments = [];
  const notAvailable = [];
  const queue = teacherData.slice();
  while (queue.length > 0) {
    const tasks = queue
      .splice(0, MAX_CONCURRENT_PAGES)
      .map((teacher, index) =>
        processSingleTeacher(
          pages[index % MAX_CONCURRENT_PAGES],
          teacher,
          allComments,
          notAvailable
        )
      );
    await Promise.all(tasks);
  }

  await saveData(allComments, notAvailable);
  await context.close();
  await browser.close();
  console.timeEnd('ProcessingTime');
};

const processSingleTeacher = async (page, teacher, allComments, notAvailable) => {
  const maxRetries = 3; // Número máximo de reintentos.
  let retries = 0;
  while (retries < maxRetries) {
    try {
      //Go To nuevosemestre.com
      await page.goto('https://www.nuevosemestre.com/');
      console.log('\x1b[32m%s\x1b[0m', `Processing ${teacher.matchedName}`);

      await page.fill('input[name="query"]', teacher.matchedName);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 })
      ]);

      const noOpinionsAvailable = await page.$(
        'img[src="https://www.nuevosemestre.com/images/confused.svg"]'
      );
      if (noOpinionsAvailable) {
        notAvailable.push(teacher);
        return;
      }

      const opinionText = await page.textContent('a[href*="profesor/"][class*="bg-sky-700"]'); // Selector específico del enlace de opiniones.
      const numOpiniones = parseInt(opinionText.match(/\d+/)[0]); // Extrae el número de opiniones.

      if (numOpiniones > 0) {
        await page.click('a[href*="profesor/"][class*="bg-sky-700"]'); // Hace clic en el enlace si hay más de 0 opiniones.
        await page.waitForNavigation({ waitUntil: 'networkidle' }); // Espera hasta que la red esté casi inactiva.

        const teacherData = {
          name: teacher.name,
          matchedName: teacher.matchedName,
          id: teacher.id
        };

        teacherData.comments = await extractComments(page);
        // Handle pagination
        const totalPages = await page.$$eval(
          'button[type="button"][wire\\:click*="gotoPage"]',
          buttons => buttons.length
        );
        console.log('Total pages:', totalPages, 'in ', teacher.matchedName);
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
          await page.click(`button[wire\\:click="gotoPage(${pageNumber + 1}, 'page')"]`);
          await page.waitForNavigation({ waitUntil: 'networkidle' });
          const comments = await extractComments(page);
          teacherData.comments.push(...comments);
        }
        allComments.push(teacherData);
      }
      return;
    } catch (error) {
      console.error('Error processing teacher:', teacher.matchedName, error);
      // Manejar errores específicos o reintentar según sea necesario
    }
  }
};

const saveData = async (comments, notAvailable) => {
  console.log('Saving data...');
  await fs.writeFile('comments-uasd-teachers-v2.json', JSON.stringify(comments, null, 2));
  await fs.writeFile(
    'not-comments-available-teachers-v2.json',
    JSON.stringify(notAvailable, null, 2)
  );
};

const extractComments = async page => {
  //screentshot
  return page.$$eval('div[x-data="{ reply_box_is_visible: false }"]', comments =>
    comments.map(comment => {
      console.log(comment);
      const username = comment.querySelector('p').textContent;
      const period = comment.querySelector('p.text-sm').textContent;
      const content = comment.querySelector('p.bg-neutral-300').textContent;
      return { username, period, content };
    })
  );
};

processTeacherData().catch(console.error); // Inicia el proceso de procesamiento de datos de profesores.
