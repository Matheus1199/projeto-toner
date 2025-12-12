// ==============================
// CONTAGEM CONTROLLER – TonerStock
// ==============================

module.exports = {
  // ---------------------------------------
  // 2) SALVAR CONTAGEM DO DIA
  // POST /api/contagem/salvar
  // ---------------------------------------
  salvar: async (req, res) => {
    const pool = req.app.get("db");

    try {
      // DADOS DO REQUEST
      const usuario = req.session.usuario || "Desconhecido";
      const obsGeral = req.body.obs_geral || null;
      const itens = req.body.itens || [];

      // DATA DO DIA (formato: YYYY-MM-DD)
      const hoje = new Date().toISOString().split("T")[0];

      // ---------------------------------------
      // 2.1) VERIFICAR SE JÁ EXISTE CONTAGEM HOJE
      // ---------------------------------------
      const contagemExistente = await pool.request().input("nome", hoje).query(`
                    SELECT Id_Contagem 
                    FROM Tbl_ContagemEstoque 
                    WHERE NomeContagem = @nome
                `);

      // Se existir → DELETAR antes (opção escolhida)
      if (contagemExistente.recordset.length > 0) {
        const id = contagemExistente.recordset[0].Id_Contagem;

        await pool.request().input("id", id).query(`
                        DELETE FROM Tbl_ContagemItens WHERE Id_Contagem = @id;
                        DELETE FROM Tbl_ContagemEstoque WHERE Id_Contagem = @id;
                    `);
      }

      // ---------------------------------------
      // 2.2) INSERIR CABEÇALHO DA CONTAGEM
      // ---------------------------------------
      const insertContagem = await pool
        .request()
        .input("nome", hoje)
        .input("usuario", usuario)
        .input("obsGeral", obsGeral).query(`
                    INSERT INTO Tbl_ContagemEstoque (NomeContagem, Usuario, ObsGeral)
                    VALUES (@nome, @usuario, @obsGeral);

                    SELECT SCOPE_IDENTITY() AS Id_Contagem;
                `);

      const idContagem = insertContagem.recordset[0].Id_Contagem;

      // ---------------------------------------
      // 2.3) INSERIR ITENS DA CONTAGEM
      // ---------------------------------------
      for (const item of itens) {
        await pool
          .request()
          .input("contagem", idContagem)
          .input("cod", item.cod_toner)
          .input("saldo", item.saldo_sistema)
          .input("fisico", item.estoque_fisico)
          .input("obs", item.obs || null).query(`
                        INSERT INTO Tbl_ContagemItens
                        (Id_Contagem, Cod_Toner, SaldoSistema, EstoqueFisico, Obs)
                        VALUES (@contagem, @cod, @saldo, @fisico, @obs)
                    `);
      }

      // ---------------------------------------
      // 2.4) RETORNO PARA O FRONT-END
      // ---------------------------------------
      return res.json({
        erro: false,
        mensagem: "Contagem registrada com sucesso!",
        idContagem,
      });
    } catch (e) {
      console.error("ERRO AO SALVAR CONTAGEM:", e);
      return res.status(500).json({
        erro: true,
        mensagem: "Erro ao salvar contagem.",
      });
    }
  },
};
