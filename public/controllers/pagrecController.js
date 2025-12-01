module.exports = {
    listar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        try {
            // CONTAS A RECEBER
            const receber = await pool.request().query(`
                SELECT
                    PR.Id_Lancamento,
                    PR.Data_Vencimento,
                    PR.Valor,
                    PR.Obs,
                    PR.EAN,
                    PR.Conta,
                    PR.Valor_Baixa,
                    PR.Data_Baixa,
                    PR.Baixa
                FROM Tbl_PagRec PR
                WHERE PR.Tipo = 1
                  AND PR.Operacao = 1
                ORDER BY PR.Data_Vencimento DESC;
            `);

            // CONTAS A PAGAR
            const pagar = await pool.request().query(`
                SELECT
                    PR.Id_Lancamento,
                    PR.Data_Vencimento,
                    PR.Valor,
                    PR.Obs,
                    PR.EAN,
                    PR.Conta,
                    PR.Valor_Baixa,
                    PR.Data_Baixa,
                    PR.Baixa,
                    Cmp.Cod_Compra,
                    Cmp.Data_Compra,
                    Cmp.NDocumento,
                    Cmp.Valor_Total AS Valor_Compra,
                    F.Nome AS Fornecedor
                FROM Tbl_PagRec PR
                INNER JOIN Tbl_Compras Cmp 
                        ON Cmp.Cod_Compra = PR.Id_Operacao
                INNER JOIN Tbl_Fornecedores F
                        ON F.Id_Fornecedor = Cmp.Cod_Fornecedor
                WHERE PR.Tipo = 2
                  AND PR.Operacao = 2
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
