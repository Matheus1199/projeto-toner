const express = require("express");
const router = express.Router();
const pagrecController = require("../controllers/pagrecController");

router.get("/listar", pagrecController.listar);

module.exports = router;
