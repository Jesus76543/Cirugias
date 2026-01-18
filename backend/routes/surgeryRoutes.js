const express = require('express');
const router = express.Router();
const surgeryController = require('../controllers/surgeryController');

router.post('/cirugias', surgeryController.createSurgery);
router.get('/cirugias', surgeryController.getSurgeries);
router.put('/cirugias/:id', surgeryController.updateSurgery); // <--- NUEVA RUTA PARA EDITAR
router.post('/update-status', surgeryController.updateStatus);

module.exports = router;