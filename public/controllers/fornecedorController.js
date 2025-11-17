module.exports = {
    listarTudo: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT * FROM Tbl_Fornecedores
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao buscar fornecedores:", err);
            res.status(500).json({ error: "Erro ao buscar fornecedores" });
        }
    },

    listarSimples: async (req, res) => {
        const pool = req.app.get("db");

        try {
            const result = await pool.request().query(`
                SELECT Id_Fornecedor, Nome, Status 
                FROM Tbl_Fornecedores
            `);

            res.json(result.recordset);

        } catch (err) {
            console.error("Erro ao buscar fornecedor:", err);
            res.status(500).json({ error: "Erro ao buscar fornecedores" });
        }
    },

    buscarPorId: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");
        const { id } = req.params;

        try {
            const result = await pool.request()
                .input("id", sql.Int, id)
                .query(`
                    SELECT * FROM Tbl_Fornecedores 
                    WHERE Id_Fornecedor = @id
                `);

            res.json(result.recordset[0]);

        } catch (err) {
            console.error("Erro ao buscar fornecedor:", err);
            res.status(500).json({ error: "Erro ao buscar fornecedor" });
        }
    },

    cadastrar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { nome, status } = req.body;

        try {
            await pool.request()
                .input("nome", sql.VarChar, nome)
                .input("status", sql.Bit, status)
                .query(`
                    INSERT INTO Tbl_Fornecedores (Nome, Status) 
                    VALUES (@nome, @status)
                `);

            res.json({ message: "Fornecedor cadastrado!" });

        } catch (err) {
            console.error("Erro ao inserir fornecedor:", err);
            res.status(500).json({ error: "Erro ao inserir fornecedor" });
        }
    },

    editar: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { id } = req.params;
        const { nome, status } = req.body;

        try {
            await pool.request()
                .input("id", sql.Int, id)
                .input("nome", sql.VarChar, nome)
                .input("status", sql.Bit, status)
                .query(`
                    UPDATE Tbl_Fornecedores 
                    SET Nome = @nome, Status = @status 
                    WHERE Id_Fornecedor = @id
                `);

            res.json({ message: "Fornecedor atualizado!" });

        } catch (err) {
            console.error("Erro ao atualizar fornecedor:", err);
            res.status(500).json({ error: "Erro ao atualizar fornecedor" });
        }
    },

    excluir: async (req, res) => {
        const pool = req.app.get("db");
        const sql = req.app.get("sql");

        const { id } = req.params;

        try {
            await pool.request()
                .input("id", sql.Int, id)
                .query(`
                    DELETE FROM Tbl_Fornecedores 
                    WHERE Id_Fornecedor = @id
                `);

            res.json({ message: "Fornecedor excluído!" });

        } catch (err) {
            console.error("Erro ao excluir fornecedor:", err);
            res.status(500).json({ error: "Erro ao excluir fornecedor" });
        }
    }
};
