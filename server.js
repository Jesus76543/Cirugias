const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const surgeryRoutes = require('./backend/routes/surgeryRoutes'); // Esta es la única que necesitas

app.use(cors());
app.use(express.json());

// Servir archivos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Rutas de la API
app.use('/api', surgeryRoutes);

// Redirigir al index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor listo en puerto ${PORT}`);
});