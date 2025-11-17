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
                WITH ClientesLocacao AS (
                    SELECT Id_Cliente FROM Tbl_Clientes WHERE Tipo = 4
                ),
                TonersUsados AS (
                    SELECT DISTINCT PI.Cod_Toner
                    FROM Tbl_PedidosItens PI
                    JOIN Tbl_Pedidos P ON PI.Cod_Pedido = P.Cod_Pedido
                    WHERE P.Cod_Cliente IN (SELECT Id_Cliente FROM ClientesLocacao)
                ),
                EstoquePorToner AS (
                    SELECT Cod_Toner, SUM(Saldo) AS Saldo
                    FROM Tbl_ComprasItens
                    GROUP BY Cod_Toner
                )
                SELECT
                    T.Cod_Produto,
                    T.Modelo,
                    T.Marca,
                    ISNULL(E.Saldo, 0) AS Saldo_Disponivel
                FROM TonersUsados U
                JOIN Tbl_Toner T ON T.Cod_Produto = U.Cod_Toner
                LEFT JOIN EstoquePorToner E ON E.Cod_Toner = T.Cod_Produto
                WHERE E.Saldo > 0
                ORDER BY ISNULL(E.Saldo, 0) DESC;
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
    }
};
