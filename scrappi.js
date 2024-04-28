import fs from 'fs';
import notAvailable from './not-comments-available-teachers-v2.json' assert { type: 'json' };
import comments from './comments-uasd-teachers-v2.json' assert { type: 'json' };
import matcheds from './matcheds.json' assert { type: 'json' };

// Crear sets con los ids de los profesores no disponibles y con comentarios
const notAvailableIds = new Set(notAvailable.map(item => item.id));
const commentIds = new Set(comments.map(item => item.id));

// Filtrar los matcheds para incluir solo aquellos que no están en notAvailable ni en comments
const uniqueMatcheds = matcheds.filter(
  matched => !notAvailableIds.has(matched.id) && !commentIds.has(matched.id)
);

console.log('Unique matcheds:', uniqueMatcheds.length);

console.log('Faltantes :', 397 - uniqueMatcheds.length);

// Opcional: Escribir el resultado en un nuevo archivo si necesitas mantenerlo
fs.writeFile('./unique_matcheds.json', JSON.stringify(uniqueMatcheds, null, 2), err => {
  if (err) {
    console.error('Error writing file:', err);
    return;
  }
  console.log('Unique matched list created successfully!');
});
