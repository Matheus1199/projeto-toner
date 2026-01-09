const express = require("express");
const router = express.Router();
const controller = require("../controllers/contagemController");
const contagemController = require("../controllers/contagemController");

router.post("/salvar", contagemController.salvar);
router.get("/ultimas-divergencias", contagemController.ultimasDivergencias);
router.get("/divergencias/:id", contagemController.divergencias);


module.exports = router;
