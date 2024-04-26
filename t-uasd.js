import XLSX from 'xlsx';
import { writeFile } from 'fs/promises';

function readExcelFile(filePath) {
  // Cargar el archivo
  const workbook = XLSX.readFile(filePath);

  // Obtener la primera hoja del libro
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convertir los datos de la hoja en un array de objetos JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Eliminar la fila de encabezados
  jsonData.shift();
  jsonData.shift();
  jsonData.shift();
  jsonData.shift();

  // Mapear los datos a un array de objetos, suponiendo que las columnas son id, nombre, asignatura y email en ese orden
  const teachers = jsonData.map(row => ({
    id: row[0],
    gender: row[1],
    name: row[2],
    area: row[3],
    role: row[4],
    status: row[5],
    fecha_ingreso: row[6],
    sueldo_bruto: row[7],
    otros_ingresos: row[8],
    total_ingresos: row[9],
    isr: row[10],
    afp: row[11],
    sfs: row[12],
    otros_descuentos: row[13],
    descuento_total: row[14],
    sueldo_total_neto: row[15]
  }));

  return teachers;
}

async function saveTeachersToJsonFile(filePath, jsonFilePath) {
  const teachers = readExcelFile(filePath);
  try {
    console.info('Guardando datos en el archivo JSON...');
    await writeFile(jsonFilePath, JSON.stringify(teachers, null, 2));
    console.log(`Datos guardados con éxito en ${jsonFilePath}`);
  } catch (error) {
    console.error('Error al guardar el archivo:', error);
  }
}

// Uso del método
const filePath = './analice.xlsx';
const jsonFilePath = 'maestros-uasd.json';
saveTeachersToJsonFile(filePath, jsonFilePath);
