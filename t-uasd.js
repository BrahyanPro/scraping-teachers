const XLSX = require('xlsx');

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
  //const teachers = jsonData.map(row => ({
  //  id: row[0],
  //  name: row[1],
  //  subject: row[2],
  //  email: row[3]
  //}));

  return jsonData;
}
// Uso del método
const filePath = './analice.xlsx';
const teachers = readExcelFile(filePath);
console.log(teachers);
