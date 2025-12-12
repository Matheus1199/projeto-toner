const express = require("express");
const router = express.Router();
const controller = require("../controllers/contagemController");
const contagemController = require("../controllers/contagemController");

router.post("/salvar", contagemController.salvar);

module.exports = router;
