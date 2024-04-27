import { chromium, firefox } from 'playwright';
import fs from 'fs/promises';
import teacherData from './matcheds.json' assert { type: 'json' };

const MAX_CONCURRENT_PAGES = 15; // Número máximo de páginas concurrentes.

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
      await page.waitForURL('https://www.nuevosemestre.com/');
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

      const teacherData = {
        name: teacher.name,
        matchedName: teacher.matchedName,
        id: teacher.id,
        comments: await extractComments(page)
      };
      allComments.push(teacherData);
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
  return page.$$eval('div[x-data="{ reply_box_is_visible: false }"]', comments =>
    comments.map(comment => ({
      username: comment.querySelector('p').textContent,
      period: comment.querySelector('p.text-sm').textContent,
      content: comment.querySelector('p.bg-neutral-300').textContent
    }))
  );
};

processTeacherData().catch(console.error); // Inicia el proceso de procesamiento de datos de profesores.
