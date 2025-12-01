module.exports = {
    listar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        try {
            // CONTAS A RECEBER
            const receber = await pool.request().query(`
                SELECT
                    PR.Id_Lancamento,
                    PR.Data_Vencimento AS Data,
                    C.Nome AS Cliente,
                    P.NDoc AS Documento,
                    PR.Valor,
                    P.Cond_Pagamento
                FROM Tbl_PagRec PR
                INNER JOIN Tbl_Pedidos P
                        ON P.Cod_Pedido = PR.Id_Operacao
                INNER JOIN Tbl_Clientes C
                        ON C.Id_Cliente = P.Cod_Cliente
                WHERE PR.Tipo = 2
                AND PR.Operacao = 2
                ORDER BY PR.Data_Vencimento DESC;

            `);

            // CONTAS A PAGAR
            const pagar = await pool.request().query(`
                SELECT
                    PR.Id_Lancamento,
                    PR.Data_Vencimento AS Data,
                    F.Nome AS Fornecedor,
                    Cmp.NDocumento AS Documento,
                    PR.Valor,
                    Cmp.Cond_Pagamento
                FROM Tbl_PagRec PR
                INNER JOIN Tbl_Compras Cmp
                        ON Cmp.Cod_Compra = PR.Id_Operacao
                INNER JOIN Tbl_Fornecedores F
                        ON F.Id_Fornecedor = Cmp.Cod_Fornecedor
                WHERE PR.Tipo = 1
                AND PR.Operacao = 1
                ORDER BY PR.Data_Vencimento DESC;
            `);

            return res.json({
                receber: receber.recordset,
                pagar: pagar.recordset
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Erro ao listar PagRec" });
        }
    }
};
