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
    document.querySelectorAll('.evento-card, .limpieza-card').forEach(e => e.remove());

    // Mostramos terminadas y pendientes, pero NO canceladas
    datos.filter(c => c.fecha_programada.split('T')[0] === fechaSel && c.estado !== 'cancelada').forEach(c => {
        const [h, m] = c.hora_inicio.split(':');
        const cell = document.getElementById(`q${c.quirofano_id}-${h}${parseInt(m) < 30 ? '00' : '30'}`);
        
        if (cell) {
            const [durH, durM] = c.duracion_estimada.split(':');
            const totalMinutos = (parseInt(durH) * 60) + parseInt(durM);
            const altoPx = (totalMinutos / 30) * 48; 

            const card = document.createElement('div');
            card.className = 'evento-card';
            
            // COLOR SEGÚN ESTADO
            if (c.estado === 'terminada') {
                card.style.backgroundColor = '#ecf0f1'; // Gris muy claro
                card.style.borderLeft = '5px solid #bdc3c7'; // Borde gris
                card.style.color = '#7f8c8d';
                card.style.opacity = '0.8';
            } else {
                const hue = (c.id * 137.5) % 360; 
                card.style.backgroundColor = `hsl(${hue}, 75%, 88%)`;
                card.style.borderLeft = `5px solid hsl(${hue}, 70%, 45%)`;
            }

            card.style.height = `${altoPx - 4}px`;
            card.innerHTML = `<strong>${c.tipo_procedimiento}</strong><span>Dr. ${c.doctor_nombre}</span>${c.estado === 'terminada' ? '<br><small>[TERMINADA]</small>' : ''}`;
            card.onclick = () => gestionarCirugia(c);
            cell.appendChild(card);

            // LOGICA DE LIMPIEZA
            const limpieza = document.createElement('div');
            limpieza.className = 'limpieza-card';
            limpieza.style.top = `${altoPx}px`; 
            limpieza.style.height = `24px`; 
            limpieza.innerHTML = `🧹 Limpieza`;
            cell.appendChild(limpieza);
        }
    });
}

async function gestionarCirugia(c) {
    const { value: accion } = await Swal.fire({
        title: 'Gestión de Cirugía',
        html: `<b>Paciente:</b> ${c.paciente_nombre}<br><b>Estado actual:</b> ${c.estado}`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '✅ Terminar',
        denyButtonText: '❌ Cancelar',
        cancelButtonText: '✏️ Editar',
        confirmButtonColor: '#27ae60',
        denyButtonColor: '#e74c3c'
    });

    if (accion === true) {
        // CONFIRMACIÓN PARA TERMINAR
        const confirm = await Swal.fire({
            title: '¿Confirmar término?',
            text: "Se mostrará en gris en la agenda.",
            icon: 'question',
            showCancelButton: true
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'terminada');
    } else if (accion === false) {
        // CONFIRMACIÓN PARA CANCELAR
        const confirm = await Swal.fire({
            title: '¿Eliminar cirugía?',
            text: "Esta acción quitará el registro del gráfico.",
            icon: 'warning',
            showCancelButton: true
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'cancelada');
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