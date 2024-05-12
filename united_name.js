import listNuevoSemestre from './full_name_from_nuevosemestre.json' assert { type: 'json' };
import listOurNames from './not-available-teachers.json' assert { type: 'json' };
import fs from 'fs/promises';

console.log('Inicio de la comparación de nombres...');
console.time('Tiempo de ejecución');

const cleanName = name => {
  return name.replace(/\s+/g, ' ').trim(); // Simplifica espacios y remueve espacios extras
};
const oursNames = listOurNames.map(item => ({ ...item, cleanedName: cleanName(item.name) }));

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
