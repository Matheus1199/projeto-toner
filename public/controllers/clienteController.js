module.exports = {
  cadastrar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { nome, ativo, id_vendedor, tipo } = req.body;

    try {
      await pool
        .request()
        .input("nome", sql.VarChar(100), nome)
        .input("ativo", sql.Bit, ativo)
        .input("id_vendedor", sql.Int, id_vendedor)
        .input("tipo", sql.Int, tipo).query(`
                    INSERT INTO Tbl_Clientes (Nome, Ativo, Id_vendedor, Tipo)
                    VALUES (@nome, @ativo, @id_vendedor, @tipo)
                `);

      res.status(201).json({ message: "Cliente cadastrado com sucesso!" });
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error);
      res.status(500).json({ error: "Erro ao cadastrar cliente" });
    }
  },

  pesquisar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { nome } = req.query;

    try {
      const result = await pool
        .request()
        .input("nome", sql.VarChar, `%${nome}%`).query(`
                SELECT TOP 20 
                    Id_Cliente,
                    Nome
                FROM Tbl_Clientes
                WHERE Nome LIKE @nome AND Ativo = 1
                ORDER BY Nome ASC
            `);

      if (result.recordset.length === 0)
        return res.status(404).json({ error: "Cliente não encontrado" });

      return res.json(result.recordset);
    } catch (error) {
      console.error("Erro ao pesquisar cliente:", error);
      return res.status(500).json({ error: "Erro ao pesquisar cliente" });
    }
  },

  listarTodos: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
                SELECT Id_cliente, Nome, Ativo, Id_vendedor 
                FROM Tbl_Clientes
            `);

      res.json(result.recordset);
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      res.status(500).json({ error: "Erro ao listar clientes" });
    }
  },

  detalhes: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { id } = req.params;

    try {
      const clienteResult = await pool.request().input("id", sql.Int, id)
        .query(`
                SELECT 
                    Id_Cliente,
                    Nome,
                    Ativo,
                    Id_Vendedor,
                    Tipo
                FROM Tbl_Clientes
                WHERE Id_Cliente = @id
            `);

      if (clienteResult.recordset.length === 0)
        return res.status(404).json({ error: "Cliente não encontrado" });

      const cliente = clienteResult.recordset[0];

      const vendasResult = await pool.request().input("id", sql.Int, id).query(`
                SELECT TOP 5
                    P.Cod_Pedido,
                    P.Data,
                    P.Valor_Total,
                    P.NDoc,
                    (
                        SELECT SUM(Quantidade)
                        FROM Tbl_PedidosItens I
                        WHERE I.Cod_Pedido = P.Cod_Pedido
                    ) AS QuantidadeTotal
                FROM Tbl_Pedidos P
                WHERE P.Cod_Cliente = @id
                ORDER BY P.Data DESC
            `);

      const compras = [];

      for (const compra of vendasResult.recordset) {
        const itensResult = await pool
          .request()
          .input("Cod_Pedido", sql.Int, compra.Cod_Pedido).query(`
                    SELECT 
                        I.Quantidade,
                        I.Valor_Venda,
                        T.Modelo,
                        T.Marca,
                        T.Tipo
                    FROM Tbl_PedidosItens I
                    INNER JOIN Tbl_Toner T ON T.Cod_Produto = I.Cod_Toner
                    WHERE I.Cod_Pedido = @Cod_Pedido
                `);

        compras.push({
          ...compra,
          itens: itensResult.recordset,
        });
      }

      const historicoResult = await pool.request().input("id", sql.Int, id)
        .query(`
                SELECT 
                    T.Modelo,
                    SUM(I.Quantidade) AS QuantidadeTotal
                FROM Tbl_PedidosItens I
                INNER JOIN Tbl_Pedidos P ON P.Cod_Pedido = I.Cod_Pedido
                INNER JOIN Tbl_Toner T ON T.Cod_Produto = I.Cod_Toner
                WHERE P.Cod_Cliente = @id
                GROUP BY T.Modelo
                ORDER BY QuantidadeTotal DESC
            `);

      return res.json({
        cliente,
        compras,
        historico: historicoResult.recordset,
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar detalhes do cliente" });
    }
  },

  buscarPorId: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");
    const { Id_cliente } = req.params;

    try {
      const result = await pool
        .request()
        .input("Id_cliente", sql.Int, Id_cliente).query(`
                    SELECT Id_cliente, Nome, Ativo, Id_vendedor 
                    FROM Tbl_Clientes 
                    WHERE Id_cliente = @Id_cliente
                `);

      if (result.recordset.length === 0)
        return res.status(404).json({ error: "Cliente não encontrado." });

      res.json(result.recordset[0]);
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  },

  editar: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { Id_cliente } = req.params;
    const { nome, ativo, id_vendedor, tipo } = req.body;

    try {
      const result = await pool
        .request()
        .input("Id_cliente", sql.Int, Id_cliente)
        .input("nome", sql.VarChar(100), nome)
        .input("ativo", sql.Bit, ativo)
        .input("id_vendedor", sql.Int, id_vendedor)
        .input("tipo", sql.Int, tipo).query(`
                    UPDATE Tbl_Clientes
                    SET Nome = @nome,
                        Ativo = @ativo,
                        Id_vendedor = @id_vendedor,
                        Tipo = @tipo
                    WHERE Id_cliente = @Id_cliente
                `);

      if (result.rowsAffected[0] === 0)
        return res.status(404).json({ error: "Cliente não encontrado." });

      res.json({ message: "Cliente atualizado com sucesso!" });
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  },

  excluir: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { Id_cliente } = req.params;

    try {
      const result = await pool
        .request()
        .input("Id_cliente", sql.Int, Id_cliente).query(`
                    DELETE FROM Tbl_Clientes 
                    WHERE Id_cliente = @Id_cliente
                `);

      if (result.rowsAffected[0] === 0)
        return res.status(404).json({ error: "Cliente não encontrado." });

      res.json({ message: "Cliente excluído com sucesso!" });
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      res.status(500).json({ error: "Erro ao excluir cliente" });
    }
  },

  itensPedido: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");
    const { id } = req.params;

    try {
      const result = await pool.request().input("id", sql.Int, id).query(`
                    SELECT 
                        I.Cod_Pedido,
                        I.Quantidade,
                        I.Valor_Venda,
                        T.Modelo,
                        T.Marca,
                        T.Tipo
                    FROM Tbl_PedidosItens I
                    INNER JOIN Tbl_Toner T ON T.Cod_Produto = I.Cod_Toner
                    WHERE I.Cod_Pedido = @id
                `);

      if (result.recordset.length === 0)
        return res
          .status(404)
          .json({ error: "Nenhum item encontrado para este pedido." });

      res.json(result.recordset);
    } catch (error) {
      console.error("Erro ao buscar itens do pedido:", error);
      res.status(500).json({ error: "Erro ao buscar itens do pedido." });
    }
  },
};
