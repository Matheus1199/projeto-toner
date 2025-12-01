// ==============================
// pagrec.js - TonerStock
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    async function carregarPagRec() {
    const res = await fetch("/pagrec/listar");
    const data = await res.json();

    const tblReceber = document.querySelector("#tblReceber tbody");
    const tblPagar = document.querySelector("#tblPagar tbody");

    tblReceber.innerHTML = "";
    tblPagar.innerHTML = "";

    // Função de formatação
    const fmtData = d => new Date(d).toLocaleDateString("pt-BR");
    const fmtValor = v => "R$ " + parseFloat(v).toFixed(2);

    // -----------------------
    // TÍTULOS A RECEBER
    // -----------------------
    data.receber.forEach(rec => {
        tblReceber.innerHTML += `
            <tr class="border">
                <td>${rec.Id_Lancamento}</td>
                <td>${fmtData(rec.Data)}</td>
                <td>-</td> <!-- NÃO EXISTE CLIENTE EM Tbl_PagRec -->
                <td>-</td> <!-- NÃO EXISTE DOCUMENTO EM Tbl_PagRec -->
                <td>${fmtValor(rec.Valor)}</td>
                <td>-</td> <!-- Tbl_PagRec NÃO TEM Cond_Pagamento -->
            </tr>
        `;
    });

    // -----------------------
    // TÍTULOS A PAGAR
    // -----------------------
    data.pagar.forEach(pag => {
        tblPagar.innerHTML += `
            <tr class="border">
                <td>${pag.Id_Lancamento}</td>
                <td>${fmtData(pag.Data)}</td>
                <td>${pag.Fornecedor ?? "-"}</td>
                <td>${pag.NDocumento ?? "-"}</td>
                <td>${fmtValor(pag.Valor)}</td>
                <td>${pag.Cond_Pagamento ?? "-"}</td>
            </tr>
        `;
    });
}

    // ==============================
    // INICIAR
    // ==============================
    carregarPagRec();

});
