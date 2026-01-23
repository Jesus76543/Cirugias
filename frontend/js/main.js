document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    const filtroFecha = document.getElementById('filtroFecha');
    const inputFecha = document.getElementById('fecha');
    
    if(filtroFecha) filtroFecha.value = hoy;
    if(inputFecha) inputFecha.value = hoy;
    
    generarCuadricula24h();
    cargarCirugias();
});

function generarCuadricula24h() {
    const agenda = document.getElementById('agenda');
    if (!agenda) return;
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
    try {
        const res = await fetch('/api/cirugias');
        const datos = await res.json();
        document.querySelectorAll('.evento-card, .limpieza-card').forEach(e => e.remove());

        // Mostramos pendientes y terminadas, pero NO canceladas
        datos.filter(c => c.fecha_programada.split('T')[0] === fechaSel && c.estado !== 'cancelada').forEach(c => {
            const [h, m] = c.hora_inicio.split(':');
            const cell = document.getElementById(`q${c.quirofano_id}-${h}${parseInt(m) < 30 ? '00' : '30'}`);
            
            if (cell) {
                const [durH, durM] = c.duracion_estimada.split(':');
                const totalMinutos = (parseInt(durH) * 60) + parseInt(durM);
                const altoPx = (totalMinutos / 30) * 48; 

                const card = document.createElement('div');
                card.className = 'evento-card';
                
                // Estilo según estado
                if (c.estado === 'terminada') {
                    card.style.backgroundColor = '#d1d8e0'; // Gris
                    card.style.borderLeft = '5px solid #778ca3';
                    card.style.opacity = '0.7';
                } else {
                    const hue = (c.id * 137.5) % 360; 
                    card.style.backgroundColor = `hsl(${hue}, 75%, 88%)`;
                    card.style.borderLeft = `5px solid hsl(${hue}, 70%, 45%)`;
                }

                card.style.height = `${altoPx - 4}px`;
                card.innerHTML = `<strong>${c.tipo_procedimiento}</strong><span>Dr. ${c.doctor_nombre}</span>`;
                card.onclick = () => gestionarCirugia(c);
                cell.appendChild(card);

                const limpieza = document.createElement('div');
                limpieza.className = 'limpieza-card';
                limpieza.style.top = `${altoPx}px`; 
                limpieza.style.height = `22px`; 
                limpieza.innerHTML = `🧹 Limpieza`;
                cell.appendChild(limpieza);
            }
        });
    } catch (e) { console.error("Error al cargar:", e); }
}

async function gestionarCirugia(c) {
    const { value: accion, dismiss } = await Swal.fire({
        title: 'Gestión de Cirugía',
        html: `<b>Paciente:</b> ${c.paciente_nombre}<br><b>Médico:</b> ${c.doctor_nombre}`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '✅ Terminar',
        denyButtonText: '❌ Cancelar',
        cancelButtonText: '✏️ Editar',
        confirmButtonColor: '#28a745',
        denyButtonColor: '#dc3545',
        cancelButtonColor: '#f39c12'
    });

    if (accion === true) {
        const confirm = await Swal.fire({
            title: '¿Terminar cirugía?',
            text: "Se quedará en el gráfico con color apagado.",
            icon: 'question',
            showCancelButton: true
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'terminada');
    } else if (accion === false) {
        const confirm = await Swal.fire({
            title: '¿Confirmas la cancelación?',
            text: "Esta acción quitará el registro del gráfico.",
            icon: 'warning',
            showCancelButton: true
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'cancelada');
    } else if (dismiss === Swal.DismissReason.cancel) {
        // SOLUCIÓN AL CIERRE DEL MODAL: Retraso mínimo para abrir el siguiente
        setTimeout(() => {
            abrirModalEdicion(c);
        }, 100);
    }
}

async function abrirModalEdicion(c) {
    const { value: formValues } = await Swal.fire({
        title: 'Editar Información',
        html:
            `<input id="swal-paciente" class="swal2-input" placeholder="Paciente" value="${c.paciente_nombre || ''}">` +
            `<input id="swal-doctor" class="swal2-input" placeholder="Médico" value="${c.doctor_nombre || ''}">` +
            `<input id="swal-proc" class="swal2-input" placeholder="Procedimiento" value="${c.tipo_procedimiento || ''}">` +
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
            Swal.fire('Actualizado', 'Datos guardados', 'success');
            cargarCirugias();
        }
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