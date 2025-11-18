const express = require("express");
const router = express.Router();
const clienteController = require("../controllers/clienteController");

router.post("/cadastrar", clienteController.cadastrar);
router.get("/pesquisar", clienteController.pesquisar);
router.get("/listarTodos", clienteController.listarTodos);
router.get("/buscarPorId/:Id_cliente", clienteController.buscarPorId);
router.put("/editar/:Id_cliente", clienteController.editar);
router.delete("/excluir/:Id_cliente", clienteController.excluir);
router.get("/pedido/:id/itens", clienteController.itensPedido);

module.exports = router;
