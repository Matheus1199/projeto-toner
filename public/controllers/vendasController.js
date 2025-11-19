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
                ORDER BY P.Cod_Pedido DESC
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

        const { Cod_Cliente, NDoc, Cond_Pagamento, Obs, itens, financeiro } = req.body;

        if (!itens || itens.length === 0)
            return res.status(400).json({ error: "Nenhum item informado." });

        if (!financeiro || financeiro.length === 0)
            return res.status(400).json({ error: "Nenhum lançamento financeiro informado." });

        // === calcular totais
        const totalVenda = itens.reduce((s, it) => s + (Number(it.valor_venda) * Number(it.quantidade)), 0);
        const totalFinanceiro = financeiro.reduce((s, f) => s + Number(f.valor), 0);

        if (Number(totalVenda.toFixed(2)) !== Number(totalFinanceiro.toFixed(2))) {
            return res.status(400).json({
                error: "O total financeiro não confere com o total da venda."
            });
        }

        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // 1) Inserir PEDIDO
            const pedidoResult = await transaction.request()
                .input("Data", sql.DateTime, new Date())
                .input("Cod_Cliente", sql.Int, Cod_Cliente)
                .input("Valor_Total", sql.Decimal(18, 2), totalVenda)
                .input("Custo_Total", sql.Decimal(18, 2), 0)
                .input("Lucro_Total", sql.Decimal(18, 2), 0)
                .input("NDoc", sql.VarChar(50), NDoc || '')
                .input("Cond_Pagamento", sql.VarChar(50), Cond_Pagamento || '')
                .input("Obs", sql.VarChar(255), Obs || '')
                .input("NF", sql.Bit, 0)
                .query(`
                    INSERT INTO Tbl_Pedidos
                    (Data, Cod_Cliente, Valor_Total, Custo_Total, Lucro_Total, NDoc, Cond_Pagamento, Obs, NF)
                    OUTPUT INSERTED.Cod_Pedido
                    VALUES (@Data, @Cod_Cliente, @Valor_Total, @Custo_Total, @Lucro_Total, @NDoc, @Cond_Pagamento, @Obs, @NF)
                `);

            const Cod_Pedido = pedidoResult.recordset[0].Cod_Pedido;

            let totalCusto = 0;
            let totalLucro = 0;

            // 2) Inserir itens da venda (usando o lote correto enviado pelo front-end)
            for (const it of itens) {
                const valorCompra = Number(it.valor_compra);
                const valorVenda = Number(it.valor_venda);
                const quantidade = Number(it.quantidade);
                const valorLucro = (valorVenda - valorCompra) * quantidade;

                await transaction.request()
                    .input("Cod_Pedido", sql.Int, Cod_Pedido)
                    .input("Cod_Cliente", sql.Int, Cod_Cliente)
                    .input("Cod_Toner", sql.Int, it.cod_toner)
                    .input("Id_ItemCompra", sql.Int, it.id_itemcompra)
                    .input("Quantidade", sql.Int, quantidade)
                    .input("Valor_Compra", sql.Decimal(18, 2), valorCompra)
                    .input("Valor_Venda", sql.Decimal(18, 2), valorVenda)
                    .input("Valor_Lucro", sql.Decimal(18, 2), valorLucro)
                    .query(`
                        INSERT INTO Tbl_PedidosItens
                        (Cod_Pedido, Cod_Cliente, Cod_Toner, Id_ItemCompra, Quantidade, Valor_Compra, Valor_Venda, Valor_Lucro)
                        VALUES
                        (@Cod_Pedido, @Cod_Cliente, @Cod_Toner, @Id_ItemCompra, @Quantidade, @Valor_Compra, @Valor_Venda, @Valor_Lucro)
                    `);

                // atualizar saldo do lote
                await transaction.request()
                    .input("Id_ItemCompra", sql.Int, it.id_itemcompra)
                    .input("Quantidade", sql.Int, quantidade)
                    .query(`
                        UPDATE Tbl_ComprasItens
                        SET Saldo = Saldo - @Quantidade
                        WHERE Id_ItemCompra = @Id_ItemCompra
                    `);

                totalCusto += valorCompra * quantidade;
                totalLucro += valorLucro;
            }

            // 3) Atualizar totais do pedido
            await transaction.request()
                .input("Cod_Pedido", sql.Int, Cod_Pedido)
                .input("Custo_Total", sql.Decimal(18, 2), totalCusto)
                .input("Lucro_Total", sql.Decimal(18, 2), totalLucro)
                .query(`
                    UPDATE Tbl_Pedidos
                    SET Custo_Total = @Custo_Total,
                        Lucro_Total = @Lucro_Total
                    WHERE Cod_Pedido = @Cod_Pedido
                `);

            // 4) Inserir contas a receber (financeiro)
            for (const fin of financeiro) {
                await transaction.request()
                    .input("Tipo", sql.Int, fin.tipo)   // 2 = venda
                    .input("Operacao", sql.Int, fin.operacao) // 2 = venda
                    .input("Id_Operacao", sql.Int, Cod_Pedido)
                    .input("Data_Vencimento", sql.DateTime, new Date(fin.vencimento))
                    .input("Valor", sql.Decimal(18, 2), fin.valor)
                    .input("EAN", sql.VarChar(100), fin.ean || null)
                    .input("Conta", sql.Int, fin.conta || null)
                    .input("Valor_Baixa", sql.Decimal(18, 2), null)
                    .input("Data_Baixa", sql.DateTime, null)
                    .input("Obs", sql.VarChar(255), fin.obs || null)
                    .input("Baixa", sql.Bit, 0)
                    .query(`
                        INSERT INTO Tbl_PagRec
                        (Tipo, Operacao, Id_Operacao, Data_Vencimento, Valor, EAN, Conta, Valor_Baixa, Data_Baixa, Obs, Baixa)
                        VALUES
                        (@Tipo, @Operacao, @Id_Operacao, @Data_Vencimento, @Valor, @EAN, @Conta, @Valor_Baixa, @Data_Baixa, @Obs, @Baixa)
                    `);
            }

            await transaction.commit();

            res.json({
                Cod_Pedido,
                Valor_Total: totalVenda,
                Custo_Total: totalCusto,
                Lucro_Total: totalLucro,
                message: "Venda registrada com sucesso!"
            });

        } catch (err) {
            console.error("Erro ao finalizar venda:", err);
            await transaction.rollback();
            res.status(500).json({
                error: err.message || "Erro ao finalizar venda."
            });
        }
    }
};
