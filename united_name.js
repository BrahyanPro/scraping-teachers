import list_nuevo_semestre from './full_name_from_nuevosemestre.json' assert { type: 'json' };
import list_name_my_bd from './not-available-teachers.json' assert { type: 'json' };
import fs from 'fs/promises';

console.log('Inicio de la comparación de nombres...');
console.time('Tiempo de ejecución');

// Arrays para almacenar los resultados
const matched = [];
const unmatched = [];
const processedIds = new Set();

// Función para eliminar diacríticos y normalizar los nombres
function normalize(name) {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/gi, '')
      //.replace(/\b[A-Z]\b/g, '') // Elimina iniciales sueltas
      .replace(/\s+/gi, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .sort()
  );
}

// Función para calcular la similitud de Jaccard entre dos conjuntos de palabras
function jaccardIndex(set1, set2) {
  const intersection = set1.filter(x => set2.includes(x)).length;
  const union = new Set([...set1, ...set2]).size;
  return intersection / union;
}
function initialsMatch(set1, set2) {
  const initials1 = set1.map(word => word[0]);
  const initials2 = set2.map(word => word[0]);
  return initials1.join('') === initials2.join('');
}

const SIMILARITY_THRESHOLD = 0.5;
const INITIALS_MATCH_THRESHOLD = 0.4; // Umbral de similitud donde se considera la coincidencia de iniciales

// Comparar y clasificar los nombres
list_name_my_bd.forEach(fn => {
  const fnWords = normalize(fn.name);
  let bestMatch = null;
  let highestScore = 0;

  list_nuevo_semestre.forEach(dn => {
    const dnWords = normalize(dn.name);
    const similarityScore = jaccardIndex(fnWords, dnWords);

    if (similarityScore > highestScore && !processedIds.has(fn.id)) {
      if (
        similarityScore >= SIMILARITY_THRESHOLD ||
        (similarityScore >= INITIALS_MATCH_THRESHOLD && initialsMatch(fnWords, dnWords))
      ) {
        highestScore = similarityScore;
        bestMatch = { ...fn, fullName: dn.name };
      }
    }
  });

  if (bestMatch) {
    matched.push(bestMatch);
    processedIds.add(bestMatch.id);
  } else {
    unmatched.push({ name: fn.name, id: fn.id });
  }
});

// Guardar los resultados en archivos
await fs.writeFile('matched.json', JSON.stringify(matched, null, 2));
await fs.writeFile('unmatched.json', JSON.stringify(unmatched, null, 2));

console.timeEnd('Tiempo de ejecución');
