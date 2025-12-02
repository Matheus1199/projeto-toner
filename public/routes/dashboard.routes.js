const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/", dashboardController.geral);
router.get("/locacao", dashboardController.locacao);
router.get("/vendas-recentes", dashboardController.vendasRecentes);
router.get("/resumo-pagrec", dashboardController.resumoPagRec);

module.exports = router;
