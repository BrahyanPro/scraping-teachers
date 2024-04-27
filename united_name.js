import listNuevoSemestre from './full_name_from_nuevosemestre.json' assert { type: 'json' };
import listOurNames from './not-available-teachers.json' assert { type: 'json' };
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

const matches = [];
const unmatched = [];
const prevMatches = new Set();

oursNames.forEach(ourObj => {
  let maxPoints = 0;
  let bestMatch = null;

  nsemestreNames.forEach((semestreName, index) => {
    if (!prevMatches.has(semestreName)) {
      const initialsPoints = compareInitials(ourObj.cleanedName, semestreName);

      if (ourObj.name.toLowerCase() === semestreName.toLowerCase()) {
        bestMatch = { ...ourObj, nameInSemestre: listNuevoSemestre[index].name };
        prevMatches.add(semestreName);
        return;
      }

      if (initialsPoints > maxPoints) {
        maxPoints = initialsPoints;
        bestMatch = { ...ourObj, nameInSemestre: listNuevoSemestre[index].name };
      }
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

// Arrays para almacenar los resultados
//const matched = [];
//const unmatched = [];
//const processedIds = new Set();

//// Función para eliminar diacríticos y normalizar los nombres
//function normalize(name) {
//  return (
//    name
//      .normalize('NFD')
//      .replace(/[\u0300-\u036f]/gi, '')
//      //.replace(/\b[A-Z]\b/g, '') // Elimina iniciales sueltas
//      .replace(/\s+/gi, ' ')
//      .trim()
//      .toLowerCase()
//      .split(' ')
//      .sort()
//  );
//}

//// Función para calcular la similitud de Jaccard entre dos conjuntos de palabras
//function jaccardIndex(set1, set2) {
//  const intersection = set1.filter(x => set2.includes(x)).length;
//  const union = new Set([...set1, ...set2]).size;
//  return intersection / union;
//}
//function initialsMatch(set1, set2) {
//  const initials1 = set1.map(word => word[0]);
//  const initials2 = set2.map(word => word[0]);
//  return initials1.join('') === initials2.join('');
//}

//const SIMILARITY_THRESHOLD = 0.5;
//const INITIALS_MATCH_THRESHOLD = 0.4; // Umbral de similitud donde se considera la coincidencia de iniciales

// Comparar y clasificar los nombres
//list_name_my_bd.forEach(fn => {
//  const fnWords = normalize(fn.name);
//  let bestMatch = null;
//  let highestScore = 0;

//  list_nuevo_semestre.forEach(dn => {
//    const dnWords = normalize(dn.name);
//    const similarityScore = jaccardIndex(fnWords, dnWords);

//    if (similarityScore > highestScore && !processedIds.has(fn.id)) {
//      if (
//        similarityScore >= SIMILARITY_THRESHOLD ||
//        (similarityScore >= INITIALS_MATCH_THRESHOLD && initialsMatch(fnWords, dnWords))
//      ) {
//        highestScore = similarityScore;
//        bestMatch = { ...fn, fullName: dn.name };
//      }
//    }
//  });

//  if (bestMatch) {
//    matched.push(bestMatch);
//    processedIds.add(bestMatch.id);
//  } else {
//    unmatched.push({ name: fn.name, id: fn.id });
//  }
//});

//// Guardar los resultados en archivos
//await fs.writeFile('matched.json', JSON.stringify(matched, null, 2));
//await fs.writeFile('unmatched.json', JSON.stringify(unmatched, null, 2));
