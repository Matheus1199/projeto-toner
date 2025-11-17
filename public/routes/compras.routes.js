const express = require("express");
const router = express.Router();
const comprasController = require("../controllers/comprasController");

router.get("/listar", comprasController.listar);
router.post("/finalizar", comprasController.finalizar);

module.exports = router;
