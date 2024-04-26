//const playwright = require('playwright');
import { chromium } from 'playwright';
//const fs = require('fs').promises;
import fs from 'fs/promises';
//const path = require('path');
import path from 'path';
//Import archivo json de maestros
import teacherData from './maestros-uasd.json' assert { type: 'json' };

//const folderPath = path.join(__dirname, 'carreras');
//fs.mkdir(folderPath, { recursive: true }).catch(console.error);

//async function extractCareerLinks() {
//  // init count time
//  console.time('time');
//  const browser = await playwright.chromium.launch();
//  const page = await browser.newPage();
//  await page.goto('https://soft.uasd.edu.do/planesgrado/');

//  const faculties = await page.evaluate(() => {
//    const div = document.querySelector('.tree#tvCarreras');
//    const tables = div.querySelectorAll(':scope > table');
//    const getSchoolsName = schools => {
//      const schoolData = [];
//      const tables = schools.querySelectorAll(':scope > table');
//      tables.forEach((table, index) => {
//        const schoolName = table.querySelector('.tvCarreras_0').innerText;
//        const nextSibling = table.nextElementSibling;
//        const careers = Array.from(
//          nextSibling.querySelectorAll('.tvCarreras_0[target="_blank"]')
//        ).map(link => ({ title: link.innerText, url: link.href }));
//        const data = {
//          name: schoolName,
//          careers
//        };
//        schoolData.push(data);
//      });
//      return schoolData;
//    };
//    const data = [];
//    tables.forEach((table, index) => {
//      const facultyName = table.querySelector('.tvCarreras_0').innerText;
//      const schools = getSchoolsName(table.nextElementSibling);
//      const faculty = {
//        faculty: facultyName,
//        data: schools
//      };
//      data.push(faculty);
//    });
//    return data;
//  });
//  for (const career of faculties) {
//    // console.log color green
//    console.log('\x1b[32m%s\x1b[0m', `Guardando datos de la facultad ${career.faculty}`);
//    const faculty = career.faculty;
//    // Create a folder for the faculty
//    const facultyFolder = path.join(folderPath, career.faculty);
//    await fs.mkdir(facultyFolder, { recursive: true }).catch(console.error);

//    for (const school of career.data) {
//      console.log(`Guardando datos de ${school.name}`);
//      for (const carrera of school.careers) {
//        const data2 = {
//          facultad: faculty,
//          escuela: school.name
//        };
//        // console.log color yellow
//        console.log(
//          '\x1b[33m%s\x1b[0m',
//          `Guardando datos de la escuela ${data2.escuela}  ${data2.facultad}`
//        );
//        const { data, name } = await savePensumData(browser, carrera, data2);

//        const filePath = path.join(facultyFolder, `${name}.json`);
//        await fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch(console.error);
//        // console.log color blue
//        console.log('\x1b[34m%s\x1b[0m', `Guardando datos de la carrera ${carrera.title}`);
//      }
//    }
//  }
//  // console.log color purple
//  console.log('\x1b[35m%s\x1b[0m', 'Todos los datos del pemsun han sido guardados.');
//  await browser.close();
//  console.timeEnd('time');
//}

//const savePensumData = async (browser, carrera, data2) => {
//  const page = await browser.newPage();
//  await page.goto(carrera.url, { waitUntil: 'networkidle' });

//  const data = await page.evaluate(() => {
//    const rows = Array.from(document.querySelectorAll('#datosPrincipales tr'));
//    let semester = '';
//    const tableData = [];
//    for (const row of rows) {
//      if (row.cells.length === 1) {
//        semester = row.innerText.trim();
//      } else if (row.cells.length > 1) {
//        const [clave, asignatura, ht, hp, cr, prerequisitos, equivalencias] = Array.from(
//          row.cells,
//          cell => cell.innerText.trim()
//        );
//        if (!clave) continue;
//        tableData.push({
//          semester,
//          clave,
//          asignatura,
//          horas_teoricas: ht,
//          horas_practicas: hp,
//          creditos: cr,
//          prerequisitos,
//          equivalencias
//        });
//      }
//    }
//    return tableData;
//  });
//  const dataReady = data.map(item => ({ ...item, ...data2 }));
//  // Formatear el título de la carrera para el nombre del archivo
//  const title = carrera.title.replace(/[-/]/g, '_').toLowerCase();
//  return { data: dataReady, name: title };
//};

