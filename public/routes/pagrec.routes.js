const express = require("express");
const router = express.Router();
const pagrecController = require("../controllers/pagrecController");

router.post("/lancar", pagrecController.lancar);
router.get("/pendentes", pagrecController.pendentes);
router.get("/listar", pagrecController.listar);
router.post("/salvar", pagrecController.salvar);
router.get("/buscar/:id", pagrecController.buscar);
router.delete("/excluir/:id", pagrecController.excluir);

module.exports = router;
