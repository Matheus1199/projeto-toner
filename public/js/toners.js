document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("modal-bg");
    const btnNovoToner = document.getElementById("btnNovoToner");
    const salvarBtn = document.getElementById("salvarToner");

    // inputs de pesquisa
    const inputModelo = document.getElementById("pesquisaModelo");
    const inputMarca = document.getElementById("pesquisaMarca");
    const inputTipo = document.getElementById("pesquisaTipo");
    const resultado = document.getElementById("resultado");

    let timeout;

    // ========== MODAL ==========
    btnNovoToner.onclick = () => {
        document.getElementById("modalTitle").innerText = "Novo Toner";
        document.getElementById("codProduto").value = "";
        document.getElementById("modelo").value = "";
        document.getElementById("marca").value = "";
        document.getElementById("tipo").value = "";
        modal.classList.remove("hidden");
    };

    window.fecharModal = () => modal.classList.add("hidden");

    // ========== SALVAR TONER ==========
    salvarBtn.onclick = async () => {
        const id = document.getElementById("codProduto").value;

        const dados = {
            modelo: document.getElementById("modelo").value,
            marca: document.getElementById("marca").value,
            tipo: document.getElementById("tipo").value
        };

        const url = id ? `/toners/${id}` : "/toners";
        const method = id ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!res.ok) return alert("Erro ao salvar toner.");

        alert("Toner salvo com sucesso!");
        fecharModal();
    };

    // ========== EVENTOS DE PESQUISA ==========
    inputModelo.oninput = () => iniciarBusca("modelo", inputModelo.value);
    inputMarca.oninput = () => iniciarBusca("marca", inputMarca.value);
    inputTipo.oninput = () => iniciarBusca("tipo", inputTipo.value);

    function iniciarBusca(tipo, termo) {
        clearTimeout(timeout);
        timeout = setTimeout(() => buscarToner(tipo, termo), 400);
    }

    // ========== BUSCAR TONER ==========
    async function buscarToner(tipo, termo) {

        if (!termo.trim()) {
            resultado.classList.add("hidden");
            resultado.innerHTML = "";
            return;
        }

        const res = await fetch(`/toners/pesquisar?tipo=${tipo}&termo=${encodeURIComponent(termo)}`);
        const data = await res.json();

        resultado.classList.remove("hidden");
        resultado.innerHTML = "";

        if (data.error) {
            resultado.innerHTML = `<p class="text-red-600">${data.error}</p>`;
            return;
        }

        // =====================================================
        // 🔍 PESQUISA POR MODELO - MOSTRA DETALHES DO TONER
        // =====================================================
        if (data.tipo === "modelo") {
            resultado.innerHTML = `
                <div class="p-6 bg-white rounded-2xl shadow border">
                    <h2 class="text-xl font-bold">${data.toner.modelo}</h2>
                    <p><strong>Marca:</strong> ${data.toner.marca}</p>
                    <p><strong>Tipo:</strong> ${data.toner.tipo}</p>
            
                    <div class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                        <p class="font-semibold text-blue-800">
                            <i class='bx bxs-box mr-2'></i>
                            Em estoque: ${data.toner.estoque} unidades
                        </p>
                    </div>
            
                    <h3 class="mt-6 font-semibold text-lg">Últimas 5 vendas</h3>
                    <table class="w-full mt-2 border">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="p-2">Data</th>
                                <th class="p-2">Cliente</th>
                                <th class="p-2">Qtd</th>
                                <th class="p-2">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                            data.vendas.length > 0
                                ? data.vendas.map(v => `
                                        <tr>
                                            <td class="p-2 text-center">${new Date(v.Data_Venda).toLocaleDateString()}</td>
                                            <td class="p-2 text-center">${v.Cliente}</td>
                                            <td class="p-2 text-center">${v.Quantidade}</td>
                                            <td class="p-2 text-center">R$ ${parseFloat(v.Valor_Venda).toFixed(2)}</td>
                                        </tr>
                                    `).join("")
                                : `<tr><td colspan="4" class="p-2 text-gray-500">Nenhuma venda encontrada.</td></tr>`
                        }
                        </tbody>
                    </table>
                </div>
            `;
            return;
        }

        // =====================================================
        // 🔍 PESQUISA POR MARCA / TIPO — MOSTRA LISTA
        // =====================================================
        if (data.tipo === "marca" || data.tipo === "tipo") {
            resultado.innerHTML = `
                <div class="p-6 bg-white rounded-2xl shadow border">
                    <h2 class="text-xl font-bold mb-3">Resultados</h2>
                    <table class="w-full border">
                        <thead>
                        <tr class="bg-gray-100">
                            <th class="p-2">Modelo</th>
                            <th class="p-2">Marca</th>
                            <th class="p-2">Tipo</th>
                            <th class="p-2">Estoque</th>
                        </tr>
                        </thead>
                        <tbody>
                        ${
                data.toners.map(t => `
                            <tr>
                                <td class="p-2">${t.Modelo}</td>
                                <td class="p-2">${t.Marca}</td>
                                <td class="p-2">${t.Tipo}</td>
                                <td class="p-2">${t.Estoque}</td>
                            </tr>
                        `).join("")
            }
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
});