//extractCareerLinks().catch(console.error);
// TODO Hacerlo mas optimo rendimiento actual por debajo de la media

const processTeacherData = async () => {
  const browser = await chromium.launch({ headless: true }); // Lanza el navegador en modo headless.
  const page = await browser.newPage(); // Abre una nueva página.
  await page.goto('https://www.nuevosemestre.com/'); // Va a la página solo una vez.

  console.time('ProcessingTime'); // Inicia el temporizador para el proceso completo.

  for (const [idx, teacher] of teacherData.entries()) {
    console.log(`Processing index: ${idx}`);
    if (idx >= 2 && idx !== 1378) continue; // Limita el bucle a los primeros cuatro profesores.
    const words = teacher.name.trim().split(/\s+/);
    if (words.length >= 4) {
      words.splice(1, 1); // Elimina la segunda palabra si hay más de cuatro palabras.
    }
    const cleanName = words.join(' ');
    await page.fill('input[name="query"]', cleanName); // Rellena el campo de búsqueda con el nombre limpio.

    // Realiza un clic en el botón de búsqueda y espera la navegación.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }), // Espera hasta que la red esté casi inactiva.
      page.click('button[type="submit"]') // Realiza el clic en el botón de tipo submit.
    ]);

    const noResult = await validationNoResult(page); // Valida si no hay resultados.

    if (noResult) {
      await page.fill('input[name="query"]', teacher.name.replace(/\s+/g, ' ')); // Rellena el campo de búsqueda con el nombre limpio.
      // Realiza un clic en el botón de búsqueda y espera la navegación.
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }), // Espera hasta que la red esté casi inactiva.
        page.click('button[type="submit"]') // Realiza el clic en el botón de tipo submit.
      ]);
      const noResult = await validationNoResult(page); // Valida si no hay resultados.
    }

    // Espera que la página se cargue y revisa el número de opiniones.
    const opinionText = await page.textContent('a[href*="profesor/"][class*="bg-sky-700"]'); // Selector específico del enlace de opiniones.
    const numOpiniones = parseInt(opinionText.match(/\d+/)[0]); // Extrae el número de opiniones.

    if (numOpiniones > 0) {
      await page.click('a[href*="profesor/"][class*="bg-sky-700"]'); // Hace clic en el enlace si hay más de 0 opiniones.
      await page.waitForNavigation({ waitUntil: 'networkidle' }); // Espera hasta que la red esté casi inactiva.
      //Screen shot
      await page.screenshot({ path: `./screenshots/${cleanName}.png` });

      // Obtiene el número de páginas en la paginación
      const totalPages = await page.$$eval(
        'button[type="button"][wire\\:click*="gotoPage"]',
        buttons => buttons.length
      );
      console.log(`Total pages: ${totalPages}`);
    }

    // Regresa a la página de inicio para la próxima búsqueda.
    await page.goto('https://www.nuevosemestre.com/'); // Vuelve a cargar la página inicial.
  }

  await browser.close(); // Cierra el navegador al finalizar todas las operaciones.
  console.timeEnd('ProcessingTime'); // Termina la medición del tiempo de proceso.
};

processTeacherData().catch(console.error); // Inicia el proceso de procesamiento de datos de profesores.

const validationNoResult = async page => {
  const noResult = await page.textContent(
    'p[class="text-lg dark:text-neutral-400 text-neutral-600 mb-2"]'
  );
  return noResult === 'Hmmmm, ¿Qué habrá ocurrido?';
};
