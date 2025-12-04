module.exports = {
  listar: async (req, res) => {
    const pool = req.app.get("db");

    try {
      // BUSCA TODOS OS A RECEBER (COM LOCACAO CALCULADA)
      const todosReceber = await pool.request().query(`
            SELECT
                PR.Id_Lancamento,
                PR.Data_Vencimento AS Data,
                C.Nome AS Cliente,
                P.NDoc AS Documento,
                PR.Valor,
                P.Cond_Pagamento,
                CASE 
                  WHEN C.Tipo = 4 THEN 1
                  WHEN EXISTS (
                    SELECT 1
                    FROM Tbl_PedidosItens PI
                    INNER JOIN Tbl_Toner T ON PI.Cod_Toner = T.Cod_Produto
                    WHERE PI.Cod_Pedido = P.Cod_Pedido
                      AND T.Locacao = 1
                  ) THEN 1
                  ELSE 0
                END AS Locacao
            FROM Tbl_PagRec PR
            INNER JOIN Tbl_Pedidos P
                    ON P.Cod_Pedido = PR.Id_Operacao
            INNER JOIN Tbl_Clientes C
                    ON C.Id_Cliente = P.Cod_Cliente
            WHERE PR.Tipo = 2
              AND PR.Operacao = 2
              AND PR.Baixa = 0
            ORDER BY PR.Data_Vencimento DESC;
        `);

      // FILTRA NO JS PARA SEPARAR CLARAMENTE
      const receber = todosReceber.recordset.filter((x) => x.Locacao == 0);
      const locacao = todosReceber.recordset.filter((x) => x.Locacao == 1);

      // CONTAS A PAGAR (igual estava)
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
              AND PR.Baixa = 0
            ORDER BY PR.Data_Vencimento DESC;
        `);

      return res.json({
        receber: receber, // somente A RECEBER normal
        locacao: locacao, // somente LOCACAO
        pagar: pagar.recordset,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao listar PagRec" });
    }
  },

  excluir: async (req, res) => {
    const pool = req.app.get("db");
    const { id } = req.params;

    try {
      await pool
        .request()
        .input("id", id)
        .query("DELETE FROM Tbl_PagRec WHERE Id_Lancamento = @id");

      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao excluir lançamento." });
    }
  },

  buscarPorId: async (req, res) => {
    const pool = req.app.get("db");
    const { id } = req.params;

    try {
      const result = await pool.request().input("id", id).query(`
                SELECT *
                FROM Tbl_PagRec
                WHERE Id_Lancamento = @id
            `);

      res.json(result.recordset[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao buscar lançamento." });
    }
  },

  editar: async (req, res) => {
    const pool = req.app.get("db");
    const { id } = req.params;
    const dados = req.body;

    try {
      // ===========================================
      // 1. Atualiza normalmente o lançamento
      // ===========================================
      await pool
        .request()
        .input("id", id)
        .input("data", dados.Data_Vencimento)
        .input("valor", dados.Valor)
        .input("obs", dados.Obs)
        .input("baixa", dados.Baixa)
        .input("valor_baixa", dados.Valor_Baixa)
        .input("data_baixa", dados.Data_Baixa)
        .input("conta", dados.Baixa ? 1 : null) 
        .query(`
      UPDATE Tbl_PagRec
      SET 
          Data_Vencimento = @data,
          Valor = @valor,
          Obs = @obs,
          Baixa = @baixa,
          Valor_Baixa = @valor_baixa,
          Data_Baixa = @data_baixa,
          Conta = @conta
      WHERE Id_Lancamento = @id
  `);


      // ===============================================
      // 1. Movimentar saldo da conta conforme tipo
      // ===============================================
      if (dados.Baixa && dados.Valor_Baixa) {
        const valor = parseFloat(dados.Valor_Baixa);

        // Busca o lançamento para saber o tipo
        const infoLanc = await pool
          .request()
          .input("id", id)
          .query(
            "SELECT Tipo, Id_Operacao FROM Tbl_PagRec WHERE Id_Lancamento = @id"
          );

        const tipoLanc = infoLanc.recordset[0].Tipo;
        const operacaoId = infoLanc.recordset[0].Id_Operacao;

        if (tipoLanc === 2) {

          const pedInfo = await pool.request().input("p", operacaoId).query(`
    SELECT Valor_Total, Custo_Total, Valor_Frete
    FROM Tbl_Pedidos
    WHERE Cod_Pedido = @p
`);

          if (pedInfo.recordset.length > 0) {
            const ped2 = pedInfo.recordset[0];
            const fator2 = valor / ped2.Valor_Total;

            const custoProporcional = ped2.Custo_Total * fator2;
            const freteProporcional = (ped2.Valor_Frete || 0) * fator2;

            const custoTotal = custoProporcional + freteProporcional;

            await pool.request().input("valor", custoTotal).query(`
      UPDATE Tbl_Contas
      SET Saldo = Saldo + @valor
      WHERE Id_Conta = 1
  `);
          }
        } else if (tipoLanc === 1) {
          // A PAGAR → DESCONTA da conta Barsotti (1)
          await pool.request().input("valor", valor).query(`
                UPDATE Tbl_Contas
                SET Saldo = Saldo - @valor
                WHERE Id_Conta = 1
            `);
        }
      }

      // ===========================================
      // 2. Se NÃO foi baixado → termina aqui
      // ===========================================
      if (!dados.Baixa) {
        return res.json({ sucesso: true, msg: "Editado sem baixa." });
      }

      // ===========================================
      // 3. Buscar o lançamento atualizado
      // ===========================================
      const lanc = await pool
        .request()
        .input("id", id)
        .query(`SELECT * FROM Tbl_PagRec WHERE Id_Lancamento = @id`);

      const l = lanc.recordset[0];
      const valorPago = parseFloat(l.Valor_Baixa || 0);

      // Se não há valor pago, não calcula nada
      if (!valorPago || valorPago <= 0) {
        return res.json({ sucesso: true, msg: "Baixa sem valor." });
      }

      // ===========================================
      // 4. Buscar dados do pedido dessa operação
      // ===========================================
      const pedido = await pool.request().input("p", l.Id_Operacao).query(`
                SELECT Valor_Total, Custo_Total, NF, Valor_Frete
                FROM Tbl_Pedidos
                WHERE Cod_Pedido = @p
            `);

      if (pedido.recordset.length === 0) {
        return res.json({
          sucesso: true,
          msg: "Baixa feita, pedido não encontrado.",
        });
      }

      const ped = pedido.recordset[0];

      // ===========================================
      // 5. Cálculos da comissão (LÓGICA OFICIAL)
      // ===========================================
      const fator = valorPago / ped.Valor_Total;

      // custo proporcional
      const custoParcela = ped.Custo_Total * fator;

      // NF Total (variável, não armazenada no banco)
      let nfTotal = 0;
      if (ped.NF === true || ped.NF === 1) {
        nfTotal = ped.Valor_Total * 0.06; // 6%
      }

      // parcela da NF
      const nfParcela = nfTotal * fator;

      // frete proporcional
      const freteParcela = (ped.Valor_Frete || 0) * fator;

      // cálculo do lucro líquido
      const lucroLiquido =
        ped.Valor_Total * fator - custoParcela - nfParcela - freteParcela;

      const metade = lucroLiquido * 0.5;

      const empresa = metade;
      const restante = metade;

      const ana = restante * 0.35;
      const thiago = restante * 0.35;
      const mauricio = restante * 0.3;

      // ===========================================
      // 6. Gerar lançamentos automáticos no PagRec
      // ===========================================
      const lancamentos = [
        { conta: 4, valor: empresa, obs: "Comissão Empresa (Lucro)" },
        { conta: 2, valor: thiago, obs: "Comissão Thiago" },
        { conta: 5, valor: ana, obs: "Comissão Ana" },
        { conta: 3, valor: mauricio, obs: "Comissão Maurício" },
        { conta: 6, valor: nfParcela, obs: "Valor NF (6%)" },
      ];

      for (let lc of lancamentos) {
        // cadastra o lançamento da comissão
        await pool
          .request()
          .input("Tipo", 2)
          .input("Operacao", 3)
          .input("Id_Operacao", l.Id_Operacao)
          .input("Data_Vencimento", new Date())
          .input("Valor", lc.valor)
          .input("Conta", lc.conta)
          .input("Obs", lc.obs)
          .input("Baixa", 1)
          .input("Valor_Baixa", lc.valor)
          .input("Data_Baixa", new Date()).query(`
    INSERT INTO Tbl_PagRec
    (Tipo, Operacao, Id_Operacao, Data_Vencimento, Valor, Conta, Obs, Baixa, Valor_Baixa, Data_Baixa)
    VALUES (@Tipo, @Operacao, @Id_Operacao, @Data_Vencimento, @Valor, @Conta, @Obs, @Baixa, @Valor_Baixa, @Data_Baixa)
  `);

        // Movimenta saldo da conta da comissão
        await pool.request().input("conta", lc.conta).input("valor", lc.valor)
          .query(`
    UPDATE Tbl_Contas
    SET Saldo = Saldo + @valor
    WHERE Id_Conta = @conta
  `);
      }

      // ===========================================
      // 7. Retorno final
      // ===========================================
      res.json({
        sucesso: true,
        fator,
        lucroLiquido,
        empresa,
        ana,
        thiago,
        mauricio,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao editar/baixar." });
    }
  },
};
