module.exports = {
    listar: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT TOP 10 
                    C.Cod_Compra, 
                    C.Data_Compra, 
                    C.Cod_Fornecedor,
                    F.Nome AS Nome_Fornecedor,
                    C.NDocumento,
                    C.Valor_Total,
                    C.Cond_Pagamento,
                    C.Obs
                FROM Tbl_Compras C
                LEFT JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
                ORDER BY C.Data_Compra DESC
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao listar compras:", err);
            res.status(500).json({ error: "Erro ao listar compras." });
        }
    },

    finalizar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        let { Cod_Fornecedor, NDocumento, Cond_Pagamento, Obs, carrinho } = req.body;

        if (!carrinho || !carrinho.length)
            return res.status(400).json({ error: "O carrinho está vazio." });

        try {
            const total = carrinho.reduce((sum, item) => sum + item.Subtotal, 0);

            // 1) Inserir compra principal
            const compraResult = await pool.request()
                .input("Data_Compra", sql.DateTime, new Date())
                .input("Cod_Fornecedor", sql.Int, Cod_Fornecedor)
                .input("NDocumento", sql.VarChar(50), NDocumento)
                .input("Valor_Total", sql.Decimal(18, 2), total)
                .input("Cond_Pagamento", sql.VarChar(50), Cond_Pagamento)
                .input("Obs", sql.VarChar(255), Obs)
                .query(`
                    INSERT INTO Tbl_Compras 
                    (Data_Compra, Cod_Fornecedor, NDocumento, Valor_Total, Cond_Pagamento, Obs)
                    OUTPUT INSERTED.Cod_Compra
                    VALUES (@Data_Compra, @Cod_Fornecedor, @NDocumento, @Valor_Total, @Cond_Pagamento, @Obs)
                `);

            const Cod_Compra = compraResult.recordset[0].Cod_Compra;

            // 2) Inserir itens da compra
            for (const item of carrinho) {
                await pool.request()
                    .input("Cod_Compra", sql.Int, Cod_Compra)
                    .input("Cod_Toner", sql.Int, item.Cod_Produto || item.Cod_Toner)
                    .input("Quantidade", sql.Int, item.Quantidade)
                    .input("Valor_Compra", sql.Decimal(18, 2), item.ValorUnitario)
                    .input("Saldo", sql.Int, item.Quantidade)
                    .query(`
                        INSERT INTO Tbl_ComprasItens 
                        (Cod_Compra, Cod_Toner, Quantidade, Valor_Compra, Saldo)
                        VALUES 
                        (@Cod_Compra, @Cod_Toner, @Quantidade, @Valor_Compra, @Saldo)
                    `);
            }

            // 3) Buscar dados completos
            const dadosCompra = await pool.request()
                .input("Cod_Compra", sql.Int, Cod_Compra)
                .query(`
                    SELECT 
                        C.Cod_Compra,
                        C.Data_Compra,
                        C.NDocumento,
                        C.Valor_Total,
                        C.Cond_Pagamento,
                        C.Obs,
                        F.Nome AS Nome_Fornecedor
                    FROM Tbl_Compras C
                    INNER JOIN Tbl_Fornecedores F ON F.Id_Fornecedor = C.Cod_Fornecedor
                    WHERE C.Cod_Compra = @Cod_Compra
                `);

            res.json(dadosCompra.recordset[0]);

        } catch (error) {
            console.error("Erro ao finalizar compra:", error);
            res.status(500).json({ error: "Erro ao finalizar compra." });
        }
    }
};
