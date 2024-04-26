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

  // Mapear los datos a un array de objetos, suponiendo que las columnas son id, nombre, asignatura y email en ese orden
  const teachers = jsonData.map(row => ({
    id: row[0],
    gender: row[1],
    name: row[2],
    role: row[4],
    sueldo_bruto: row[7],
    sueldo_total: row[9],
    descuento: row[14],
    sueldo_total_neto: row[15]
  }));

  return teachers;
}
// Uso del método
const filePath = './analice.xlsx';
const teachers = readExcelFile(filePath);
console.log(teachers);
console.log(teachers.length);
