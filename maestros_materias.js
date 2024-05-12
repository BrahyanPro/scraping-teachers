import { chromium } from 'playwright';
import allTeachers from './teachers.json' assert { type: 'json' };
import allSubjects from './subjects.json' assert { type: 'json' };
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

  await saveData(allConexion, notAvailable);
  await context.close();
  await browser.close();
  console.timeEnd('ProcessingTime');
};

const processSingleSubjects = async (page, subject, allConexion, notAvailable) => {
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

      const [allConections, noConections] = await extractComments(page);

      SubjectData.instructors = allConections;
      notAvailable.push(...noConections);
      // Handle pagination
      const totalPages = await page.$$eval(
        'button[type="button"][wire\\:click*="gotoPage"]',
        buttons => buttons.length
      );
      console.log('Total pages:', totalPages, 'in ', SubjectData.code);

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        await page.click(`button[wire\\:click="gotoPage(${pageNumber + 1}, 'page')"]`);
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        const [comments, noConection] = await extractComments(page);
        SubjectData.instructors.push(...comments);
        notAvailable.push(...noConection);
      }
      allConexion.push(SubjectData);
      return;
    } catch (error) {
      console.error('Error processing teacher:', subject.code, error);
    }
  }
};

const saveData = async (comments, notAvailable) => {
  console.log('Saving data...');
  await fs.writeFile(
    './dataScraping/conexion-maestro-materia.json',
    JSON.stringify(comments, null, 2)
  );
  await fs.writeFile(
    './dataScraping/not-materia-available-for-teachers.json',
    JSON.stringify(notAvailable, null, 2)
  );
};

const extractComments = async page => {
  // Espera a que los elementos estén visibles en la página
  await page.waitForSelector('tr.border-2');
  const cleanName = name => {
    return name.replace(/\s+/g, ' ').trim(); // Simplifica espacios y remueve espacios extras
  };
  const compareNames = (name1, name2) => {
    const name1Words = cleanName(name1).toLowerCase().split(' ');
    const name2Words = cleanName(name2).toLowerCase().split(' ');

    const commonWords = name1Words.filter(word => name2Words.includes(word)).length;
    const totalWords = new Set([...name1Words, ...name2Words]).size;
    return commonWords / totalWords; // Jaccard index for word similarity
  };
  // Extrae los nombres de los profesores
  const nombres = await page.$$eval('tr.border-2 td.px-5.py-3 a.underline', elementos =>
    elementos.map(el => el.textContent.trim())
  );

  const allConections = [];
  const noConections = [];
  const prevMatches = new Set();

  nombres.forEach(name => {
    let highestScore = 0;
    let bestMatch = null;

    allTeachers.forEach(teacher => {
      const similarityScore = compareNames(name, `${teacher.first_name} ${teacher.last_name}`);
      // Utilize a more stringent threshold to prevent incorrect matches
      if (similarityScore > highestScore && similarityScore > 0.5) {
        highestScore = similarityScore;
        bestMatch = { ...teacher, matchedName: name };
      }
    });

    if (bestMatch) {
      allConections.push(bestMatch);
      prevMatches.add(bestMatch.id);
    } else {
      noConections.push(name);
    }
  });
  return [allConections, noConections];
};

processTeacherData().catch(console.error); // Inicia el proceso de procesamiento de datos de profesores.
console.log('Fin de la comparación de nombres...');
console.timeEnd('Tiempo de ejecución');
