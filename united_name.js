import list_nuevo_semestre from './full_name_from_nuevosemestre.json' assert { type: 'json' };
import list_name_my_bd from './maestros-uasd.json' assert { type: 'json' };
import fs from 'fs/promises';

console.log('Inicio de la comparación de nombres...');
console.time('Tiempo de ejecución');
// Arrays para almacenar los resultados
const matched = [];
const unmatched = [];

// Función para normalizar los nombres y mejorar la comparación
function normalize(name) {
  return name
    .replace(/\b[A-Z]\b/g, '') // Elimina iniciales sueltas
    .replace(/\s+/g, ' ') // Reduce múltiples espacios a uno solo
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
  const match = detailedNames.find(dn => {
    const dnWords = normalize(dn.name);
    return isSubset(fnWords, dnWords) || isSubset(dnWords, fnWords);
  });

  if (match) {
    matched.push({ ...match, fullName: fn.name });
  } else {
    unmatched.push(fn);
  }
});

// Guardar los resultados en archivos
await fs.writeFile('matched.json', JSON.stringify(matched, null, 2));
await fs.writeFile('unmatched.json', JSON.stringify(unmatched, null, 2));

console.timeEnd('Tiempo de ejecución');
