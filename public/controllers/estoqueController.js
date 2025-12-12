module.exports = {
  disponivel: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
                SELECT 
                    CI.Id_ItemCompra,
                    T.Cod_Produto,
                    T.Marca,
                    T.Modelo,
                    T.Tipo,
                    F.Nome AS Fornecedor,
                    CI.Valor_Compra,
                    CI.Saldo,
                    C.Cod_Compra,
                    C.NDocumento
                FROM Tbl_ComprasItens CI
                INNER JOIN Tbl_Toner T ON CI.Cod_Toner = T.Cod_Produto
                LEFT JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
                LEFT JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
                WHERE CI.Saldo > 0
                ORDER BY T.Marca, T.Modelo
            `);

      res.json(result.recordset);
    } catch (error) {
      console.error("Erro ao buscar estoque disponível:", error);
      res.status(500).json({ error: "Erro ao buscar estoque disponível." });
    }
  },

  // ============================================================
  //  BUSCA DE LOTES + FILTRAGEM DOS JÁ ADICIONADOS AO CARRINHO
  // ============================================================
  buscar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    // aceitamos tanto req.body (POST) quanto req.query (fallback)
    const body = req.body || {};
    const { termo, consumidos } = body;

    if (!termo || termo.trim() === "") {
      return res
        .status(400)
        .json({ error: "Informe um modelo para pesquisar." });
    }

    try {
      // faz a consulta ao banco (somente uma vez, guardando em 'result')
      const result = await pool
        .request()
        .input("termo", sql.VarChar(100), `%${termo}%`).query(`
                SELECT 
                    CI.Id_ItemCompra,
                    CI.Cod_Toner,
                    CI.Saldo,
                    CI.Valor_Compra,
                    T.Modelo,
                    T.Marca,
                    T.Tipo,
                    C.Cod_Compra,
                    F.Nome AS Fornecedor
                FROM Tbl_ComprasItens CI
                JOIN Tbl_Toner T ON CI.Cod_Toner = T.Cod_Produto
                JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
                JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
                WHERE (T.Modelo LIKE @termo OR T.Marca LIKE @termo)
                  AND CI.Saldo > 0
                ORDER BY T.Modelo ASC, CI.Id_ItemCompra ASC
            `);

      // transforma o recordset em 'lotes'
      let lotes = Array.isArray(result.recordset) ? result.recordset : [];

      // aplica o ajuste de saldo virtual com base no objeto 'consumidos' enviado pelo frontend
      if (consumidos && typeof consumidos === "object") {
        lotes = lotes
          .map((l) => {
            // cuidado: Id_ItemCompra no banco pode ser number ou string — use coerção segura
            const usado = Number(consumidos[String(l.Id_ItemCompra)] || 0);
            const novoSaldo = Number(l.Saldo) - usado;
            return Object.assign({}, l, { Saldo: novoSaldo });
          })
          .filter((l) => Number(l.Saldo) > 0);
      }

      return res.json(lotes);
    } catch (err) {
      console.error("Erro ao buscar estoque:", err);
      return res.status(500).json({ error: "Erro ao buscar estoque." });
    }
  },

  listarSaldo: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
                SELECT 
    t.Cod_Produto,
    t.Marca,
    t.Modelo,
    COALESCE(SUM(ci.Saldo), 0) AS SaldoSistema
FROM Tbl_Toner t
LEFT JOIN Tbl_ComprasItens ci ON ci.Cod_Toner = t.Cod_Produto
GROUP BY t.Cod_Produto, t.Marca, t.Modelo
HAVING COALESCE(SUM(ci.Saldo), 0) > 0
ORDER BY t.Marca, t.Modelo;
            `);

      return res.json(result.recordset);
    } catch (e) {
      console.error("ERRO AO LISTAR SALDO DOS TONERS:", e);
      return res.status(500).json({
        erro: true,
        mensagem: "Erro ao carregar saldo dos toners.",
      });
    }
  },
};
