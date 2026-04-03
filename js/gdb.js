async function recuperarDado(base, chave) {

    if (chave === undefined || chave === null)
        return null

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const resposta = await fetch(`${api}/recuperar-dado`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ base, chave })
    })

    if (!resposta.ok) {
        const erro = await resposta.text()
        throw new Error(erro || 'Erro na requisição')
    }

    return await resposta.json()
}

async function pesquisarDB(params) {

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const resposta = await fetch(`${api}/pesquisar-db`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(params)
    })

    if (!resposta.ok) {
        const erro = await resposta.text()
        throw new Error(erro || 'Erro ao pesquisar')
    }

    return await resposta.json()
}

async function baixarRelatorioExcel(schema, nome = 'relatorio') {

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const response = await fetch(`${api}/excel`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(schema)
    })

    if (!response.ok) {
        const erro = await response.json()
        popup({ mensagem: erro.mensagem || 'Erro ao exportar' })
        return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${nome}-${Date.now()}.xlsx`
    document.body.appendChild(a)
    a.click()

    a.remove()
    window.URL.revokeObjectURL(url)
}


async function contarPorCampo({
    base,
    path,
    filtros = {},
    explode = null
}) {

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const resposta = await fetch(`${api}/contar-por-campo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            base,
            path,
            filtros,
            explode
        })
    })

    if (!resposta.ok) {
        const erro = await resposta.text()
        throw new Error(erro || 'Erro ao contar por campo')
    }

    return await resposta.json()
}

async function deletar(caminho) {

    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    const url = `${api}/deletar`

    const objeto = {
        caminho,
        usuario: acesso.usuario
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(objeto)
        })

        if (!response.ok) {
            console.error(`Falha ao deletar: ${response.status} ${response.statusText}`)
            const erroServidor = await response.text()
            console.error(`Resposta do servidor:`, erroServidor)
            throw new Error(`Erro HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.mensagem)
            return popup({ mensagem: data.mensagem })

        return data

    } catch (erro) {
        console.error(`Erro ao tentar deletar '${caminho}':`, erro.message || erro)
        removerOverlay()
        return null
    }
}

async function enviar(caminho, info) {

    const url = `${api}/salvar`
    const objeto = { caminho, valor: info }
    const { token } = JSON.parse(localStorage.getItem('acesso')) || {}

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(objeto)
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            // Erro ao tentar interpretar como JSON;
            console.error("Resposta não é JSON válido:", parseError);
            return null;
        }

        if (!response.ok) {
            // Se a API respondeu erro (ex: 400, 500);
            console.error("Erro HTTP:", response.status, data);
            return null;
        }

        return data;
    } catch (erro) {
        console.error("Erro na requisição:", erro);
        return null;
    }
}

function toTimestamp(d, fimDoDia = false) {
    if (d == null || d === '') return null
    if (typeof d === 'number') return d

    const str = String(d).trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, dia] = str.split('-').map(Number)
        return fimDoDia
            ? new Date(y, m - 1, dia, 23, 59, 59, 999).getTime()
            : new Date(y, m - 1, dia, 0, 0, 0, 0).getTime()
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        const t = Date.parse(str)
        return isNaN(t) ? null : t
    }

    const br = str.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2})(?::(\d{2}))?)?/
    )

    if (br) {
        const [, dia, mes, ano, h = '00', min = '00', s = '00'] = br
        return new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(h),
            Number(min),
            Number(s)
        ).getTime()
    }

    const t = Date.parse(str)
    return isNaN(t) ? null : t
}