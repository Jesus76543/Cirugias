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

        // Filtrar cirugías que NO estén canceladas (las terminadas sí se muestran)
        datos.filter(c => c.fecha_programada.split('T')[0] === fechaSel && c.estado !== 'cancelada').forEach(c => {
            const [h, m] = c.hora_inicio.split(':');
            const cell = document.getElementById(`q${c.quirofano_id}-${h}${parseInt(m) < 30 ? '00' : '30'}`);
            
            if (cell) {
                const [durH, durM] = c.duracion_estimada.split(':');
                const totalMinutos = (parseInt(durH) * 60) + parseInt(durM);
                const altoPx = (totalMinutos / 30) * 48; 

                const card = document.createElement('div');
                card.className = 'evento-card';
                
                // Lógica de color según estatus
                if (c.estado === 'terminada') {
                    card.style.backgroundColor = '#d1d8e0'; // Gris apagado
                    card.style.borderLeft = '5px solid #778ca3';
                    card.style.opacity = '0.7';
                    card.style.color = '#4b6584';
                } else {
                    const hue = (c.id * 137.5) % 360; 
                    card.style.backgroundColor = `hsl(${hue}, 75%, 88%)`;
                    card.style.borderLeft = `5px solid hsl(${hue}, 70%, 45%)`;
                }

                card.style.height = `${altoPx - 4}px`;
                card.innerHTML = `<strong>${c.tipo_procedimiento}</strong><span>Dr. ${c.doctor_nombre}</span><br><small>${c.estado.toUpperCase()}</small>`;
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
    } catch (e) { console.error(e); }
}

async function gestionarCirugia(c) {
    const { value: accion } = await Swal.fire({
        title: 'Gestión de Cirugía',
        html: `<b>Paciente:</b> ${c.paciente_nombre}<br><b>Médico:</b> ${c.doctor_nombre}<br><b>Estado:</b> ${c.estado}`,
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
            text: "Se mantendrá en el gráfico con color apagado.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, finalizar'
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'terminada');
    } else if (accion === false) {
        const confirm = await Swal.fire({
            title: '¿Confirmas la cancelación?',
            text: "Esta cirugía desaparecerá del gráfico.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar'
        });
        if(confirm.isConfirmed) actualizarEstatus(c.id, 'cancelada');
    } else if (accion === undefined && Swal.getCancelButton().innerText.includes('Editar')) {
        abrirModalEdicion(c);
    }
}

async function actualizarEstatus(id, estatus) {
    await fetch('/api/update-status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, estatus })
    });
    Swal.fire('Éxito', `Estatus actualizado a ${estatus}`, 'success');
    cargarCirugias();
}