import { chromium } from 'playwright';
import fs from 'fs/promises';
import teacherData from './maestros-uasd.json' assert { type: 'json' };

const processTeacherData = async () => {
  const browser = await chromium.launch({ headless: true }); // Lanza el navegador en modo headless.
  const page = await browser.newPage(); // Abre una nueva página.
  await page.goto('https://www.nuevosemestre.com/'); // Va a la página solo una vez.

  console.time('ProcessingTime'); // Inicia el temporizador para el proceso completo.

  const allComments = [];
  const notAvailable = [];
  let count = 0;
  for (const [idx, teacher] of teacherData.entries()) {
    //118;
    //if ((idx >= 2 && idx !== 1378) || idx > 1378) continue; // Salta el índice 2 y 1378.
    //if (idx < 118) continue;
    count++;
    if (count % 60 === 0) {
      console.log('Taking a pause...');
      await pauseProcessing();
      await saveData(allComments, notAvailable);
    }
    console.log('\x1b[32m%s\x1b[0m', `%c Processing index: ${idx} - ${teacher.name}`);

    const teacherData = { name: teacher.name, id: teacher.id, comments: [] }; // Crea un objeto de datos del profesor.
    const cleanName = formatTeacherName(teacher.name);
    await page.fill('input[name="query"]', cleanName);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
      page.click('button[type="submit"]')
    ]);

    const noOpinionsAvailable = await page.$(
      'img[src="https://www.nuevosemestre.com/images/confused.svg"]'
    );
    if (noOpinionsAvailable) {
      notAvailable.push(teacher);
      continue;
    }

    // Espera que la página se cargue y revisa el número de opiniones.
    const opinionText = await page.textContent('a[href*="profesor/"][class*="bg-sky-700"]'); // Selector específico del enlace de opiniones.
    const numOpiniones = parseInt(opinionText.match(/\d+/)[0]); // Extrae el número de opiniones.

    if (numOpiniones > 0) {
      await page.click('a[href*="profesor/"][class*="bg-sky-700"]'); // Hace clic en el enlace si hay más de 0 opiniones.
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }); // Espera hasta que la red esté casi inactiva.

      // Extract all comments from the current page
      const comments = await extractComments(page);
      teacherData.comments.push(...comments);

      // Handle pagination
      const totalPages = await page.$$eval(
        'button[type="button"][wire\\:click*="gotoPage"]',
        buttons => buttons.length
      );
      for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
        await page.click(`button[wire\\:click="gotoPage(${pageNumber}, 'page')"]`);
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });
        const comments = await extractComments(page);
        teacherData.comments.push(...comments);
      }
    }

    allComments.push(teacherData);
    await page.goto('https://www.nuevosemestre.com/');
  }

  // Guarda todos los comentarios en un archivo JSON.
  await saveData(allComments, notAvailable);
  await browser.close(); // Cierra el navegador al finalizar todas las operaciones.
  console.timeEnd('ProcessingTime'); // Termina la medición del tiempo de proceso.
};

async function saveData(comments, notAvailable) {
  console.log('Saving data...');
  await fs.writeFile('comments-uasd-teachers.json', JSON.stringify(comments, null, 2));
  await fs.writeFile('not-available-teachers.json', JSON.stringify(notAvailable, null, 2));
}

function pauseProcessing() {
  return new Promise(resolve => setTimeout(resolve, 60000)); // 10-second pause
}

async function safeNavigation(page, selector) {
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
      page.click(selector)
    ]);
    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    return false;
  }
}

processTeacherData().catch(console.error); // Inicia el proceso de procesamiento de datos de profesores.

const formatTeacherName = name => {
  let words = name.trim().split(/\s+/);
  if (words.length >= 4) {
    words.splice(1, 1); // Remove the second word if more than four words.
  }
  return words.join(' ');
};

const extractComments = async page => {
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
