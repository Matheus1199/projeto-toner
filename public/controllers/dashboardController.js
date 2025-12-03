module.exports = {
  geral: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
                SELECT
                        (SELECT COUNT(Id_Cliente) FROM Tbl_Clientes WHERE Ativo = 1) AS totalClientes,
                        (SELECT COUNT(Id_Fornecedor) FROM Tbl_Fornecedores WHERE Status = 1) AS totalFornecedores,
                        (SELECT COUNT(DISTINCT Cod_Produto) FROM Tbl_Toner) AS totalModelos,
                        (SELECT ISNULL(SUM(Saldo), 0) FROM Tbl_ComprasItens) AS totalEstoque,
                        (SELECT ISNULL(SUM(Saldo * Valor_Compra), 0) FROM Tbl_ComprasItens) AS valorEstoque,
                        (SELECT ISNULL(SUM(Valor_Total), 0)
                         FROM Tbl_Pedidos
                         WHERE MONTH(Data) = MONTH(GETDATE()) 
                        AND YEAR(Data) = YEAR(GETDATE())
                    ) AS vendasMes,
                    (SELECT COUNT(*)
                FROM Tbl_Pedidos
                WHERE MONTH(Data) = MONTH(GETDATE())
                  AND YEAR(Data) = YEAR(GETDATE())
                    ) AS qtdVendasMes,
                    (SELECT ISNULL(SUM(Valor_Total),0) FROM Tbl_Pedidos) AS vendasTotais
            `);

      res.json(result.recordset[0]);
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
    }
  },

  locacao: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const q = `
                SELECT
                    T.Cod_Produto,
                    T.Modelo,
                    T.Marca,
                    ISNULL(SUM(CI.Saldo), 0) AS Saldo_Disponivel
                FROM Tbl_Toner T
                         LEFT JOIN Tbl_ComprasItens CI ON CI.Cod_Toner = T.Cod_Produto
                WHERE T.Locacao = 1              -- ⭐ Agora filtramos direto
                GROUP BY T.Cod_Produto, T.Modelo, T.Marca
                HAVING ISNULL(SUM(CI.Saldo), 0) > 0
                ORDER BY Saldo_Disponivel DESC;
            `;

      const result = await pool.request().query(q);
      res.json(result.recordset);
    } catch (err) {
      console.error("Erro dashboard/locacao:", err);
      res.status(500).json({ error: "Erro ao buscar toners de locação." });
    }
  },

  vendasRecentes: async (req, res) => {
    const pool = req.app.get("db");

    try {
      const result = await pool.request().query(`
                SELECT TOP 5
                    C.Nome AS Cliente,
                    CONCAT(T.Marca, ' ', T.Modelo) AS Toner,
                    PI.Quantidade,
                    PI.Valor_Venda AS Valor,
                    P.Data AS DataVenda
                FROM Tbl_PedidosItens PI
                INNER JOIN Tbl_Pedidos P ON P.Cod_Pedido = PI.Cod_Pedido
                INNER JOIN Tbl_Clientes C ON C.Id_Cliente = PI.Cod_Cliente
                INNER JOIN Tbl_Toner T ON T.Cod_Produto = PI.Cod_Toner
                ORDER BY P.Data DESC
            `);

      res.json(result.recordset);
    } catch (err) {
      console.error("Erro ao buscar vendas recentes:", err);
      res.status(500).json({ error: "Erro ao buscar vendas recentes" });
    }
  },

  resumoPagRec: async (req, res) => {
        try {
            const pool = req.app.get("db");

            const queryPeriodos = `
                SELECT 
                    Tipo,
                    CASE
                        WHEN Data_Vencimento <= DATEADD(day, 7, GETDATE()) THEN '7'
                        WHEN Data_Vencimento <= DATEADD(day, 14, GETDATE()) THEN '14'
                        WHEN Data_Vencimento <= DATEADD(day, 21, GETDATE()) THEN '21'
                        ELSE 'MES'
                    END AS Periodo,
                    SUM(Valor) AS Total
                FROM Tbl_PagRec
                WHERE Baixa = 0 
                GROUP BY Tipo,
                    CASE
                        WHEN Data_Vencimento <= DATEADD(day, 7, GETDATE()) THEN '7'
                        WHEN Data_Vencimento <= DATEADD(day, 14, GETDATE()) THEN '14'
                        WHEN Data_Vencimento <= DATEADD(day, 21, GETDATE()) THEN '21'
                        ELSE 'MES'
                    END;
            `;

            const periodos = await pool.request().query(queryPeriodos);

            res.json({
                ok: true,
                periodos: periodos.recordset
            });

        } catch (err) {
            console.log("Erro Dashboard", err);
            res.status(500).json({ ok: false, error: err });
        }
    }
};
