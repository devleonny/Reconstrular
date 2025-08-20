const equipamentosLinhas = {
    'capacete': { nome: 'Capacete', risco: '3, 11, 14' },
    'luvas': { nome: 'Luvas (par)', risco: '12' },
    'botas': { nome: 'Botas de segurança com biqueira reforçada', risco: '5, 6, 7, 9, 10' },
    'colete': { nome: 'Colete fluorescente', risco: '19' },
    'mascara': { nome: 'Mascara com filtro de particulas', risco: '16' },
    'oculos': { nome: 'Óculos de protecção', risco: '14' },
    'protecaoAuditiva': { nome: 'Proteção auditiva', risco: '17' }
}


//abrirEPI('13aa2b64-fc40-4ef4-bd49-f4acfdd1d12d')
async function abrirEPI(idColaborador) {
    removerPopup()
    const colaborador = await recuperarDado('dados_colaboradores', idColaborador)
    const equipColaborador = colaborador?.epi?.equipamentos || {}
    const dt = colaborador?.epi?.data || false
    const tdG = (el) => `<td style="text-align: center;">${el || ''}</div>`

    let equipamentos = ''
    for (const [equipamento, dados] of Object.entries(equipamentosLinhas)) {

        const equip = equipColaborador[equipamento]
        if(!equipColaborador[equipamento]) continue

        equipamentos += `
            <tr>
                ${tdG(dados.risco)}
                ${tdG(dados.nome)}
                ${tdG(equip?.quantidade || '')}
                ${tdG(equip?.tamanho || '')}
                ${tdG()}
                ${tdG()}
                ${tdG(dt ? new Date(dt).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }) : '')}
            </tr>
        `
    }

    const ths = ['Risco a <br>Proteger', 'Designação', 'Qtd', 'Tamanho', 'Rubrica<br> Colaborador', 'Rubrica <br>Fiscal de Obra', 'Data']
        .map(op => `<th style="background-color: white; color: #222;">${op}</th>`)
        .join('')

    const acumulado = `

        <div class="painelFiltros">
            <button onclick="telaColaboradores()">Voltar</button>
        </div>
        <div class="contornoFolha">
        <div class="folha-epi">
            <div class="cabecalho-epi">
                <span>
                    <strong>Enumeratributo Unipessoal Lda</strong><br>
                    <strong>Morada:</strong> Rua Nuno Tristão 11-A, 2830-095 Barreiro</br>
                    <strong>NIPC:</strong> 517637480</br>
                    <strong>Alvarás de empreiteiro de obras particulares:</strong> 108325 - PAR
                </span>
                <div style="background-color: #5b707f">
                    <img src="https://i.imgur.com/9MA4A99.png">
                </div>
            </div>

            <table>
                <tbody>
                    <tr>
                        <td colspan="2" style="text-align: center;"><strong>FICHA DE EQUIPAMENTO DE PROTECÇÃO INDIVIDUAL (EPI)<strong></td>
                    <tr>

                    <tr>
                        <td><strong>FUNCIONÁRIO: ${colaborador?.nome || ''}</strong></td>
                    </tr>

                    <tr>
                        <td><strong>CATEGORIA:</strong></td>
                    </tr>
                </tbody>
            </table>

            <table>
                <thead>
                    <tr><th colspan="7">EQUIPAMENTO</th></tr>
                    <tr>${ths}</tr>
                </thead>
                <tbody>
                    ${equipamentos}
                </tbody>
            </table>

            <table>
                <thead>
                    <th colspan="3">TABELA DE RISCOS (a)</td>
                </thead>
                <tbody>
                    <tr>
                        <td>1- Queda em altura</td>
                        <td>8- Choque ao nível dos maléolos</td>
                        <td>15- Electrocussão</td>
                    </tr>

                    <tr>
                        <td>2- Queda ao mesmo nível</td>
                        <td>9- Choque ao nível do matatarso</td>
                        <td>16- Gases Tóxicos</td>
                    </tr>

                    <tr>
                        <td>3- Queda de objectos</td>
                        <td>10- Choque ao nível da perna</td>
                        <td>17- Ruído</td>
                    </tr>

                    <tr>
                        <td>4- Queda por escorregamento</td>
                        <td>11- Pancada da cabeça</td>
                        <td>18- Poeiras</td>
                    </tr>

                    <tr>
                        <td>5- Esmagamento de pés</td>
                        <td>12- Cortes</td>
                        <td>19- Condições climatéricas</td>
                    </tr>

                    <tr>
                        <td>6- Objecto pontiagudo ou cortante</td>
                        <td>13 - Entalamento</td>
                    </tr>

                    <tr>
                        <td>7- Torção do pé</td>
                        <td>14 - Estilhaços</td>
                    </tr>

                </tbody>
            </table>

            <table>
                <thead>
                    <th>NORMAS DE UTILIZAÇÃO</td>
                </thead>
                <tbody>
                    <tr><td>1) O EPI é de uso pessoal e intransmissível</td></tr>
                    <tr><td>2) A substituição do EPI obriga à entrega do EPI danificado</td></tr>
                    <tr><td>3) O Trabalhador deve conservar e manter em bom estado o EPI</td></tr>
                    <tr><td>4) O Trabalhador deve comunicar qualquer avaria ou deficiência detectada no EPI</td></tr>
                    <tr><td>5) Deve o Trabalhador solicitar a substituição do EPI, assim que o mesmo esteja danificado</td></tr>
                    <tr><td>6) O Trabalhador deve utilizar correctamente o EPI adquado à função</td></tr>
                </tbody>
            </table>

            <table>
                <thead>
                <th>DECLARAÇÃO</td>
                </thead>
                <tbody>
                    <td>
                        Declaro que recebi o(s) equipamento(s) de Protecção Individual (EPI) acima referido(s) e 
                        que fui informado dos respectivos riscos que pretendem proteger, comprometendo-me a utilizá-los 
                        correctamente de acordo com as instruções recebidas, a conservá-los e mantê-los em bom estado, e 
                        a participar ao meu superior hieráquico todas as avarias ou deficiências de que tenha conhecimento.
                    </td>
                </tbody>
            </table>

        </div>
    </div>
    `

    const telaInterna = document.querySelector('.telaInterna')

    telaInterna.innerHTML = acumulado
}