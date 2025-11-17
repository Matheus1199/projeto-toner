module.exports = {
    lancar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const {
            Id_Operacao,
            Data_Vencimento,
            Valor,
            EAN,
            Obs,
            Tipo,
            Operacao,
            Conta,
            Baixa
        } = req.body;

        if (!Id_Operacao || !Data_Vencimento || !Valor)
            return res.status(400).json({ error: "Dados incompletos para lançamento." });

        try {
            await pool.request()
                .input("Tipo", sql.Int, Tipo)
                .input("Operacao", sql.Int, Operacao)
                .input("Id_Operacao", sql.Int, Id_Operacao)
                .input("Data_Vencimento", sql.Date, Data_Vencimento)
                .input("Valor", sql.Decimal(18, 2), Valor)
                .input("EAN", sql.VarChar(100), EAN || "")
                .input("Conta", sql.Int, Conta || 1)
                .input("Valor_Baixa", sql.Decimal(18, 2), 0)
                .input("Data_Baixa", sql.Date, null)
                .input("Obs", sql.VarChar(255), Obs || "")
                .input("Baixa", sql.Bit, Baixa)
                .query(`
                    INSERT INTO Tbl_PagRec
                    (Tipo, Operacao, Id_Operacao, Data_Vencimento, Valor, EAN, Conta, Valor_Baixa, Data_Baixa, Obs, Baixa)
                    VALUES
                    (@Tipo, @Operacao, @Id_Operacao, @Data_Vencimento, @Valor, @EAN, @Conta, @Valor_Baixa, @Data_Baixa, @Obs, @Baixa)
                `);

            res.json({ message: "Título lançado com sucesso!" });

        } catch (error) {
            console.error("Erro ao lançar título:", error);
            res.status(500).json({ error: "Erro ao lançar título." });
        }
    },

    pendentes: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT
                    P.Id_Lancamento,
                    P.Operacao AS Id_Operacao,
                    F.Nome AS Fornecedor,
                    P.Data_Vencimento,
                    P.Valor
                FROM Tbl_PagRec P
                LEFT JOIN Tbl_Compras C ON C.Cod_Compra = P.Operacao
                LEFT JOIN Tbl_Fornecedores F ON F.Id_Fornecedor = C.Cod_Fornecedor
                WHERE P.Baixa = 0
                ORDER BY P.Data_Vencimento ASC
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao listar pendentes:", err);
            res.status(500).json({ error: "Erro ao buscar pendentes" });
        }
    },

    listar: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT 
                    Id_Lancamento,
                    Tipo,
                    Operacao,
                    Data_Vencimento,
                    Valor,
                    Baixa,
                    Obs
                FROM Tbl_PagRec
                ORDER BY Data_Vencimento ASC
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao listar lançamentos:", err);
            res.status(500).json({ error: "Erro ao listar lançamentos" });
        }
    },

    salvar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const {
            Id_Lancamento,
            Tipo,
            Operacao,
            Valor,
            Data_Vencimento,
            Obs
        } = req.body;

        try {
            if (!Id_Lancamento) {
                await pool.request()
                    .input("Tipo", sql.Int, Tipo)
                    .input("Operacao", sql.Int, Operacao)
                    .input("Valor", sql.Decimal(18,2), Valor)
                    .input("Data_Vencimento", sql.Date, Data_Vencimento)
                    .input("Obs", sql.VarChar(255), Obs || null)
                    .query(`
                        INSERT INTO Tbl_PagRec 
                        (Tipo, Operacao, Valor, Data_Vencimento, Obs, Baixa)
                        VALUES 
                        (@Tipo, @Operacao, @Valor, @Data_Vencimento, @Obs, 0)
                    `);

            } else {
                await pool.request()
                    .input("Id", sql.Int, Id_Lancamento)
                    .input("Tipo", sql.Int, Tipo)
                    .input("Operacao", sql.Int, Operacao)
                    .input("Valor", sql.Decimal(18,2), Valor)
                    .input("Data_Vencimento", sql.Date, Data_Vencimento)
                    .input("Obs", sql.VarChar(255), Obs || null)
                    .query(`
                        UPDATE Tbl_PagRec
                        SET Tipo = @Tipo,
                            Operacao = @Operacao,
                            Valor = @Valor,
                            Data_Vencimento = @Data_Vencimento,
                            Obs = @Obs
                        WHERE Id_Lancamento = @Id
                    `);
            }

            res.json({ success: true });

        } catch (err) {
            console.error("Erro ao salvar lançamento:", err);
            res.status(500).json({ error: "Erro ao salvar lançamento" });
        }
    },

    buscar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { id } = req.params;

        try {
            const result = await pool.request()
                .input("Id", sql.Int, id)
                .query(`
                    SELECT 
                        Id_Lancamento,
                        Tipo,
                        Operacao,
                        Valor,
                        Data_Vencimento,
                        Baixa,
                        Obs
                    FROM Tbl_PagRec
                    WHERE Id_Lancamento = @Id
                `);

            if (result.recordset.length === 0)
                return res.status(404).json({ error: "Lançamento não encontrado" });

            res.json(result.recordset[0]);

        } catch (err) {
            console.error("Erro ao buscar lançamento:", err);
            res.status(500).json({ error: "Erro ao buscar lançamento" });
        }
    },

    excluir: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { id } = req.params;

        try {
            await pool.request()
                .input("Id", sql.Int, id)
                .query(`
                    DELETE FROM Tbl_PagRec
                    WHERE Id_Lancamento = @Id
                `);

            res.json({ success: true });

        } catch (err) {
            console.error("Erro ao excluir lançamento:", err);
            res.status(500).json({ error: "Erro ao excluir lançamento" });
        }
    }
};
