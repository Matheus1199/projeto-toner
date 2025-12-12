const express = require("express");
const router = express.Router();
const estoqueController = require("../controllers/estoqueController");

router.get("/disponivel", estoqueController.disponivel);
router.post("/buscar", estoqueController.buscar);
router.get("/saldo", estoqueController.listarSaldo);

module.exports = router;
