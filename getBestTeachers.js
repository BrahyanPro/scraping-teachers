// Todo: replace require for imports
import licenciaturaCienciasPoliticas from './carrera_politica.json' assert { type: 'json' };
import conexionMaestroMateria from './dataScraping/conexion-maestro-materia.json' assert { type: 'json' };
import commentsTeachersV1 from './comments-uasd-teachers.json' assert { type: 'json' };
import commentsTeachersV2 from './comments-uasd-teachers-v2.json' assert { type: 'json' };

// Combinar comentarios de ambos archivos en un diccionario
const commentsByTeacher = {};

// Procesar comentarios del primer archivo
commentsTeachersV1.forEach((teacher, idx) => {
  if( idx === 2) console.log(teacher);
    const name = teacher.name.trim();
    commentsByTeacher[name] = teacher.comments;
});

// Procesar comentarios del segundo archivo
commentsTeachersV2.forEach(teacher => {
    const name = teacher.name.trim();
    if (!commentsByTeacher[name]) {
        commentsByTeacher[name] = [];
    }
    commentsByTeacher[name] = commentsByTeacher[name].concat(teacher.comments);
});

// Estructura final para almacenar el resultado
const finalJson = [];

// Iterar sobre las materias de la licenciatura
licenciaturaCienciasPoliticas.forEach((subject, idx) => {
    //if (idx === 2) console.log(subject, 'Subject');

    const subjectCode = subject.clave;
    const subjectName = subject.asignatura;
    const instructors = [];

    // Buscar instructores en el JSON de conexión maestro-materia
    conexionMaestroMateria.forEach((conexion, idx) => {
        //if (idx === 2) console.log(conexion, 'Conexion');

        if (conexion.code === subjectCode) {
            // Eliminar duplicados de instructores
            const uniqueInstructors = {};
            conexion.instructors.forEach(inst => {
                uniqueInstructors[inst.id] = inst;
            });

            Object.values(uniqueInstructors).forEach(instructor => {
                const instructorName = instructor.cleanedName.trim();
                const instructorComments = commentsByTeacher[instructorName] || [];

                instructors.push({
                    id: instructor.id,
                    name: instructorName,
                    role: instructor.role,
                    status: instructor.status,
                    comments: instructorComments
                });
            });
        }
    });

    // Agregar la materia y sus instructores a la estructura final
    finalJson.push({
        subject_code: subjectCode,
        subject_name: subjectName,
        instructors: instructors
    });
});

// Imprimir o exportar el JSON final
console.log(JSON.stringify(finalJson, null, 2));
