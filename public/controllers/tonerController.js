module.exports = {
    cadastrar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { modelo, marca, tipo, locacao } = req.body;

        try {
            await pool.request()
                .input("modelo", sql.VarChar(50), modelo)
                .input("marca", sql.VarChar(50), marca)
                .input("tipo", sql.VarChar(50), tipo)
                .input("locacao", sql.Bit, locacao)
                .query(`
                    INSERT INTO Tbl_Toner (Modelo, Marca, Tipo, Locacao)
                    VALUES (@modelo, @marca, @tipo, @locacao)
                `);

            res.status(201).json({ message: "Toner cadastrado com sucesso!" });

        } catch (error) {
            console.error("Erro ao cadastrar toner:", error);
            res.status(500).json({ error: "Erro ao cadastrar toner" });
        }
    },

    pesquisar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { termo, tipo } = req.query;

        if (!termo || termo.trim() === "") {
            return res.status(400).json({ error: "Informe um termo para pesquisa." });
        }

        if (!["modelo", "marca", "tipo"].includes(tipo)) {
            return res.status(400).json({ error: "Tipo de pesquisa inválido." });
        }

        try {
            if (tipo === "modelo") {
                const result = await pool.request()
                    .input("termo", sql.VarChar(100), `%${termo}%`)
                    .query(`
                        SELECT TOP 1
                            T.Cod_Produto,
                            T.Modelo,
                            T.Marca,
                            T.Tipo,
                            ISNULL(SUM(CI.Saldo), 0) AS Estoque
                        FROM Tbl_Toner T
                        LEFT JOIN Tbl_ComprasItens CI ON T.Cod_Produto = CI.Cod_Toner
                        WHERE T.Modelo LIKE @termo
                        GROUP BY T.Cod_Produto, T.Modelo, T.Marca, T.Tipo
                    `);

                if (result.recordset.length === 0)
                    return res.status(404).json({ error: "Toner não encontrado." });

                const toner = result.recordset[0];

                const vendas = await pool.request()
                    .input("cod", sql.Int, toner.Cod_Produto)
                    .query(`
                        SELECT TOP 5
                            P.Data AS Data_Venda,
                            C.Nome AS Cliente,
                            I.Quantidade,
                            I.Valor_Venda
                        FROM Tbl_PedidosItens I
                        JOIN Tbl_Pedidos P ON I.Cod_Pedido = P.Cod_Pedido
                        JOIN Tbl_Clientes C ON I.Cod_Cliente = C.Id_Cliente
                        WHERE I.Cod_Toner = @cod
                        ORDER BY P.Data DESC
                    `);

                return res.json({
                    tipo: "modelo",
                    toner: {
                        modelo: toner.Modelo,
                        marca: toner.Marca,
                        tipo: toner.Tipo,
                        estoque: toner.Estoque
                    },
                    vendas: vendas.recordset
                })};

            const campo = tipo === "marca" ? "T.Marca" : "T.Tipo";

            const result = await pool.request()
                .input("termo", sql.VarChar(100), `%${termo}%`)
                .query(`
                    SELECT 
                        T.Cod_Produto,
                        T.Modelo,
                        T.Marca,
                        T.Tipo,
                        ISNULL(SUM(CI.Saldo), 0) AS Estoque
                    FROM Tbl_Toner T
                    LEFT JOIN Tbl_ComprasItens CI ON T.Cod_Produto = CI.Cod_Toner
                    WHERE ${campo} LIKE @termo
                    GROUP BY T.Cod_Produto, T.Modelo, T.Marca, T.Tipo
                    ORDER BY T.Modelo
                `);

            return res.json({ tipo, toners: result.recordset });

        } catch (error) {
            console.error("Erro ao pesquisar toner:", error);
            res.status(500).json({ error: "Erro ao pesquisar toner." });
        }
    },

    listar: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT Cod_Produto, Marca, Modelo, Tipo
                FROM Tbl_Toner
                ORDER BY Marca, Modelo
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao buscar toner:", err);
            res.status(500).json({ error: "Erro ao buscar toners." });
        }
    },

    editar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { Cod_Produto } = req.params;
        const { modelo, marca, tipo, locacao } = req.body;

        try {
            const result = await pool.request()
                .input("Cod_Produto", sql.Int, Cod_Produto)
                .input("modelo", sql.VarChar(50), modelo)
                .input("marca", sql.VarChar(50), marca)
                .input("tipo", sql.VarChar(50), tipo)
                .input("locacao", sql.Bit, locacao)
                .query(`
                    UPDATE Tbl_Toner
                    SET Modelo = @modelo,
                        Marca = @marca,
                        Tipo = @tipo,
                        Locacao = @locacao
                    WHERE Cod_Produto = @Cod_Produto
                `);

            if (result.rowsAffected[0] === 0)
                return res.status(404).json({ error: "Toner não encontrado." });

            res.json({ message: "Toner atualizado com sucesso!" });

        } catch (error) {
            console.error("Erro ao atualizar toner:", error);
            res.status(500).json({ error: "Erro ao atualizar toner" });
        }
    },

    excluir: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { Cod_Produto } = req.params;

        try {
            const result = await pool.request()
                .input("Cod_Produto", sql.Int, Cod_Produto)
                .query(`DELETE FROM Tbl_Toner WHERE Cod_Produto = @Cod_Produto`);

            if (result.rowsAffected[0] === 0)
                return res.status(404).json({ error: "Toner não encontrado." });

            res.json({ message: "Toner excluído com sucesso!" });

        } catch (error) {
            console.error("Erro ao excluir toner:", error);
            res.status(500).json({ error: "Erro ao excluir toner" });
        }
    }
};
