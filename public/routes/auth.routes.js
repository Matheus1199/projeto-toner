const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const path = require("path"); // 👈 ADICIONE ISSO

// Rota GET para abrir a página de login
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/login.html"));
});

// Rota POST para validar usuário e senha
router.post("/", authController.login);

module.exports = router;
