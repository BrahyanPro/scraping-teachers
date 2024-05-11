import allTeachers from './teachers.json' assert { type: 'json' };
import allSubjects from './subjects.json' assert { type: 'json' };
import { chromium } from 'playwright';
import fs from 'fs/promises';

console.log('Inicio de la comparación de nombres...');
console.time('Tiempo de ejecución');

const POINTS_BY_SAME_SPOT = 2;
const POINTS_BY_OCCURRENCE = 1;
const cleanName = name => {
  return name.replace(/\s+/g, ' ').trim(); // Simplifica espacios y remueve espacios extras
};

const getInitials = name => {
  return name.split(' ').map(word => word[0]);
};

const nsemestreNames = listNuevoSemestre.map(item => cleanName(item.name));
const oursNames = listOurNames.map(item => ({ ...item, cleanedName: cleanName(item.name) }));

const compareInitials = (ourName, semestreName) => {
  const initialsOurName = getInitials(ourName);
  const initialsSemestreName = getInitials(semestreName);
  let points = 0;

  initialsOurName.forEach((initial, i) => {
    const index = initialsSemestreName.indexOf(initial);
    if (index !== -1) {
      points += index === i ? POINTS_BY_SAME_SPOT : POINTS_BY_OCCURRENCE;
    }
  });

  return points;
};

const compareNames = (name1, name2) => {
  const name1Words = cleanName(name1).toLowerCase().split(' ');
  const name2Words = cleanName(name2).toLowerCase().split(' ');

  const commonWords = name1Words.filter(word => name2Words.includes(word)).length;
  const totalWords = new Set([...name1Words, ...name2Words]).size;
  return commonWords / totalWords; // Jaccard index for word similarity
};

const matches = [];
const unmatched = [];
const prevMatches = new Set();

oursNames.forEach(ourObj => {
  let highestScore = 0;
  let bestMatch = null;

  listNuevoSemestre.forEach(semestreObj => {
    const similarityScore = compareNames(ourObj.name, semestreObj.name);

    // Utilize a more stringent threshold to prevent incorrect matches
    if (similarityScore > highestScore && similarityScore > 0.5) {
      highestScore = similarityScore;
      bestMatch = { ...ourObj, matchedName: semestreObj.name };
    }
  });

  if (bestMatch) {
    matches.push(bestMatch);
    prevMatches.add(bestMatch.semestre);
  } else {
    unmatched.push(ourObj);
  }
});

fs.writeFile('./matcheds.json', JSON.stringify(matches, null, 2), err => {
  if (err) console.error('Error writing file:', err);
});

fs.writeFile('./unmatched.json', JSON.stringify(unmatched, null, 2), err => {
  if (err) console.error('Error writing file:', err);
});

console.log(`Matches: ${matches.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.timeEnd('Tiempo de ejecución');

const proccesinExtract = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const goToProcessing = async code => {
    //Change code from LET-0120 to LET0120
    const codeWithoutDash = code.replace('-', '');
    const url = `https://www.nuevosemestre.com/programacion-docente/${codeWithoutDash}`;
    await page.goto(url);
  };

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
