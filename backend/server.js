const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const surgeryRoutes = require('./backend/routes/surgeryRoutes');
const loginRoutes = require('./backend/routes/loginRoutes'); // Si tienes rutas de login aparte

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del Frontend
// Esto asume que tu carpeta "frontend" está al mismo nivel que server.js
app.use(express.static(path.join(__dirname, 'frontend')));

// Rutas de la API
app.use('/api', surgeryRoutes);
// app.use('/api', loginRoutes);

// Redirigir cualquier otra ruta al index.html (Útil para Single Page Apps)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Puerto dinámico para Render/Koyeb
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor operando en puerto: ${PORT}`);
});