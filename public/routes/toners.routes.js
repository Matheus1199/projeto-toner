const express = require("express");
const router = express.Router();
const tonerController = require("../controllers/tonerController");

router.post("/", tonerController.cadastrar);
router.get("/pesquisar", tonerController.pesquisar);
router.get("/listar", tonerController.listar);
router.put("/:Cod_Produto", tonerController.editar);
router.delete("/:Cod_Produto", tonerController.excluir);

module.exports = router;
