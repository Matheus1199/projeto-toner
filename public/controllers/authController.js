module.exports = {
  login: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { usuario, senha } = req.body;

    try {
      const result = await sql.query`
                SELECT usuario, senha, token 
                FROM Tbl_SupUsuarios 
                WHERE usuario = ${usuario} AND senha = ${senha}
            `;

      if (result.recordset.length > 0) {
        const user = result.recordset[0];

        // 🔑 SALVA O TOKEN NA SESSÃO
        req.session.usuario = {
          usuario: user.usuario,
          token: user.token,
        };

        req.session.ultimoAcesso = Date.now();

        return res.json({
          success: true,
          token: user.token,
        });
      }

      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas.",
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  },
};
