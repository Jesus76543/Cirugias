document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('filtroFecha').value = hoy;
    document.getElementById('fecha').value = hoy;
    generarCuadricula24h();
    cargarCirugias();
});

function generarCuadricula24h() {
    const agenda = document.getElementById('agenda');
    agenda.innerHTML = `<div class="header-cell">HORA</div><div class="header-cell">Q4</div><div class="header-cell">Q3</div><div class="header-cell">Q2</div><div class="header-cell">Q1</div>`;
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

async function cargarCirugias() {
    const fechaSel = document.getElementById('filtroFecha').value;
    const res = await fetch('/api/cirugias');
    const datos = await res.json();
    document.querySelectorAll('.evento-card').forEach(e => e.remove());

    datos.filter(c => c.fecha_programada.split('T')[0] === fechaSel).forEach(c => {
        const [h, m] = c.hora_inicio.split(':');
        const cell = document.getElementById(`q${c.quirofano_id}-${h}${parseInt(m) < 30 ? '00' : '30'}`);
        
        if (cell) {
            const [durH, durM] = c.duracion_estimada.split(':');
            const totalMinutos = (parseInt(durH) * 60) + parseInt(durM);
            const altoPx = (totalMinutos / 30) * 48; 

            const card = document.createElement('div');
            card.className = 'evento-card';
            const hue = (c.id * 137.5) % 360; 
            card.style.backgroundColor = `hsl(${hue}, 75%, 88%)`;
            card.style.borderLeft = `5px solid hsl(${hue}, 70%, 45%)`;
            card.style.height = `${altoPx - 4}px`;
            card.innerHTML = `<strong>${c.tipo_procedimiento}</strong><span>Dr. ${c.doctor_nombre}</span>`;
            
            card.onclick = () => gestionarCirugia(c);
            cell.appendChild(card);
        }
    });
}

// Ventana de gestión con opción de Editar
async function gestionarCirugia(c) {
    const { value: accion } = await Swal.fire({
        title: 'Gestión de Cirugía',
        html: `<b>Paciente:</b> ${c.paciente_nombre}<br><b>Notas:</b> ${c.notas || 'Sin notas'}`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '✅ Terminar',
        denyButtonText: '❌ Cancelar',
        cancelButtonText: '✏️ Editar Datos',
        confirmButtonColor: '#28a745',
        denyButtonColor: '#dc3545',
        cancelButtonColor: '#f39c12' // Color naranja para editar
    });

    if (accion === true) {
        actualizarEstatus(c.id, 'terminada');
    } else if (accion === false) {
        actualizarEstatus(c.id, 'cancelada');
    } else if (accion === undefined && Swal.getCancelButton().innerText.includes('Editar')) {
        abrirModalEdicion(c);
    }
}

// Nueva función para abrir formulario de edición
async function abrirModalEdicion(c) {
    const { value: formValues } = await Swal.fire({
        title: 'Editar Información',
        html:
            `<input id="swal-paciente" class="swal2-input" placeholder="Paciente" value="${c.paciente_nombre}">` +
            `<input id="swal-doctor" class="swal2-input" placeholder="Médico" value="${c.doctor_nombre}">` +
            `<input id="swal-proc" class="swal2-input" placeholder="Procedimiento" value="${c.tipo_procedimiento}">` +
            `<textarea id="swal-notas" class="swal2-textarea" placeholder="Notas">${c.notas || ''}</textarea>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        preConfirm: () => {
            return {
                paciente_nombre: document.getElementById('swal-paciente').value,
                doctor_nombre: document.getElementById('swal-doctor').value,
                tipo_procedimiento: document.getElementById('swal-proc').value,
                notas: document.getElementById('swal-notas').value
            }
        }
    });

    if (formValues) {
        const res = await fetch(`/api/cirugias/${c.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formValues)
        });
        if (res.ok) {
            Swal.fire('Actualizado', 'Los datos han sido corregidos', 'success').then(() => cargarCirugias());
        }
    }
}

async function actualizarEstatus(id, estatus) {
    const res = await fetch('/api/update-status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, estatus })
    });
    if (res.ok) cargarCirugias();
}

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

    const res = await fetch('/api/cirugias', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.ok) {
        Swal.fire('Éxito', 'Cirugía agendada', 'success').then(() => cargarCirugias());
    } else {
        const err = await res.json();
        Swal.fire('Error', err.error, 'error');
    }
}