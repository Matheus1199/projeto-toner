async function carregarDashboard() {
    try {
        const res = await fetch("/dashboard");
        if (!res.ok) throw new Error("Resposta inválida do servidor");
        const data = await res.json();

        // Valores numéricos
        const totalEstoque = Number(data.totalEstoque || 0);
        const totalModelos = Number(data.totalModelos || 0);
        const valorEstoque = Number(data.valorEstoque || 0);
        const vendasMes = Number(data.vendasMes || 0);
        const qtdVendasMes = Number(data.qtdVendasMes || 0);
        const vendasTotais = Number(data.vendasTotais || 0);
        const alertasEstoque = Number(data.alertasEstoque || 0);
        const totalClientes = Number(data.totalClientes || 0);
        const totalFornecedores = Number(data.totalFornecedores || 0);

        // Atualiza DOM (verifique se os ids existem no HTML)
        const maybeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        maybeSetText('totalEstoqueValue', totalEstoque);
        maybeSetText('totalModelos', `${totalModelos} modelos`);
        maybeSetText('valorEstoqueValue', `R$ ${valorEstoque.toFixed(2)}`);
        maybeSetText('vendasMesValue', `R$ ${vendasMes.toFixed(2)}`);
        maybeSetText('qtdVendasMes', `${qtdVendasMes} vendas`);
        maybeSetText('alertasEstoqueValue', alertasEstoque);
        maybeSetText('totalClientes', totalClientes);
        maybeSetText('totalFornecedores', totalFornecedores);
        maybeSetText('vendasTotaisValue', `R$ ${vendasTotais.toFixed(2)}`);

        // opcional: formatar milhares (pt-BR)
        const fmt = (n) => n.toLocaleString('pt-BR');

        // Se preferir com formatação local:
        // maybeSetText('totalEstoqueValue', fmt(totalEstoque));
        // maybeSetText('totalModelos', `${fmt(totalModelos)} modelos`);
        // maybeSetText('valorEstoqueValue', `R$ ${valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

// Executa ao carregar e a cada 30s
carregarDashboard();
setInterval(carregarDashboard, 30000);

// Logout
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    });
}