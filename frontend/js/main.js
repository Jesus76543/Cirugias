// URL de tu API en Render (usa ruta relativa para que funcione siempre)
const API_URL = '/api/cirugias';

// Función principal para cargar los datos
async function cargarCirugias() {
    try {
        const res = await fetch(API_URL);
        const datos = await res.json();

        // Evita el error si el servidor manda algo que no es una lista
        if (!Array.isArray(datos)) {
            console.error("Error: Los datos no son un arreglo", datos);
            return;
        }

        renderizarTabla(datos);
    } catch (error) {
        console.error("Error al obtener cirugías:", error);
    }
}

// Función para mostrar los datos en la tabla
function renderizarTabla(cirugias) {
    const tabla = document.getElementById('cuerpo-tabla'); // Asegúrate de que este ID exista en tu <tbody>
    tabla.innerHTML = '';

    cirugias.forEach(cirugia => {
        // 1. Fila de la Cirugía
        const filaCirugia = `
            <tr>
                <td><strong>${cirugia.hora}</strong></td>
                <td>${cirugia.paciente}</td>
                <td>${cirugia.procedimiento}</td>
                <td>${cirugia.doctor}</td>
                <td>${cirugia.quirofano}</td>
                <td><span class="badge-${cirugia.estado.toLowerCase()}">${cirugia.estado}</span></td>
            </tr>
        `;
        
        // 2. Cálculo de tiempo de limpieza (+15 min)
        const horaTermino = calcularHoraLimpieza(cirugia.hora);

        const filaLimpieza = `
            <tr class="fila-limpieza">
                <td><small>${cirugia.hora} - ${horaTermino}</small></td>
                <td colspan="5">
                    <span class="badge-limpieza">🧹 BLOQUE DE LIMPIEZA</span>
                    <span class="text-limpieza"> — Quirófano ${cirugia.quirofano} no disponible para agendar</span>
                </td>
            </tr>
        `;

        tabla.innerHTML += filaCirugia + filaLimpieza;
    });
}

// Función auxiliar para sumar 15 minutos a la hora
function calcularHoraLimpieza(horaStr) {
    if (!horaStr) return "N/A";
    
    // Asumimos formato HH:mm
    let [horas, minutos] = horaStr.split(':').map(Number);
    minutos += 15;

    if (minutos >= 60) {
        minutos -= 60;
        horas += 1;
    }

    // Formatear de nuevo a HH:mm
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', cargarCirugias);