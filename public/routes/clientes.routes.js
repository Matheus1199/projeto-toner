const express = require("express");
const router = express.Router();
const clienteController = require("../controllers/clienteController");

router.post("/", clienteController.cadastrar);
router.get("/pesquisar", clienteController.pesquisar);
router.get("/", clienteController.listarTodos);
router.get("/:Id_cliente", clienteController.buscarPorId);
router.put("/:Id_cliente", clienteController.editar);
router.delete("/:Id_cliente", clienteController.excluir);
router.get("/pedido/:id/itens", clienteController.itensPedido);

module.exports = router;
