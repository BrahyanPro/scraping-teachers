import { chromium } from 'playwright';
import allTeachers from './teachers.json' assert { type: 'json' };
import allSubjects from './subjects.json' assert { type: 'json' };
import teacherData from './unique_matcheds.json' assert { type: 'json' };
import fs from 'fs/promises';

console.log('Inicio de la comparación de nombres...');
console.time('Tiempo de ejecución');

const MAX_CONCURRENT_PAGES = 20; // Número máximo de páginas concurrentes.
const processTeacherData = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const pages = await Promise.all(
    Array.from({ length: MAX_CONCURRENT_PAGES }, () => context.newPage())
  );

  const allConexion = [];
  const notAvailable = [];
  const queue = allSubjects.slice();
  while (queue.length > 0) {
    const tasks = queue
      .splice(0, MAX_CONCURRENT_PAGES)
      .map((subject, index) =>
        processSingleSubjects(
          pages[index % MAX_CONCURRENT_PAGES],
          subject,
          allConexion,
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

const processSingleSubjects = async (page, subject, allComments, notAvailable) => {
  const maxRetries = 3; // Número máximo de reintentos.
  let retries = 0;
  while (retries < maxRetries) {
    try {
      //Transform string LET-0120 to LET0120
      const subjectCode = subject.code.replace('-', '');
      const url = `https://www.nuevosemestre.com/programacion-docente/${subjectCode}`;
      //Go To nuevosemestre.com
      await page.goto(url);
      console.log('\x1b[32m%s\x1b[0m', `Processing ${subject.code}`);
      //screenShot
      await page.screenshot({ path: `screenshots/${subjectCode}.png` });
      //Check if subjects are no opinions available
      const noSubjectAviable = await page.$(
        'img[src="https://media1.tenor.com/m/g0Tp5wjXrSgAAAAC/simpsons-batter.gif"]'
      );
      if (noSubjectAviable) {
        console.log('No opinions available for:', subject.code);
        notAvailable.push(subject);
        return;
      }

      const SubjectData = {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        codeFinal: subjectCode,
        instructors: []
      };

      SubjectData.instructors = await extractComments(page);
      // Handle pagination
      const totalPages = await page.$$eval(
        'button[type="button"][wire\\:click*="gotoPage"]',
        buttons => buttons.length
      );
      console.log('Total pages:', totalPages, 'in ', SubjectData.code);

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        await page.click(`button[wire\\:click="gotoPage(${pageNumber + 1}, 'page')"]`);
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        const comments = await extractComments(page);
        teacherData.comments.push(...comments);
      }
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
  await fs.writeFile('comments-uasd-teachers-v3.json', JSON.stringify(comments, null, 2));
  await fs.writeFile(
    'not-comments-available-teachers-v3.json',
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
console.log('Fin de la comparación de nombres...');
console.timeEnd('Tiempo de ejecución');
