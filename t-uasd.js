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
// Uso del método
const filePath = './analice.xlsx';
const teachers = readExcelFile(filePath);
console.log(teachers);
console.log(teachers.length);
