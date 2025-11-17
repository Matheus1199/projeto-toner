const express = require("express");
const router = express.Router();
const fornecedorController = require("../controllers/fornecedorController");

router.get("/", fornecedorController.listarTudo);
router.get("/listar", fornecedorController.listarSimples);
router.get("/:id", fornecedorController.buscarPorId);
router.post("/", fornecedorController.cadastrar);
router.put("/:id", fornecedorController.editar);
router.delete("/:id", fornecedorController.excluir);

module.exports = router;
