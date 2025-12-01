const express = require("express");
const router = express.Router();
const pagrecController = require("../controllers/pagrecController");

router.get("/listar", pagrecController.listar);
router.delete("/excluir/:id", pagrecController.excluir);
router.get("/buscar/:id", pagrecController.buscarPorId);
router.post("/editar/:id", pagrecController.editar);

module.exports = router;
