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
                ORDER BY C.Cod_Compra DESC
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

    let {
      Cod_Fornecedor,
      NDocumento,
      Cond_Pagamento,
      Obs,
      carrinho,
      financeiro,
      semFinanceiro,
      RMA,
    } = req.body;

    // =========================
    // CÁLCULOS
    // =========================

    const totalItens = carrinho.reduce(
      (sum, item) => sum + item.valor_compra * item.quantidade,
      0,
    );

    const totalFin = financeiro.reduce((sum, f) => sum + Number(f.valor), 0);

    const valorRMA = parseFloat(RMA) || 0;

    if (!carrinho || !carrinho.length) {
      return res.status(400).json({
        error: "Adicione ao menos um item.",
      });
    }

    if (!semFinanceiro) {
      if (!financeiro || !financeiro.length) {
        return res.status(400).json({
          error:
            "Você precisa lançar ao menos um título financeiro ou ativar 'Lançar sem Financeiro'.",
        });
      }

      const totalComparacao = totalFin + valorRMA;
      

      if (
        Number(totalItens.toFixed(2)) !== Number(totalComparacao.toFixed(2))
      ) {
        return res.status(400).json({
          error:
            "O valor financeiro + RMA não confere com o valor total da compra.",
        });
      }
    }

    // =========================
    // TRANSAÇÃO SQL
    // =========================

    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();
      const request = new sql.Request(transaction);

      // 1) Inserir compra principal
      const compraResult = await request
        .input("Data_Compra", sql.DateTime, new Date())
        .input("Cod_Fornecedor", sql.Int, Cod_Fornecedor)
        .input("NDocumento", sql.VarChar(50), NDocumento)
        .input("Valor_Total", sql.Decimal(18, 2), totalItens)
        .input("Cond_Pagamento", sql.VarChar(50), Cond_Pagamento)
        .input("Obs", sql.VarChar(255), Obs).query(`
                INSERT INTO Tbl_Compras 
                (Data_Compra, Cod_Fornecedor, NDocumento, Valor_Total, Cond_Pagamento, Obs)
                OUTPUT INSERTED.Cod_Compra
                VALUES (@Data_Compra, @Cod_Fornecedor, @NDocumento, @Valor_Total, @Cond_Pagamento, @Obs)
            `);

      const Cod_Compra = compraResult.recordset[0].Cod_Compra;

      // 2) Inserir itens
      for (const item of carrinho) {
        await new sql.Request(transaction)
          .input("Cod_Compra", sql.Int, Cod_Compra)
          .input("Cod_Toner", sql.Int, item.cod_toner)
          .input("Quantidade", sql.Int, item.quantidade)
          .input("Valor_Compra", sql.Decimal(18, 2), item.valor_compra)
          .input("Saldo", sql.Int, item.quantidade).query(`
                    INSERT INTO Tbl_ComprasItens 
                    (Cod_Compra, Cod_Toner, Quantidade, Valor_Compra, Saldo)
                    VALUES 
                    (@Cod_Compra, @Cod_Toner, @Quantidade, @Valor_Compra, @Saldo)
                `);
      }

      // 3) Inserir financeiro (somente se não for semFinanceiro)
      if (!semFinanceiro) {
        for (const fin of financeiro) {
          await new sql.Request(transaction)
            .input("Tipo", sql.Int, 1)
            .input("Operacao", sql.Int, 1)
            .input("Id_Operacao", sql.Int, Cod_Compra)
            .input("Data_Vencimento", sql.DateTime, new Date(fin.vencimento))
            .input("Valor", sql.Decimal(18, 2), fin.valor)
            .input("EAN", sql.VarChar(100), fin.ean || null)
            .input("Conta", sql.Int, fin.conta || null)
            .input("Valor_Baixa", sql.Decimal(18, 2), null)
            .input("Data_Baixa", sql.DateTime, null)
            .input("Obs", sql.VarChar(255), fin.obs || null)
            .input("Baixa", sql.Bit, 0).query(`
                        INSERT INTO Tbl_PagRec
                        (Tipo, Operacao, Id_Operacao, Data_Vencimento, Valor, EAN, Conta, Valor_Baixa, Data_Baixa, Obs, Baixa)
                        VALUES
                        (@Tipo, @Operacao, @Id_Operacao, @Data_Vencimento, @Valor, @EAN, @Conta, @Valor_Baixa, @Data_Baixa, @Obs, @Baixa)
                    `);
        }
      }

      await transaction.commit();

      // Retornar dados para o front
      const dadosCompra = await pool
        .request()
        .input("Cod_Compra", sql.Int, Cod_Compra).query(`
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
      await transaction.rollback();
      res.status(500).json({ error: "Erro ao finalizar compra." });
    }
  },

  buscarPorCodigo: async (req, res) => {
    const pool = req.app.get("db");
    const sql = req.app.get("sql");

    const { codCompra } = req.params;

    try {
      // =========================
      // DADOS DA COMPRA
      // =========================
      const compraResult = await pool
        .request()
        .input("Cod_Compra", sql.Int, codCompra).query(`
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

      if (compraResult.recordset.length === 0) {
        return res.status(404).json({ error: "Compra não encontrada." });
      }

      // =========================
      // ITENS DA COMPRA
      // =========================
      const itensResult = await pool
        .request()
        .input("Cod_Compra", sql.Int, codCompra).query(`
        SELECT 
            CI.Id_ItemCompra,
            T.Marca,
            T.Modelo,
            T.Tipo,
            CI.Quantidade,
            CI.Valor_Compra,
            (CI.Quantidade * CI.Valor_Compra) AS Subtotal
        FROM Tbl_ComprasItens CI
        INNER JOIN Tbl_Toner T ON T.Cod_Produto = CI.Cod_Toner
        WHERE CI.Cod_Compra = @Cod_Compra
      `);

      const totalCalculado = itensResult.recordset.reduce(
        (sum, item) => sum + Number(item.Subtotal),
        0,
      );

      res.json({
        compra: compraResult.recordset[0],
        itens: itensResult.recordset,
        total: Number(totalCalculado.toFixed(2)),
      });
    } catch (error) {
      console.error("Erro ao buscar compra:", error);
      res.status(500).json({ error: "Erro ao buscar compra." });
    }
  },
};
