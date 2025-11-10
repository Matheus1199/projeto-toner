document.addEventListener("DOMContentLoaded", () => {
    // Referências principais
    const modal = document.getElementById("modal-bg");
    const btnNovoToner = document.getElementById("btnNovoToner");
    const salvarBtn = document.getElementById("salvarToner");
    const inputPesquisa = document.getElementById("pesquisa");
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

    // === PESQUISAR TONER ===
    inputPesquisa.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => buscarToner(inputPesquisa.value), 500);
    });

    async function buscarToner(termo) {
        const resultado = document.getElementById("resultado");
        if (!termo.trim()) {
            resultado.classList.add("hidden");
            return;
        }

        try {
            const res = await fetch(`/toners/pesquisar?termo=${encodeURIComponent(termo)}`);
            const data = await res.json();

            if (!data || !data.toner) {
                resultado.classList.add("hidden");
                return;
            }

            resultado.classList.remove("hidden");
            document.getElementById("nomeToner").textContent = data.toner.modelo;
            document.getElementById("marcaToner").textContent = data.toner.marca;
            document.getElementById("tipoToner").textContent = data.toner.tipo;

            /*const tbody = document.getElementById("tabelaVendas");
            tbody.innerHTML = "";

            data.vendas.forEach(venda => {
                const tr = document.createElement("tr");
                tr.className = "border-b";
                tr.innerHTML = `
                    <td class="py-2 text-gray-600">${new Date(venda.data).toLocaleDateString()}</td>
                    <td class="py-2 text-gray-600">${venda.cliente}</td>
                    <td class="py-2 text-gray-600">${venda.quantidade}</td>
                `;
                tbody.appendChild(tr);
            });*/
        } catch (err) {
            console.error("Erro na busca:", err);
        }
    }
});
