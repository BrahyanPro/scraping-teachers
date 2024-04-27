import list_nuevo_semestre from './full_name_from_nuevosemestre.json' assert { type: 'json' };
import list_name_my_bd from './maestros-uasd.json' assert { type: 'json' };
import fs from 'fs/promises';

console.log('Inicio de la comparación de nombres...');
console.time('Tiempo de ejecución');
// Arrays para almacenar los resultados
const matched = [];
const unmatched = [];
const processedIds = new Set(); // Conjunto para almacenar los IDs de los elementos procesados

// Función para normalizar los nombres y mejorar la comparación
function normalize(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b[A-Z]\b/g, '') // Elimina iniciales sueltas
    .replace(/\s+/g, ' ') // Reduce múltiples espacios a uno solo
    .trim() // Elimina espacios en los extremos
    .toLowerCase() // Convierte a minúsculas para uniformidad
    .split(' ') // Divide el nombre en palabras
    .sort(); // Ordena las palabras para comparación consistent
}

// Función para determinar si todos los elementos de 'subset' están en 'set'
function isSubset(subset, set) {
  return subset.every(element => set.includes(element));
}

// Comparar y clasificar los nombres
list_nuevo_semestre.forEach(fn => {
  const fnWords = normalize(fn.name);
  const match = list_name_my_bd.find(dn => {
    const dnWords = normalize(dn.name);
    return (isSubset(fnWords, dnWords) || isSubset(dnWords, fnWords)) && !processedIds.has(dn.id);
  });

  if (match) {
    matched.push({ ...match, fullName: fn.name });
    processedIds.add(match.id); // Marca este ID como procesado
  } else {
    unmatched.push(fn);
  }
});

// Guardar los resultados en archivos
await fs.writeFile('matched.json', JSON.stringify(matched, null, 2));
await fs.writeFile('unmatched.json', JSON.stringify(unmatched, null, 2));

console.timeEnd('Tiempo de ejecución');
