// Valores em cêntimos e durações em minutos; a vigência é inclusiva.
const Remuneracao = (() => {
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    const moeda = centavos => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(centavos / 100)
    const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
    function numero(valor) { return Number(String(valor).trim().replace(',', '.')) }
    function dataValida(data) { return /^\d{4}-\d{2}-\d{2}$/.test(data) && Number.isFinite(Date.parse(data + 'T12:00:00Z')) && new Date(data + 'T12:00:00Z').toISOString().slice(0,10) === data }
    function formulario(c) {
        const lista = [...(c.remuneracao?.vigencias || [])].sort((a,b)=>a.inicio.localeCompare(b.inicio))
        const dataPt = data => data.split('-').reverse().join('/')
        return `<section class="colaborador-remuneracao" aria-label="Remuneração diária">
            <header class="remuneracao-cabecalho">
                <h3>Remuneração diária</h3>
                <p>Defina o valor e a data a partir da qual ele será usado no Ponto.</p>
            </header>
            <div class="remuneracao-campos">
                <label>Pagamento<select name="rem-periodicidade">
                    <option value="mensal" ${c.remuneracao?.periodicidade !== 'semanal' ? 'selected' : ''}>Mensal (dia 1 ao último dia)</option>
                    <option value="semanal" ${c.remuneracao?.periodicidade === 'semanal' ? 'selected' : ''}>Semanal (sexta a quinta)</option>
                </select></label>
                <label>Valor da diária (€)<input name="rem-diaria" inputmode="decimal" placeholder="0,00"></label>
                <label>Válida a partir de<input name="rem-inicio" type="date" value="${hoje()}"></label>
                <label>Jornada diária (h)<input name="rem-jornada" type="number" min="0.01" max="24" step="0.01" value="8"></label>
            </div>
            <p class="remuneracao-ajuda">Deixe o valor vazio para manter o registo atual. Uma nova diária preserva os valores dos períodos anteriores. Para encerrar um valor, registe uma nova vigência com zero.</p>
            ${lista.length ? `<details class="remuneracao-historico">
                <summary>Histórico de valores <span>${lista.length} vigência${lista.length === 1 ? '' : 's'}</span></summary>
                <div class="remuneracao-tabela"><table><thead><tr><th>Válida a partir de</th><th>Diária</th><th>Jornada</th></tr></thead><tbody>${lista.map(v=>`<tr><td>${esc(dataPt(v.inicio))}</td><td>${moeda(v.centavos)}</td><td>${v.minutos_dia / 60} h</td></tr>`).join('')}</tbody></table></div>
                <p>Cada valor vale até ao início da próxima vigência.</p>
            </details>` : '<p class="remuneracao-vazio">Nenhuma diária registada. O valor proporcional no Ponto será zero.</p>'}
        </section>`
    }
    // Devolve a remuneração a gravar, ou null quando nada mudou (nem diária nova, nem periodicidade).
    function coletar(c) {
        const rem = { vigencias: [], ajustes: [], ...(c.remuneracao || {}) }
        const periodicidade = document.querySelector('[name="rem-periodicidade"]')?.value || 'mensal'
        const mudouPeriodicidade = periodicidade !== (rem.periodicidade === 'semanal' ? 'semanal' : 'mensal')
        const campo = document.querySelector('[name="rem-diaria"]')
        if ((!campo || !campo.value.trim()) && !mudouPeriodicidade) return null
        let vigencias = rem.vigencias || []
        if (campo && campo.value.trim()) {
            const diaria = numero(campo.value), inicio = document.querySelector('[name="rem-inicio"]').value
            const jornada = numero(document.querySelector('[name="rem-jornada"]').value)
            if (!Number.isFinite(diaria) || diaria < 0 || !Number.isSafeInteger(Math.round(diaria * 100)) || !dataValida(inicio) || !Number.isFinite(jornada) || jornada <= 0 || jornada > 24) throw new Error('Informe diária não negativa, data válida e jornada entre 0 e 24 horas.')
            if (vigencias.some(v=>v.inicio === inicio)) throw new Error('Já existe uma diária nesta data. Escolha uma nova data de vigência para preservar o histórico.')
            vigencias = [...vigencias, { id: crypto.randomUUID(), inicio, centavos: Math.round(diaria * 100), minutos_dia: Math.max(1, Math.round(jornada * 60)), criado_em: new Date().toISOString(), criado_por: acesso.usuario }]
        }
        return { ...rem, periodicidade, vigencias }
    }
    return { moeda, formulario, coletar, numero, dataValida }
})()
