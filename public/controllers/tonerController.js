module.exports = {
  cadastrar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { modelo, marca, tipo, locacao } = req.body;

    try {
      await pool
        .request()
        .input("modelo", sql.VarChar(50), modelo)
        .input("marca", sql.VarChar(50), marca)
        .input("tipo", sql.VarChar(50), tipo)
        .input("locacao", sql.Bit, locacao).query(`
                    INSERT INTO Tbl_Toner (Modelo, Marca, Tipo, Locacao)
                    VALUES (@modelo, @marca, @tipo, @locacao)
                `);

      res.status(201).json({ message: "Toner cadastrado com sucesso!" });
    } catch (error) {
      console.error("Erro ao cadastrar toner:", error);
      res.status(500).json({ error: "Erro ao cadastrar toner" });
    }
  },

  buscarInteligente: async (req, res) => {
  const pool = req.app.get("db");
  const sql = req.app.get("sql");

  const { termo } = req.query;

  if (!termo || termo.trim().length < 2) {
    return res.json({ resultados: [] });
  }

  const request = pool.request()
    .input("termo", sql.VarChar(100), `%${termo}%`);

  const modelos = await request.query(`
    SELECT TOP 5
      Cod_Produto AS id,
      Modelo AS label,
      Marca
    FROM Tbl_Toner
    WHERE Modelo LIKE @termo
  `);

  const marcas = await request.query(`
    SELECT DISTINCT TOP 3
      Marca AS label
    FROM Tbl_Toner
    WHERE Marca LIKE @termo
  `);

  const tipos = await request.query(`
    SELECT DISTINCT TOP 3
      Tipo AS label
    FROM Tbl_Toner
    WHERE Tipo LIKE @termo
  `);

  const resultados = [
    ...modelos.recordset.map(m => ({
      tipo: "modelo",
      id: m.id,
      label: m.label,
      sub: m.Marca
    })),
    ...marcas.recordset.map(m => ({
      tipo: "marca",
      label: m.label
    })),
    ...tipos.recordset.map(t => ({
      tipo: "tipo",
      label: t.label
    }))
  ];

  return res.json({ resultados });
},


  pesquisar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { termo, tipo, detalhado } = req.query;

    if (!termo || termo.trim() === "") {
      return res.status(400).json({ error: "Informe um termo para pesquisa." });
    }

    if (!["modelo", "marca", "tipo"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de pesquisa inválido." });
    }

    try {
      // =====================================================
      // 🔽 DROPDOWN — PESQUISA POR MODELO
      // =====================================================
      if (tipo === "modelo" && !detalhado) {
        const result = await pool
          .request()
          .input("termo", sql.VarChar(100), `%${termo}%`).query(`
      SELECT TOP 10
          Cod_Produto,
          Modelo,
          Marca,
          Tipo
      FROM Tbl_Toner
      WHERE Modelo LIKE @termo
      ORDER BY Modelo
    `);

        return res.json({
          tipo: "dropdown",
          toners: result.recordset,
        });
      }


      // =====================================================
      // 📦 DETALHADO — MODELO SELECIONADO
      // =====================================================
      if (tipo === "modelo" && detalhado) {
        const codProduto = parseInt(termo);

        if (isNaN(codProduto)) {
          return res.status(400).json({ error: "Código do toner inválido." });
        }

        const tonerResult = await pool
          .request()
          .input("cod", sql.Int, codProduto).query(`
      SELECT
          T.Cod_Produto,
          T.Modelo,
          T.Marca,
          T.Tipo,
          ISNULL(SUM(CI.Saldo), 0) AS Estoque
      FROM Tbl_Toner T
      LEFT JOIN Tbl_ComprasItens CI ON T.Cod_Produto = CI.Cod_Toner
      WHERE T.Cod_Produto = @cod
      GROUP BY T.Cod_Produto, T.Modelo, T.Marca, T.Tipo
    `);

        if (!tonerResult.recordset.length) {
          return res.status(404).json({ error: "Toner não encontrado." });
        }

        const toner = tonerResult.recordset[0];

        const vendas = await pool
          .request()
          .input("cod", sql.Int, toner.Cod_Produto).query(`
          SELECT TOP 5
              P.Data AS Data_Venda,
              C.Nome AS Cliente,
              I.Quantidade,
              I.Valor_Venda
          FROM Tbl_PedidosItens I
          JOIN Tbl_Pedidos P ON I.Cod_Pedido = P.Cod_Pedido
          JOIN Tbl_Clientes C ON I.Cod_Cliente = C.Id_Cliente
          WHERE I.Cod_Toner = @cod
          ORDER BY P.Data DESC
        `);

        const compras = await pool
          .request()
          .input("cod", sql.Int, toner.Cod_Produto).query(`
          SELECT TOP 5
              C.Data_Compra,
              F.Nome AS Fornecedor,
              CI.Quantidade,
              CI.Valor_Compra
          FROM Tbl_ComprasItens CI
          JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
          JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
          WHERE CI.Cod_Toner = @cod
          ORDER BY C.Data_Compra DESC
        `);

        return res.json({
          tipo: "modelo",
          toner: {
            modelo: toner.Modelo,
            marca: toner.Marca,
            tipo: toner.Tipo,
            estoque: toner.Estoque,
          },
          vendas: vendas.recordset,
          compras: compras.recordset,
        });
      }

      // =====================================================
      // 📄 MARCA / TIPO — LISTAGEM
      // =====================================================
      const campo = tipo === "marca" ? "T.Marca" : "T.Tipo";

      const result = await pool
        .request()
        .input("termo", sql.VarChar(100), `%${termo}%`).query(`
        SELECT 
            T.Cod_Produto,
            T.Modelo,
            T.Marca,
            T.Tipo,
            ISNULL(SUM(CI.Saldo), 0) AS Estoque
        FROM Tbl_Toner T
        LEFT JOIN Tbl_ComprasItens CI ON T.Cod_Produto = CI.Cod_Toner
        WHERE ${campo} LIKE @termo
        GROUP BY T.Cod_Produto, T.Modelo, T.Marca, T.Tipo
        ORDER BY T.Modelo
      `);

      return res.json({ tipo, toners: result.recordset });
    } catch (error) {
      console.error("Erro ao pesquisar toner:", error);
      return res.status(500).json({ error: "Erro ao pesquisar toner." });
    }
  },

  listar: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
                SELECT Cod_Produto, Marca, Modelo, Tipo
                FROM Tbl_Toner
                ORDER BY Marca, Modelo
            `);

      res.json(result.recordset);
    } catch (err) {
      console.error("Erro ao buscar toner:", err);
      res.status(500).json({ error: "Erro ao buscar toners." });
    }
  },

  editar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { Cod_Produto } = req.params;
    const { modelo, marca, tipo, locacao } = req.body;

    try {
      const result = await pool
        .request()
        .input("Cod_Produto", sql.Int, Cod_Produto)
        .input("modelo", sql.VarChar(50), modelo)
        .input("marca", sql.VarChar(50), marca)
        .input("tipo", sql.VarChar(50), tipo)
        .input("locacao", sql.Bit, locacao).query(`
                    UPDATE Tbl_Toner
                    SET Modelo = @modelo,
                        Marca = @marca,
                        Tipo = @tipo,
                        Locacao = @locacao
                    WHERE Cod_Produto = @Cod_Produto
                `);

      if (result.rowsAffected[0] === 0)
        return res.status(404).json({ error: "Toner não encontrado." });

      res.json({ message: "Toner atualizado com sucesso!" });
    } catch (error) {
      console.error("Erro ao atualizar toner:", error);
      res.status(500).json({ error: "Erro ao atualizar toner" });
    }
  },

  excluir: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { Cod_Produto } = req.params;

    try {
      const result = await pool
        .request()
        .input("Cod_Produto", sql.Int, Cod_Produto)
        .query(`DELETE FROM Tbl_Toner WHERE Cod_Produto = @Cod_Produto`);

      if (result.rowsAffected[0] === 0)
        return res.status(404).json({ error: "Toner não encontrado." });

      res.json({ message: "Toner excluído com sucesso!" });
    } catch (error) {
      console.error("Erro ao excluir toner:", error);
      res.status(500).json({ error: "Erro ao excluir toner" });
    }
  },

  ultimasCompras: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
      SELECT TOP 5
          c.Cod_Compra,
          c.Data_Compra,
          f.Nome AS Fornecedor,
          t.Marca,
          t.Modelo,
          ci.Quantidade,
          ci.Valor_Compra,
          (ci.Quantidade * ci.Valor_Compra) AS Valor_Total,
          c.NDocumento
      FROM Tbl_Compras c
      INNER JOIN Tbl_ComprasItens ci ON ci.Cod_Compra = c.Cod_Compra
      INNER JOIN Tbl_Toner t ON t.Cod_Produto = ci.Cod_Toner
      INNER JOIN Tbl_Fornecedores f ON f.Id_Fornecedor = c.Cod_Fornecedor
      ORDER BY c.Data_Compra DESC
    `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao buscar últimas compras" });
    }
  },
};
