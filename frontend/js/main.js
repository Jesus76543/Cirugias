document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    const filtroFecha = document.getElementById('filtroFecha');
    const inputFecha = document.getElementById('fecha');
    
    if(filtroFecha) filtroFecha.value = hoy;
    if(inputFecha) inputFecha.value = hoy;
    
    generarCuadricula24h();
    cargarCirugias();
});

// Genera la estructura visual de horas y salas (Q4 a Q1)
function generarCuadricula24h() {
    const agenda = document.getElementById('agenda');
    if (!agenda) return;
    
    agenda.innerHTML = `
        <div class="header-cell">HORA</div>
        <div class="header-cell">Q4</div>
        <div class="header-cell">Q3</div>
        <div class="header-cell">Q2</div>
        <div class="header-cell">Q1</div>
    `;

    for (let h = 0; h <= 23; h++) {
        ["00", "30"].forEach(m => {
            const hStr = h.toString().padStart(2, '0');
            const timeDiv = document.createElement('div');
            timeDiv.className = 'time-cell';
            timeDiv.innerText = `${hStr}:${m}`;
            agenda.appendChild(timeDiv);

            for (let q = 4; q >= 1; q--) {
                const cell = document.createElement('div');
                cell.className = 'slot-cell';
                cell.id = `q${q}-${hStr}${m}`;
                agenda.appendChild(cell);
            }
        });
    }
}

// Carga las cirugías desde la API y las dibuja en el grid
async function cargarCirugias() {
    const fechaSel = document.getElementById('filtroFecha').value;
    try {
        const res = await fetch('/api/cirugias');
        const datos = await res.json();
        
        // Limpiar tarjetas anteriores
        document.querySelectorAll('.evento-card, .limpieza-card').forEach(e => e.remove());

        if (!Array.isArray(datos)) return;

        datos.filter(c => c.fecha_programada.split('T')[0] === fechaSel).forEach(c => {
            const [h, m] = c.hora_inicio.split(':');
            const cellId = `q${c.quirofano_id}-${h}${parseInt(m) < 30 ? '00' : '30'}`;
            const cell = document.getElementById(cellId);
            
            if (cell) {
                // 1. Calcular tamaño de la tarjeta de CIRUGÍA
                const [durH, durM] = c.duracion_estimada.split(':');
                const totalMinutos = (parseInt(durH) * 60) + parseInt(durM);
                const altoPx = (totalMinutos / 30) * 48; // 48px es la altura estándar de una celda de 30min

                const card = document.createElement('div');
                card.className = 'evento-card';
                const hue = (c.id * 137.5) % 360; 
                card.style.backgroundColor = `hsl(${hue}, 75%, 88%)`;
                card.style.borderLeft = `5px solid hsl(${hue}, 70%, 45%)`;
                card.style.height = `${altoPx - 4}px`;
                card.innerHTML = `<strong>${c.tipo_procedimiento}</strong><span>Dr. ${c.doctor_nombre}</span>`;
                card.onclick = () => gestionarCirugia(c);
                cell.appendChild(card);

                // 2. AGREGAR BLOQUE DE LIMPIEZA (15 min)
                const limpieza = document.createElement('div');
                limpieza.className = 'limpieza-card';
                limpieza.style.top = `${altoPx}px`; // Se coloca justo al final de la cirugía
                limpieza.style.height = `22px`;   // Aproximadamente la mitad de una celda de 30min
                limpieza.innerHTML = `🧹 Limpieza`;
                cell.appendChild(limpieza);
            }
        });
    } catch (error) {
        console.error("Error al cargar cirugías:", error);
    }
}

// Ventana de gestión (Terminar, Cancelar, Editar)
async function gestionarCirugia(c) {
    const { value: accion } = await Swal.fire({
        title: 'Gestión de Cirugía',
        html: `<b>Paciente:</b> ${c.paciente_nombre}<br><b>Notas:</b> ${c.notas || 'Sin notas'}`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '✅ Terminar',
        denyButtonText: '❌ Cancelar',
        cancelButtonText: '✏️ Editar',
        confirmButtonColor: '#28a745',
        denyButtonColor: '#dc3545',
        cancelButtonColor: '#f39c12'
    });

    if (accion === true) actualizarEstatus(c.id, 'terminada');
    else if (accion === false) actualizarEstatus(c.id, 'cancelada');
    else if (accion === undefined && Swal.getCancelButton().innerText.includes('Editar')) abrirModalEdicion(c);
}

// Envío de nueva cirugía al servidor
async function enviar() {
    const data = {
        paciente_nombre: document.getElementById('paciente').value,
        doctor_nombre: document.getElementById('doctor').value,
        quirofano_id: document.getElementById('quirofano').value,
        procedimiento: document.getElementById('proc').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        duracion: document.getElementById('dur').value,
        notas: document.getElementById('notas').value
    };

    if(!data.doctor_nombre || !data.fecha || !data.hora) {
        return Swal.fire('Error', 'Médico, Fecha y Hora son obligatorios', 'error');
    }

    const res = await fetch('/api/cirugias', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.ok) {
        Swal.fire('Éxito', 'Cirugía agendada', 'success').then(() => cargarCirugias());
    }
}

async function actualizarEstatus(id, estatus) {
    await fetch('/api/update-status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, estatus })
    });
    cargarCirugias();
}