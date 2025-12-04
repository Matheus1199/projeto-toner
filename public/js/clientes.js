// ==============================
// clientes.js - TonerStock
// ==============================
document.addEventListener("DOMContentLoaded", () => {

    const inputPesquisa = document.getElementById("pesquisaCliente");
    const resultadoDiv = document.getElementById("resultado");
    const tabelaCompras = document.getElementById("tabelaCompras");

    let timeout = null;

    // ============================
    // 🟦 Evento de pesquisa
    // ============================
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
              const listaToners =
                compra.itens && compra.itens.length > 0
                  ? compra.itens
                      .map(
                        (i) =>
                          `${i.Modelo} (${i.Quantidade} un • R$ ${Number(
                            i.Valor_Venda
                          ).toFixed(2)})`
                      )
                      .join("<br>")
                  : "-";

              const tr = document.createElement("tr");
              tr.innerHTML = `
        <td class="py-3 border-b font-medium text-center">${new Date(
          compra.Data
        ).toLocaleDateString()}</td>
        <td class="py-3 border-b font-medium text-center">#${
          compra.Cod_Pedido
        }</td>
        <td class="py-3 border-b font-medium text-center">${
          compra.QuantidadeTotal
        }</td>
        <td class="py-3 border-b font-medium text-green-700 text-center">R$ ${compra.Valor_Total.toFixed(
          2
        )}</td>
        <td class="py-3 border-b text-center text-gray-700">${listaToners}</td>
    `;
              tabelaCompras.appendChild(tr);

              // ==========================
              // Exibir histórico em blocos
              // ==========================
              const blocos = document.getElementById("blocosHistorico");
              blocos.innerHTML = "";

              data.historico.forEach((item) => {
                const div = document.createElement("div");
                div.className =
                  "p-4 rounded-lg shadow-md bg-gray-100 text-center border hover:bg-gray-200 transition";

                div.innerHTML = `
        <p class="font-bold text-gray-800 text-sm leading-tight">${item.Modelo}</p>
        <p class="text-xl font-semibold text-blue-700 mt-1">${item.QuantidadeTotal}</p>
    `;

                blocos.appendChild(div);
              });
            }

        } catch (err) {
            console.error("Erro ao buscar cliente:", err);
        }
    }


    // ===============================
    // 🎯 Abrir e Fechar Modal Cliente
    // ===============================
    const btnNovoCliente = document.getElementById("btnNovoCliente");
    const modal = document.getElementById("modal-bg");

    // Abrir modal
    btnNovoCliente.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    // Fechar modal (função usada no HTML)
    window.fecharModal = () => {
        modal.classList.add("hidden");
    };

    // Fechar clicando fora
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });

    // ===============================
    // 💾 Salvar Novo Cliente
    // ===============================
    const btnSalvar = document.getElementById("salvarCliente");

    btnSalvar.addEventListener("click", async () => {
        const nome = document.getElementById("nome").value.trim();
        const ativo = document.getElementById("ativo").checked;
        const id_vendedor = document.getElementById("idVendedor").value;

        if (!nome) {
            alert("Digite o nome do cliente.");
            return;
        }

        try {
            const res = await fetch("/clientes/cadastrar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome,
                    ativo,
                    id_vendedor
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert("Erro ao salvar: " + (data.error || "Erro desconhecido"));
                return;
            }

            alert("Cliente cadastrado com sucesso!");

            // Limpa campos
            document.getElementById("nome").value = "";
            document.getElementById("ativo").checked = false;
            document.getElementById("idVendedor").value = "1";

            // Fecha modal
            fecharModal();

        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            alert("Erro ao salvar cliente no servidor.");
        }
    });

});
