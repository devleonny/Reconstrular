async function telaPrecos() {

    campos = await recuperarDados('campos_orcamento')

    const ths = ['Especialidade', 'Descrição', 'Unidade de Medida', 'Sub-Total', 'Margem', 'Total']
        .map(col => `<th>${col}</th>`)
        .join('')

    const acumulado = `
        <div class="blocoTabela">
            <div class="painelBotoes">
                <div class="botoes">
                    <div class="pesquisa">
                        <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                        <img src="imagens/pesquisar2.png">
                    </div>
                </div>
                <img class="atualizar" src="imagens/atualizar.png" onclick="atualizarOrcamentos()">
            </div>
            <div class="recorteTabela">
                <table class="tabela">
                    <thead>
                        <tr>${ths}</tr>
                    </thead>
                    <tbody id="body"></tbody>
                </table>
            </div>
            <div class="rodapeTabela"></div>
        </div>
    `

    const telaInterna = document.querySelector('.telaInterna')
    telaInterna.innerHTML = acumulado

    for (const [zona, d1] of Object.entries(campos)) {
        criarLinhasCampos(zona, d1)
    }

}

function criarLinhasCampos(zona, d1) {

    for (const [especialidade, d2] of Object.entries(d1.especialidades)) {
        const tds = `
            <td>${zona}</td>
            <td>${especialidade}</td>
            <td>${d2.medida}</td>
        `

        const trExistente = document.getElementById(especialidade)
        if (trExistente) {
            trExistente.innerHTML = tds

        } else {
            document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${especialidade}">${tds}</tr>`)
        }
    }

}