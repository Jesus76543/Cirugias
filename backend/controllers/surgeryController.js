const db = require('../config/db');

// Crear cirugía con validación de traslape
const createSurgery = async (req, res) => {
    const { paciente_nombre, doctor_nombre, quirofano_id, procedimiento, fecha, hora, duracion, notas } = req.body;
    try {
        const [conflictos] = await db.query(
            `SELECT * FROM cirugias 
             WHERE quirofano_id = ? AND fecha_programada = ? AND estatus = 'programada'
             AND (hora_inicio < ADDTIME(?, ?) AND ADDTIME(hora_inicio, duracion_estimada) > ?)`,
            [quirofano_id, fecha, hora, duracion, hora]
        );

        if (conflictos.length > 0) {
            return res.status(400).json({ error: "El horario se empalma con otra cirugía activa." });
        }

        await db.query(
            `INSERT INTO cirugias (paciente_nombre, doctor_nombre, quirofano_id, tipo_procedimiento, fecha_programada, hora_inicio, duracion_estimada, notas, estatus) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'programada')`,
            [paciente_nombre || "S/N", doctor_nombre, quirofano_id, procedimiento, fecha, hora, duracion, notas]
        );
        res.json({ mensaje: "Agendado con éxito" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// Obtener todas las cirugías activas
const getSurgeries = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM cirugias WHERE estatus = 'programada'");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ACTUALIZACIÓN: Editar datos de la cirugía
const updateSurgery = async (req, res) => {
    const { id } = req.params;
    const { paciente_nombre, doctor_nombre, tipo_procedimiento, notas } = req.body;
    try {
        await db.query(
            `UPDATE cirugias SET paciente_nombre = ?, doctor_nombre = ?, tipo_procedimiento = ?, notas = ? WHERE id = ?`,
            [paciente_nombre, doctor_nombre, tipo_procedimiento, notas, id]
        );
        res.json({ mensaje: "Datos actualizados correctamente" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// Cambiar estatus (Terminar/Cancelar)
const updateStatus = async (req, res) => {
    const { id, estatus } = req.body;
    try {
        await db.query("UPDATE cirugias SET estatus = ? WHERE id = ?", [estatus, id]);
        res.json({ mensaje: "Estatus actualizado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { createSurgery, getSurgeries, updateSurgery, updateStatus };