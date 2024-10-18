import { chromium } from 'playwright';
import fs from 'fs/promises';
import licenciaturaCienciasPoliticas from './carrera_politica.json' assert { type: 'json' };
//import conexionMaestroMateria from './dataScraping/conexion-maestro-materia.json' assert { type: 'json' };
//import commentsTeachersV1 from './comments-uasd-teachers.json' assert { type: 'json' };
//import commentsTeachersV2 from './comments-uasd-teachers-v2.json' assert { type: 'json' };

console.log('Inicio de la comparación de nombres...');
//console.time('Tiempo de ejecución');

const MAX_CONCURRENT_PAGES = 20;

const processTeacherData = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const pages = await Promise.all(
    Array.from({ length: MAX_CONCURRENT_PAGES }, () => context.newPage())
  );

  const allConexion = [];
  const notAvailable = [];

  // Filtrar materias de la carrera de Ciencias Políticas
  const filteredSubjects = licenciaturaCienciasPoliticas.filter(subject => subject.escuela === 'Escuela de Ciencias Políticas');

  const queue = filteredSubjects.slice();
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
  console.timeEnd('Tiempo de ejecución');
};

const processSingleSubjects = async (page, subject, allConexion, notAvailable) => {
  const maxRetries = 3;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const subjectCode = subject.clave.replace('-', '');
      const url = `https://www.nuevosemestre.com/programacion-docente/${subjectCode}`;
      await page.goto(url);
      console.log('\x1b[32m%s\x1b[0m', `Processing ${subject.clave}`);

      const noSubjectAvailable = await page.$(
        'img[src="https://media1.tenor.com/m/g0Tp5wjXrSgAAAAC/simpsons-batter.gif"]'
      );
      if (noSubjectAvailable) {
        console.log('No opinions available for:', subject.clave);
        notAvailable.push(subject);
        return;
      }

      const subjectData = {
        id: subject.id,
        name: subject.asignatura,
        code: subject.clave,
        codeFinal: subjectCode,
        instructors: []
      };

      const [allConnections, noConnections] = await extractComments(page);

      subjectData.instructors = allConnections;
      notAvailable.push(...noConnections);

      const totalPages = await page.$$eval(
        'button[type="button"][wire\\:click*="gotoPage"]',
        buttons => buttons.length
      );

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        await page.click(`button[wire\\:click="gotoPage(${pageNumber + 1}, 'page')"]`);
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        const [comments, noConnection] = await extractComments(page);
        subjectData.instructors.push(...comments);
        notAvailable.push(...noConnection);
      }
      allConexion.push(subjectData);
      return;
    } catch (error) {
      console.error('Error processing teacher:', subject.clave, error);
      retries++;
    }
  }
};

const saveData = async (connections, notAvailable) => {
  const dir = './dataScraping';
  console.log('Saving data...');
  try {
    await fs.access(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Directory does not exist, creating it...');
      await fs.mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
  await fs.writeFile(`${dir}/conexion-maestro-materia-politics.json`, JSON.stringify(connections, null, 2));
  await fs.writeFile(`${dir}/not-materia-available-politics.json`, JSON.stringify(notAvailable, null, 2));
};

const extractComments = async page => {
  await page.waitForSelector('tr.border-2');
  const cleanName = name => name.replace(/\s+/g, ' ').trim();
  const compareNames = (name1, name2) => {
    const name1Words = cleanName(name1).toLowerCase().split(' ');
    const name2Words = cleanName(name2).toLowerCase().split(' ');
    const commonWords = name1Words.filter(word => name2Words.includes(word)).length;
    const totalWords = new Set([...name1Words, ...name2Words]).size;
    return commonWords / totalWords;
  };

  const nombres = await page.$$eval('tr.border-2 td.px-5.py-3 a.underline', elements =>
    elements.map(el => el.textContent.trim())
  );

  const allConnections = [];
  const noConnections = [];

  nombres.forEach(name => {
    let highestScore = 0;
    let bestMatch = null;

    allTeachers.forEach(teacher => {
      const similarityScore = compareNames(name, teacher.matchedName);
      if (similarityScore > highestScore && similarityScore > 0.5) {
        highestScore = similarityScore;
        bestMatch = { ...teacher, matchedName: name };
      }
    });

    if (bestMatch) {
      allConnections.push(bestMatch);
    } else {
      noConnections.push(name);
    }
  });
  return [allConnections, noConnections];
};

processTeacherData().catch(console.error);
console.log('Fin de la comparación de nombres...');
//console.timeEnd('Tiempo de ejecución');
