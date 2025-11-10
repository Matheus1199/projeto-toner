// Abrir modal
document.getElementById("btnNovoCliente").onclick = () => {
    document.getElementById("modalTitle").innerText = "Novo Cliente";
    document.getElementById("idCliente").value = "";
    document.getElementById("nome").value = "";
    document.getElementById("ativo").checked = true;
    document.getElementById("idVendedor").value = "";
    document.getElementById("modal-bg").classList.remove("hidden");
};

// Fechar modal
function fecharModal() {
    document.getElementById("modal-bg").classList.add("hidden");
}

// Carregar lista de clientes
function carregarClientes() {
    fetch("/clientes")
        .then(res => res.json())
        .then(clientes => {
            const lista = document.getElementById("listaClientes");
            lista.innerHTML = "";

            clientes.forEach(c => {
                lista.innerHTML += `
                    <tr class="border-b">
                        <td class="py-3">${c.Id_cliente}</td>
                        <td class="py-3">${c.Nome}</td>
                        <td class="py-3">
                            <span class="px-3 py-1 rounded-full text-white ${c.Ativo ? "bg-green-600" : "bg-red-600"}">
                                ${c.Ativo ? "Ativo" : "Inativo"}
                            </span>
                        </td>
                        <td class="py-3">${c.Id_vendedor}</td>
                        <td class="py-3">
                            <button 
                                class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg mr-2"
                                onclick="editarCliente(${c.Id_cliente})">
                                Editar
                            </button>

                            <button 
                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg"
                                onclick="excluirCliente(${c.Id_cliente})">
                                Excluir
                            </button>
                        </td>
                    </tr>
                `;
            });
        });
}

carregarClientes();

// Salvar cliente
document.getElementById("salvarCliente").onclick = () => {
    const id = document.getElementById("idCliente").value;

    const data = {
        nome: document.getElementById("nome").value,
        ativo: document.getElementById("ativo").checked ? 1 : 0,
        id_vendedor: document.getElementById("idVendedor").value
    };

    const url = id ? `/clientes/${id}` : "/clientes";
    const method = id ? "PUT" : "POST";

    fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(() => {
        carregarClientes();
        fecharModal();
    });
};

// Editar cliente
function editarCliente(id) {
    fetch(`/clientes/${id}`)
        .then(res => res.json())
        .then(c => {
            document.getElementById("modalTitle").innerText = "Editar Cliente";

            document.getElementById("idCliente").value = c.Id_cliente;
            document.getElementById("nome").value = c.Nome;
            document.getElementById("ativo").checked = c.Ativo === 1;
            document.getElementById("idVendedor").value = c.Id_vendedor;

            document.getElementById("modal-bg").classList.remove("hidden");
        });
}

// Excluir cliente
function excluirCliente(id) {
    if (!confirm("Deseja realmente excluir este cliente?")) return;

    fetch(`/clientes/${id}`, { method: "DELETE" })
        .then(() => carregarClientes());
}
