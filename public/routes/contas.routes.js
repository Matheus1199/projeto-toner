const express = require("express");
const router = express.Router();
const contasController = require("../controllers/contasController");

router.get("/listar", contasController.listar);
router.post("/lancar", contasController.lancar);

module.exports = router;
