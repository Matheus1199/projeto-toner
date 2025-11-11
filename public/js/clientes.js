document.addEventListener("DOMContentLoaded", () => {
    const inputPesquisa = document.getElementById("pesquisaCliente");
    const resultado = document.getElementById("resultado");
    const tbody = document.getElementById("tabelaCompras");
    let timeout;

    // === PESQUISAR CLIENTE ===
    inputPesquisa.addEventListener("input", () => {
        clearTimeout(timeout);
        const termo = inputPesquisa.value.trim();
        if (!termo) {
            resultado.classList.add("hidden");
            return;
        }

        timeout = setTimeout(() => buscarCliente(termo), 500);
    });

    async function buscarCliente(nome) {
        try {
            const res = await fetch(`/clientes/pesquisar?nome=${encodeURIComponent(nome)}`);
            const data = await res.json();

            if (!data || !data.cliente) {
                resultado.classList.add("hidden");
                return;
            }

            resultado.classList.remove("hidden");
            document.getElementById("nomeCliente").textContent = data.cliente.Nome;
            document.getElementById("statusCliente").textContent = data.cliente.Ativo ? "Ativo" : "Inativo";

            // === Exibe o nome correspondente do canal de aquisição ===
            const canalNome = {
                1: "Barsotti",
                6: "Whatsapp",
                7: "Google"
            }[data.cliente.Id_vendedor] || "Desconhecido";

            document.getElementById("vendedorCliente").textContent = canalNome;

            tbody.innerHTML = "";
        } catch (err) {
            console.error("Erro na busca:", err);
        }
    }

    // === MODAL ===
    document.getElementById("btnNovoCliente").onclick = () => {
        document.getElementById("modalTitle").innerText = "Novo Cliente";
        document.getElementById("idCliente").value = "";
        document.getElementById("nome").value = "";
        document.getElementById("ativo").checked = true;

        // === Atualiza o seletor de canal ===
        const select = document.getElementById("idVendedor");
        select.innerHTML = `
            <option value="1">Barsotti</option>
            <option value="6">Whatsapp</option>
            <option value="7">Google</option>
        `;
        select.value = "1";

        document.getElementById("modal-bg").classList.remove("hidden");
    };

    window.fecharModal = function () {
        document.getElementById("modal-bg").classList.add("hidden");
    };

    // === SALVAR CLIENTE ===
    document.getElementById("salvarCliente").onclick = () => {
        const id = document.getElementById("idCliente").value;
        const select = document.getElementById("idVendedor");

        const data = {
            nome: document.getElementById("nome").value,
            ativo: document.getElementById("ativo").checked ? 1 : 0,
            id_vendedor: parseInt(select.value) // envia o número correto (1, 6 ou 7)
        };

        const url = id ? `/clientes/${id}` : "/clientes";
        const method = id ? "PUT" : "POST";

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }).then(() => {
            fecharModal();
        });
    };
});
