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
        const { conta, valor, tipo, obs } = req.body;

        if (!conta || !valor || !tipo)
          return res.status(400).json({ error: "Dados incompletos." });

        if (![1, 2].includes(Number(tipo)))
          return res.status(400).json({ error: "Tipo inválido." });

        try {
          // Converte para número
          const valorNum = parseFloat(valor);

          // 🔵 1) Inserir lançamento em Tbl_PagRec
          const insertPagRec = await pool
            .request()
            .input("Tipo", Number(tipo)) // débito/crédito
            .input("Operacao", 4) // 4 = lançamento manual
            .input("Id_Operacao", null)
            .input("Data_Vencimento", new Date())
            .input("Valor", valorNum)
            .input("EAN", "")
            .input("Conta", conta)
            .input("Valor_Baixa", valorNum)
            .input("Data_Baixa", new Date())
            .input("Obs", obs || "")
            .input("Baixa", 1).query(`
                    INSERT INTO Tbl_PagRec 
                    (Tipo, Operacao, Id_Operacao, Data_Vencimento, Valor, EAN, Conta, Valor_Baixa, Data_Baixa, Obs, Baixa)
                    OUTPUT INSERTED.Id_Lancamento
                    VALUES (@Tipo, @Operacao, @Id_Operacao, @Data_Vencimento, @Valor, @EAN, @Conta, @Valor_Baixa, @Data_Baixa, @Obs, @Baixa)
                `);

          const novoLancamentoId = insertPagRec.recordset[0].Id_Lancamento;

          // 🔵 2) Atualizar saldo da conta
          const operacaoMath = tipo == 2 ? "+" : "-";
          // 2 = crédito (+)
          // 1 = débito (-)

          await pool.request().input("Conta", conta).input("Valor", valorNum)
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
    },

    listarMovimentacoes: async (req, res) => {
    const pool = req.app.get("db");

    // limite padrão = 10
    const limit = parseInt(req.query.limit) || 10;
    const conta = req.query.conta;

    try {
      const request = pool.request().input("limit", limit);

      let query = `
        SELECT TOP (@limit)
            pr.Data_Baixa AS Data,
            c.Nome AS Conta,
            pr.Tipo,
            pr.Operacao,
            pr.Valor_Baixa AS Valor,
            pr.Obs
        FROM Tbl_PagRec pr
        INNER JOIN Tbl_Contas c ON c.Id_Conta = pr.Conta
        WHERE pr.Baixa = 1
    `;

      // filtro opcional
      if (req.query.conta) {
        query += " AND pr.Conta = @Conta";
        request.input("Conta", req.query.conta);
      }

      query += " ORDER BY pr.Data_Baixa DESC";

      const result = await request.query(query);

      res.json(result.recordset);
    } catch (err) {
      console.error("Erro ao listar movimentações:", err);
      res.status(500).json({ erro: "Erro ao listar movimentações" });
    }
}
};