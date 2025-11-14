// ==============================
// clientes.js - TonerStock
// ==============================
document.addEventListener("DOMContentLoaded", () => {

    const inputPesquisa = document.getElementById("pesquisaCliente");
    const resultadoDiv = document.getElementById("resultado");
    const tabelaCompras = document.getElementById("tabelaCompras");

    let timeout = null;

    // Evento de pesquisa
    inputPesquisa.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => buscarCliente(inputPesquisa.value), 400);
    });

    // ============================
    // 🔍 Buscar Cliente
    // ============================
    async function buscarCliente(nome) {

        if (!nome.trim()) {
            resultadoDiv.classList.add("hidden");
            tabelaCompras.innerHTML = "";
            return;
        }

        try {
            const res = await fetch(`/clientes/pesquisar?nome=${encodeURIComponent(nome)}`);
            const data = await res.json();

            if (data.error) {
                resultadoDiv.classList.remove("hidden");
                resultadoDiv.innerHTML = `<p class="text-red-600">${data.error}</p>`;
                return;
            }

            const cliente = data.cliente;
            const compras = data.compras;

            resultadoDiv.classList.remove("hidden");

            // Preenche informações do cliente
            document.getElementById("nomeCliente").textContent = cliente.Nome;
            document.getElementById("statusCliente").textContent = cliente.Ativo ? "Ativo" : "Inativo";

            // Canal de aquisição
            const canais = {
                1: "Barsotti",
                6: "Whatsapp",
                7: "Google"
            };

            document.getElementById("vendedorCliente").textContent =
                canais[cliente.Id_vendedor] || "Desconhecido";

            // Limpa tabela antes de preencher
            tabelaCompras.innerHTML = "";

            // Preencher as últimas 5 compras
            for (const compra of compras) {
                const itens = await buscarItensPedido(compra.Cod_Pedido);

                // Cabeçalho da compra
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="py-3 border-b font-medium text-center">${new Date(compra.Data).toLocaleDateString()}</td>
                    <td class="py-3 border-b font-medium text-center">#${compra.Cod_Pedido}</td>
                    <td class="py-3 border-b font-medium text-center">${compra.QuantidadeTotal}</td>
                    <td class="py-3 border-b font-medium text-green-700 text-center">R$ ${compra.Valor_Total.toFixed(2)}</td>
                `;
                tabelaCompras.appendChild(tr);

                // Itens do pedido
                itens.forEach(item => {
                    const trItem = document.createElement("tr");
                    trItem.innerHTML = `
                        <td class="py-2 pl-6 text-gray-600 text-center">↳ ${item.Marca} - ${item.Modelo} (${item.Tipo})</td>
                        <td class="py-2 text-gray-600 text-center">Qtd: ${item.Quantidade}</td>
                        <td></td>
                        <td></td>
                    `;
                    tabelaCompras.appendChild(trItem);
                });

            }

        } catch (err) {
            console.error("Erro ao buscar cliente:", err);
        }
    }

    // ============================
    // 📦 Buscar itens de um pedido
    // ============================
    async function buscarItensPedido(codPedido) {
        try {
            const res = await fetch(`/pedidos/${codPedido}/itens`);
            if (!res.ok) return [];

            return await res.json();
        } catch (err) {
            console.error("Erro ao buscar itens:", err);
            return [];
        }
    }

});
