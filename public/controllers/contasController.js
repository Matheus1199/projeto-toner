module.exports = {
    listar: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT 
                    Id_Conta,
                    Nome,
                    Saldo,
                    Empresa,
                    Ativo,
                    Dt_Atualizacao
                FROM Tbl_Contas
                ORDER BY Nome ASC
            `);

            return res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao listar contas:", err);
            return res.status(500).json({ error: "Erro ao listar contas." });
        }
    },

    lancar: async (req, res) => {
        const pool = req.app.get("db");
        const { conta, valor, operacao, obs } = req.body;

        if (!conta || !valor || !operacao)
            return res.status(400).json({ error: "Dados incompletos para lançar operação." });

        try {
            // Converte para número
            const valorNum = parseFloat(valor);

            // 🔵 1) Inserir lançamento em Tbl_PagRec
            const insertPagRec = await pool.request()
                .input("Tipo", 3) // 3 = Lançamento manual (definido por nós)
                .input("Operacao", operacao) // 1 = Crédito | 2 = Débito
                .input("Id_Operacao", null)
                .input("Data_Vencimento", new Date())
                .input("Valor", valorNum)
                .input("EAN", "")
                .input("Conta", conta)
                .input("Valor_Baixa", valorNum)
                .input("Data_Baixa", new Date())
                .input("Obs", obs || "")
                .input("Baixa", 1)
                .query(`
                    INSERT INTO Tbl_PagRec 
                    (Tipo, Operacao, Id_Operacao, Data_Vencimento, Valor, EAN, Conta, Valor_Baixa, Data_Baixa, Obs, Baixa)
                    OUTPUT INSERTED.Id_Lancamento
                    VALUES (@Tipo, @Operacao, @Id_Operacao, @Data_Vencimento, @Valor, @EAN, @Conta, @Valor_Baixa, @Data_Baixa, @Obs, @Baixa)
                `);

            const novoLancamentoId = insertPagRec.recordset[0].Id_Lancamento;

            // 🔵 2) Atualizar saldo da conta
            const operacaoMath = operacao == 1 ? "+" : "-"; // 1=Crédito | 2=Débito

            await pool.request()
                .input("Conta", conta)
                .input("Valor", valorNum)
                .query(`
                    UPDATE Tbl_Contas
                    SET Saldo = Saldo ${operacaoMath} @Valor,
                        Dt_Atualizacao = GETDATE(),
                        Id_Lancamento = ${novoLancamentoId}
                    WHERE Id_Conta = @Conta
                `);

            return res.json({ message: "Lançamento registrado com sucesso!" });

        } catch (err) {
            console.error("Erro ao lançar operação manual:", err);
            return res.status(500).json({ error: "Erro ao lançar operação manual." });
        }
    },

    soma: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    try {
        const result = await pool.request()
            .query("SELECT SUM(Saldo) AS TotalSaldo FROM Tbl_Contas WHERE Ativo = 1");

        res.json({ total: result.recordset[0].TotalSaldo || 0 });
    } catch (err) {
        console.error("Erro ao somar saldos:", err);
        res.status(500).send("Erro ao somar saldos");
        }
    }
};