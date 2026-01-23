document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    const filtroFecha = document.getElementById('filtroFecha');
    const inputFecha = document.getElementById('fecha');
    
    if(filtroFecha) filtroFecha.value = hoy;
    if(inputFecha) inputFecha.value = hoy;
    
    generarCuadricula24h();
    cargarCirugias();
});

// 1. Generar la cuadrícula visual de 24 horas
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

// 2. Cargar datos y dibujar bloques (Cirugía + Limpieza + Notas)
async function cargarCirugias() {
    const fechaSel = document.getElementById('filtroFecha').value;
    try {
        const res = await fetch('/api/cirugias');
        const datos = await res.json();
        
        // Limpiar elementos anteriores
        document.querySelectorAll('.evento-card, .limpieza-card').forEach(e => e.remove());

        if (!Array.isArray(datos)) return;

        // Filtrar por fecha y excluir canceladas
        datos.filter(c => c.fecha_programada.split('T')[0] === fechaSel && c.estado !== 'cancelada').forEach(c => {
            const [h, m] = c.hora_inicio.split(':');
            const cellId = `q${c.quirofano_id}-${h}${parseInt(m) < 30 ? '00' : '30'}`;
            const cell = document.getElementById(cellId);
            
            if (cell) {
                const [durH, durM] = c.duracion_estimada.split(':');
                const totalMinutos = (parseInt(durH) * 60) + parseInt(durM);
                const altoPx = (totalMinutos / 30) * 48; 

                // Crear Tarjeta de Cirugía
                const card = document.createElement('div');
                card.className = 'evento-card';
                
                // Estilo según estado (Gris si está terminada)
                if (c.estado === 'terminada') {
                    card.style.backgroundColor = '#ecf0f1';
                    card.style.borderLeft = '5px solid #95a5a6';
                    card.style.color = '#7f8c8d';
                    card.style.opacity = '0.7';
                } else {
                    const hue = (c.id * 137.5) % 360; 
                    card.style.backgroundColor = `hsl(${hue}, 75%, 88%)`;
                    card.style.borderLeft = `5px solid hsl(${hue}, 70%, 45%)`;
                }

                card.style.height = `${altoPx - 4}px`;
                
                // Contenido de la tarjeta incluyendo NOTAS
                card.innerHTML = `
                    <div style="font-weight: bold; font-size: 0.8rem; line-height: 1.1;">${c.tipo_procedimiento}</div>
                    <div style="font-size: 0.7rem; margin-bottom: 2px;">Dr. ${c.doctor_nombre}</div>
                    ${c.notas ? `<div style="font-size: 0.65rem; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 2px; font-style: italic; color: #444;">📌 ${c.notas}</div>` : ''}
                `;
                
                card.onclick = () => gestionarCirugia(c);
                cell.appendChild(card);

                // Bloque de limpieza
                const limpieza = document.createElement('div');
                limpieza.className = 'limpieza-card';
                limpieza.style.top = `${altoPx}px`; 
                limpieza.style.height = `22px`;   
                limpieza.innerHTML = `🧹 Limpieza`;
                cell.appendChild(limpieza);
            }
        });
    } catch (error) {
        console.error("Error al cargar:", error);
    }
}

// 3. Gestión de Cirugía (Finalizar, Cancelar o Editar)
async function gestionarCirugia(c) {
    const { value: accion, dismiss } = await Swal.fire({
        title: 'Gestión de Cirugía',
        html: `<b>Paciente:</b> ${c.paciente_nombre}<br><b>Procedimiento:</b> ${c.tipo_procedimiento}`,
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
            text: "Se mostrará en gris en la agenda.",
            icon: 'question',
            showCancelButton: true
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'terminada');
    } else if (accion === false) {
        const confirm = await Swal.fire({
            title: '¿Confirmas la cancelación?',
            text: "Se eliminará permanentemente del gráfico.",
            icon: 'warning',
            showCancelButton: true
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'cancelada');
    } else if (dismiss === Swal.DismissReason.cancel) {
        // Retraso para evitar que el modal de edición se cierre automáticamente
        setTimeout(() => {
            abrirModalEdicion(c);
        }, 150);
    }
}

// 4. Modal de Edición
async function abrirModalEdicion(c) {
    const { value: formValues } = await Swal.fire({
        title: 'Editar Información',
        html:
            `<div style="text-align: left; font-size: 0.9rem;">Paciente:</div>` +
            `<input id="swal-paciente" class="swal2-input" placeholder="Paciente" value="${c.paciente_nombre || ''}">` +
            `<div style="text-align: left; font-size: 0.9rem;">Médico:</div>` +
            `<input id="swal-doctor" class="swal2-input" placeholder="Médico" value="${c.doctor_nombre || ''}">` +
            `<div style="text-align: left; font-size: 0.9rem;">Procedimiento:</div>` +
            `<input id="swal-proc" class="swal2-input" placeholder="Procedimiento" value="${c.tipo_procedimiento || ''}">` +
            `<div style="text-align: left; font-size: 0.9rem;">Notas / Indicaciones:</div>` +
            `<textarea id="swal-notas" class="swal2-textarea" placeholder="Notas e indicaciones">${c.notas || ''}</textarea>`,
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
        try {
            const res = await fetch(`/api/cirugias/${c.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formValues)
            });
            if (res.ok) {
                Swal.fire('Éxito', 'Información actualizada', 'success').then(() => cargarCirugias());
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar', 'error');
        }
    }
}

// 5. Enviar Nueva Cirugía
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
        Swal.fire('Éxito', 'Cirugía agendada', 'success').then(() => {
            // Limpiar formulario manual si es necesario
            cargarCirugias();
        });
    } else {
        const err = await res.json();
        Swal.fire('Error', err.error, 'error');
    }
}

// 6. Auxiliar para estatus
async function actualizarEstatus(id, estatus) {
    await fetch('/api/update-status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, estatus })
    });
    cargarCirugias();
}