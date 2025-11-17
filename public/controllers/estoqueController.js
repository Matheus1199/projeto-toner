module.exports = {
    disponivel: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT 
                    CI.Id_ItemCompra,
                    T.Cod_Produto,
                    T.Marca,
                    T.Modelo,
                    T.Tipo,
                    F.Nome AS Fornecedor,
                    CI.Valor_Compra,
                    CI.Saldo,
                    C.Cod_Compra,
                    C.NDocumento
                FROM Tbl_ComprasItens CI
                INNER JOIN Tbl_Toner T ON CI.Cod_Toner = T.Cod_Produto
                LEFT JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
                LEFT JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
                WHERE CI.Saldo > 0
                ORDER BY T.Marca, T.Modelo
            `);

            res.json(result.recordset);

        } catch (error) {
            console.error("Erro ao buscar estoque disponível:", error);
            res.status(500).json({ error: "Erro ao buscar estoque disponível." });
        }
    },

    buscar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { termo } = req.query;

        if (!termo || termo.trim() === "")
            return res.status(400).json({ error: "Informe um modelo para pesquisar." });

        try {
            const result = await pool.request()
                .input("termo", sql.VarChar(100), `%${termo}%`)
                .query(`
                    SELECT 
                        CI.Id_ItemCompra,
                        CI.Cod_Toner,
                        CI.Saldo,
                        CI.Valor_Compra,
                        T.Modelo,
                        T.Marca,
                        T.Tipo,
                        C.Cod_Compra,
                        F.Nome AS Fornecedor
                    FROM Tbl_ComprasItens CI
                    JOIN Tbl_Toner T ON CI.Cod_Toner = T.Cod_Produto
                    JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
                    JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
                    WHERE T.Modelo LIKE @termo AND CI.Saldo > 0
                    ORDER BY T.Modelo ASC, CI.Id_ItemCompra ASC
                `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao buscar estoque:", err);
            res.status(500).json({ error: "Erro ao buscar estoque." });
        }
    }
};
