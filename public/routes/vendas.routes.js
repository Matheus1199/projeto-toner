const express = require("express");
const router = express.Router();
const vendasController = require("../controllers/vendasController");

router.get("/listar", vendasController.listar);
router.post("/finalizar", vendasController.finalizar);

module.exports = router;
