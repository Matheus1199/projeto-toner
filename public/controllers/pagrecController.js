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
                  AND PR.Baixa = 0
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
                    PR.Baixa
                FROM Tbl_PagRec PR
                WHERE PR.Tipo = 2
                  AND PR.Operacao = 2
                  AND PR.Baixa = 0
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
