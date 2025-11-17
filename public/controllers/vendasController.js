module.exports = {
    listar: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT TOP 10 
                    P.Cod_Pedido, 
                    P.Data, 
                    C.Nome AS Nome_Cliente,
                    P.Valor_Total,
                    P.NDoc
                FROM Tbl_Pedidos P
                LEFT JOIN Tbl_Clientes C ON P.Cod_Cliente = C.Id_Cliente
                ORDER BY P.Data DESC
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao buscar vendas:", err);
            res.status(500).json({ error: "Erro ao buscar vendas." });
        }
    },

    finalizar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { Cod_Cliente, NDoc, Cond_Pagamento, Obs, Itens } = req.body;

        if (!Itens || Itens.length === 0)
            return res.status(400).json({ error: "Nenhum item informado." });

        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const totalVenda = Itens.reduce((sum, item) => sum + item.Subtotal, 0);
            let totalCusto = 0;
            let totalLucro = 0;

            // 1) Inserir pedido principal
            const pedidoResult = await transaction.request()
                .input("Data", sql.Date, new Date())
                .input("Cod_Cliente", sql.Int, Cod_Cliente)
                .input("Valor_Total", sql.Decimal(18, 2), totalVenda)
                .input("Custo_Total", sql.Decimal(18, 2), 0)
                .input("Lucro_Total", sql.Decimal(18, 2), 0)
                .input("NDoc", sql.VarChar(50), NDoc)
                .input("Cond_Pagamento", sql.VarChar(50), Cond_Pagamento)
                .input("NF", sql.Bit, 0)
                .query(`
                    INSERT INTO Tbl_Pedidos 
                    (Data, Cod_Cliente, Valor_Total, Custo_Total, Lucro_Total, NDoc, Cond_Pagamento, NF)
                    OUTPUT INSERTED.Cod_Pedido
                    VALUES 
                    (@Data, @Cod_Cliente, @Valor_Total, @Custo_Total, @Lucro_Total, @NDoc, @Cond_Pagamento, @NF)
                `);

            const Cod_Pedido = pedidoResult.recordset[0].Cod_Pedido;

            // 2) Consumir estoque (FIFO)
            for (const item of Itens) {
                let qtdRestante = item.Quantidade;

                const lotes = await transaction.request()
                    .input("Cod_Toner", sql.Int, item.Cod_Toner)
                    .query(`
                        SELECT TOP 100 Id_ItemCompra, Valor_Compra, Saldo
                        FROM Tbl_ComprasItens
                        WHERE Cod_Toner = @Cod_Toner AND Saldo > 0
                        ORDER BY Id_ItemCompra ASC
                    `);

                for (const lote of lotes.recordset) {
                    if (qtdRestante <= 0) break;

                    const usar = Math.min(lote.Saldo, qtdRestante);
                    const valorCompra = parseFloat(lote.Valor_Compra);
                    const valorVenda = parseFloat(item.Valor_Venda);
                    const lucro = (valorVenda - valorCompra) * usar;

                    totalCusto += valorCompra * usar;
                    totalLucro += lucro;

                    // Inserir item da venda
                    await transaction.request()
                        .input("Cod_Pedido", sql.Int, Cod_Pedido)
                        .input("Cod_Cliente", sql.Int, Cod_Cliente)
                        .input("Cod_Toner", sql.Int, item.Cod_Toner)
                        .input("Id_ItemCompra", sql.Int, lote.Id_ItemCompra)
                        .input("Quantidade", sql.Int, usar)
                        .input("Valor_Compra", sql.Decimal(18, 2), valorCompra)
                        .input("Valor_Venda", sql.Decimal(18, 2), valorVenda)
                        .input("Valor_Lucro", sql.Decimal(18, 2), lucro)
                        .query(`
                            INSERT INTO Tbl_PedidosItens 
                            (Cod_Pedido, Cod_Cliente, Cod_Toner, Id_ItemCompra, Quantidade, Valor_Compra, Valor_Venda, Valor_Lucro)
                            VALUES 
                            (@Cod_Pedido, @Cod_Cliente, @Cod_Toner, @Id_ItemCompra, @Quantidade, @Valor_Compra, @Valor_Venda, @Valor_Lucro)
                        `);

                    // Atualizar saldo do lote
                    await transaction.request()
                        .input("Id_ItemCompra", sql.Int, lote.Id_ItemCompra)
                        .input("NovaQtd", sql.Int, lote.Saldo - usar)
                        .query(`
                            UPDATE Tbl_ComprasItens 
                            SET Saldo = @NovaQtd 
                            WHERE Id_ItemCompra = @Id_ItemCompra
                        `);

                    qtdRestante -= usar;
                }

                if (qtdRestante > 0)
                    throw new Error(`Saldo insuficiente para o toner ${item.Cod_Toner}.`);
            }

            // 3) Atualizar totals
            await transaction.request()
                .input("Cod_Pedido", sql.Int, Cod_Pedido)
                .input("Custo_Total", sql.Decimal(18, 2), totalCusto)
                .input("Lucro_Total", sql.Decimal(18, 2), totalLucro)
                .query(`
                    UPDATE Tbl_Pedidos
                    SET Custo_Total = @Custo_Total, Lucro_Total = @Lucro_Total
                    WHERE Cod_Pedido = @Cod_Pedido
                `);

            await transaction.commit();

            res.json({
                message: "Venda registrada com sucesso!",
                Cod_Pedido,
                Valor_Total: totalVenda,
                Lucro_Total: totalLucro
            });

        } catch (err) {
            console.error("Erro ao finalizar venda:", err);
            await transaction.rollback();
            res.status(500).json({ error: err.message || "Erro ao finalizar venda." });
        }
    }
};
