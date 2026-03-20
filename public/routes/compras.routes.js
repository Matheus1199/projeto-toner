const express = require("express");
const router = express.Router();
const comprasController = require("../controllers/comprasController");

router.get("/listar", comprasController.listar);
router.post("/finalizar", comprasController.finalizar);
router.get("/:codCompra", comprasController.buscarPorCodigo);
router.delete("/cancelar/:codCompra", comprasController.cancelar);

module.exports = router;
