document.addEventListener("DOMContentLoaded", () => {
    // Referências principais
    const modal = document.getElementById("modal-bg");
    const btnNovoToner = document.getElementById("btnNovoToner");
    const salvarBtn = document.getElementById("salvarToner");

    // Campos de pesquisa
    const inputModelo = document.getElementById("pesquisaModelo");
    const inputMarca = document.getElementById("pesquisaMarca");
    const inputTipo = document.getElementById("pesquisaTipo");
    const resultado = document.getElementById("resultado");

    let timeout;

    // === MODAL ===
    btnNovoToner.addEventListener("click", () => {
        document.getElementById("modalTitle").innerText = "Novo Toner";
        document.getElementById("codProduto").value = "";
        document.getElementById("modelo").value = "";
        document.getElementById("marca").value = "";
        document.getElementById("tipo").value = "";
        modal.style.display = "flex";
    });

    window.fecharModal = function () {
        modal.style.display = "none";
    };

    // === SALVAR TONER ===
    salvarBtn.addEventListener("click", () => {
        const id = document.getElementById("codProduto").value;
        const data = {
            modelo: document.getElementById("modelo").value,
            marca: document.getElementById("marca").value,
            tipo: document.getElementById("tipo").value
        };

        const url = id ? `/toners/${id}` : "/toners";
        const method = id ? "PUT" : "POST";

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }).then(() => {
            alert("Toner salvo com sucesso!");
            fecharModal();
        });
    });

    // === EVENTOS DE PESQUISA ===
    inputModelo.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => buscarToner("modelo", inputModelo.value), 500);
    });

    inputMarca.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => buscarToner("marca", inputMarca.value), 500);
    });

    inputTipo.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => buscarToner("tipo", inputTipo.value), 500);
    });

    // === FUNÇÃO PRINCIPAL DE BUSCA ===
    async function buscarToner(tipo, termo) {
        if (!termo.trim()) {
            resultado.classList.add("hidden");
            resultado.innerHTML = "";
            return;
        }

        try {
            const res = await fetch(`/toners/pesquisar?tipo=${tipo}&termo=${encodeURIComponent(termo)}`);
            const data = await res.json();

            resultado.classList.remove("hidden");
            resultado.innerHTML = ""; // limpa antes de mostrar

            if (data.error) {
                resultado.innerHTML = `<p class="text-red-600">${data.error}</p>`;
                return;
            }

            if (data.tipo === "modelo" && data.toner) {
                // Mostra informações do toner específico
                resultado.innerHTML = `
                    <div class="p-4 border rounded-lg shadow bg-white">
                        <h3 class="font-semibold text-lg">${data.toner.modelo}</h3>
                        <p><strong>Marca:</strong> ${data.toner.marca}</p>
                        <p><strong>Tipo:</strong> ${data.toner.tipo}</p>
                        <p><strong>Estoque:</strong> ${data.toner.estoque} unidades</p>
                        <h4 class="mt-3 font-semibold">Últimas 5 vendas:</h4>
                        <table class="w-full mt-2 border">
                            <thead>
                                <tr class="bg-gray-100 text-left">
                                    <th class="p-2">Data</th>
                                    <th class="p-2">Cliente</th>
                                    <th class="p-2">Qtd</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaVendas">
                                ${
                    data.vendas && data.vendas.length > 0
                        ? data.vendas.map(v => `
                                            <tr class="border-t">
                                                <td class="p-2">${new Date(v.Data_Venda).toLocaleDateString()}</td>
                                                <td class="p-2">${v.Cliente}</td>
                                                <td class="p-2">${v.Quantidade}</td>
                                            </tr>
                                        `).join("")
                        : `<tr><td colspan="3" class="p-2 text-gray-500">Nenhuma venda encontrada.</td></tr>`
                }
                            </tbody>
                        </table>
                    </div>
                `;

            } else if ((data.tipo === "marca" || data.tipo === "tipo") && data.toners) {
                // Mostra lista de toners por marca ou tipo
                resultado.innerHTML = `
                    <div class="p-4 border rounded-lg shadow bg-white">
                        <h3 class="font-semibold text-lg mb-2">
                            Resultados (${data.tipo === "marca" ? "Marca" : "Tipo"}):
                        </h3>
                        <table class="w-full border">
                            <thead>
                                <tr class="bg-gray-100 text-left">
                                    <th class="p-2">Modelo</th>
                                    <th class="p-2">Marca</th>
                                    <th class="p-2">Tipo</th>
                                    <th class="p-2">Estoque</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${
                    data.toners.length > 0
                        ? data.toners.map(t => `
                                            <tr class="border-t">
                                                <td class="p-2">${t.Modelo}</td>
                                                <td class="p-2">${t.Marca}</td>
                                                <td class="p-2">${t.Tipo}</td>
                                                <td class="p-2">${t.Estoque}</td>
                                            </tr>
                                        `).join("")
                        : `<tr><td colspan="4" class="p-2 text-gray-500">Nenhum toner encontrado.</td></tr>`
                }
                            </tbody>
                        </table>
                    </div>
                `;
            }

        } catch (err) {
            console.error("Erro na busca:", err);
            resultado.innerHTML = `<p class="text-red-600">Erro ao buscar toners.</p>`;
        }
    }
});
