const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Lancamento = require('../models/Lancamento');
const protegerRota = require('../middleware/auth');
const { validarDataUTC, adicionarMesesUTC } = require('../utils/datas');

const TIPOS = ['entrada', 'saida'];

function formatarLancamento(linha) {
    return {
        id: linha.id,
        descricao: linha.descricao,
        valor: Number(linha.valor),
        tipo: linha.tipo,
        data: linha.data,
        observacao: linha.observacao || null,
        parcelaAtual: Number(linha.parcela_atual),
        totalParcelas: Number(linha.total_parcelas),
        grupoParcelamento: linha.grupo_parcelamento || null,
        categoria: {
            id: linha.categoria_id,
            nome: linha.categoria_nome,
            tipo: linha.categoria_tipo
        },
        fonteDestino: {
            id: linha.fonte_id,
            nome: linha.fonte_nome,
            tipo: linha.fonte_tipo
        }
    };
}

router.get('/', protegerRota, async (req, res) => {
    try {
        const { dataInicio, dataFim, tipo, idCategoria, idFonteDestino, pagina } = req.query;
        const campos = {};

        if (dataInicio && !validarDataUTC(dataInicio)) {
            campos.dataInicio = 'Use o formato válido AAAA-MM-DD.';
        }
        if (dataFim && !validarDataUTC(dataFim)) {
            campos.dataFim = 'Use o formato válido AAAA-MM-DD.';
        }
        if (tipo && !TIPOS.includes(tipo)) {
            campos.tipo = 'Use entrada ou saida.';
        }
        const paginaNum = pagina ? Number(pagina) : 1;
        if (!Number.isInteger(paginaNum) || paginaNum < 1) {
            campos.pagina = 'A página deve ser um número inteiro maior ou igual a 1.';
        }

        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        let inicioFiltro = dataInicio;
        let fimFiltro = dataFim;

        if (!inicioFiltro && !fimFiltro) {
            const hoje = new Date();
            const ano = hoje.getUTCFullYear();
            const mes = hoje.getUTCMonth();
            const primeiroDia = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
            const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);
            inicioFiltro = primeiroDia;
            fimFiltro = ultimoDia;
        }

        const resultado = await Lancamento.listar(req.auth.id, {
            dataInicio: inicioFiltro,
            dataFim: fimFiltro,
            tipo,
            idCategoria,
            idFonteDestino,
            pagina: paginaNum
        });

        const totalPaginas = Math.ceil(resultado.totalItens / 20) || 1;

        res.json({
            itens: resultado.linhas.map(formatarLancamento),
            paginacao: {
                paginaAtual: paginaNum,
                itensPorPagina: 20,
                totalItens: resultado.totalItens,
                totalPaginas
            },
            resumo: {
                totalEntradas: Number(resultado.totalEntradas.toFixed(2)),
                totalSaidas: Number(resultado.totalSaidas.toFixed(2)),
                saldo: Number((resultado.totalEntradas - resultado.totalSaidas).toFixed(2))
            }
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar lançamentos.' });
    }
});

router.get('/:id', protegerRota, async (req, res) => {
    try {
        const lancamento = await Lancamento.buscarPorId(req.params.id, req.auth.id);
        if (!lancamento) {
            return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        }
        res.json(formatarLancamento(lancamento));
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar lançamento.' });
    }
});

router.post('/', protegerRota, async (req, res) => {
    try {
        const {
            descricao,
            valor,
            tipo,
            data,
            observacao = null,
            idCategoria,
            idFonteDestino,
            totalParcelas = 1
        } = req.body;

        const campos = {};
        if (!descricao || !String(descricao).trim()) {
            campos.descricao = 'A descrição é obrigatória.';
        }
        const valorNum = Number(valor);
        if (isNaN(valorNum) || valorNum <= 0) {
            campos.valor = 'O valor deve ser maior que zero.';
        }
        if (!TIPOS.includes(tipo)) {
            campos.tipo = 'Use entrada ou saida.';
        }
        if (!validarDataUTC(data)) {
            campos.data = 'Informe uma data válida no formato AAAA-MM-DD.';
        }
        if (!idCategoria) {
            campos.idCategoria = 'A categoria é obrigatória.';
        }
        if (!idFonteDestino) {
            campos.idFonteDestino = 'A fonte/destino é obrigatória.';
        }
        const parcelasNum = Number(totalParcelas);
        if (!Number.isInteger(parcelasNum) || parcelasNum < 1 || parcelasNum > 48) {
            campos.totalParcelas = 'O total de parcelas deve ser um inteiro entre 1 e 48.';
        }

        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const categoria = await Lancamento.buscarCategoriaPorId(idCategoria, req.auth.id);
        if (!categoria) {
            return res.status(404).json({ erro: 'Categoria não encontrada.' });
        }
        if (categoria.tipo !== tipo) {
            return res.status(400).json({
                erro: 'Dados inválidos.',
                campos: { idCategoria: `A categoria "${categoria.nome}" é do tipo ${categoria.tipo} e não pode ser usada em um lançamento de ${tipo}.` }
            });
        }

        const fonteDestino = await Lancamento.buscarFonteDestinoPorId(idFonteDestino, req.auth.id);
        if (!fonteDestino) {
            return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
        }

        if (parcelasNum > 1) {
            if (tipo !== 'saida') {
                return res.status(400).json({
                    erro: 'Dados inválidos.',
                    campos: { totalParcelas: 'Parcelamento só é permitido para lançamentos do tipo saida.' }
                });
            }
            if (fonteDestino.tipo !== 'cartao_credito') {
                return res.status(400).json({
                    erro: 'Dados inválidos.',
                    campos: { totalParcelas: 'Parcelamento só é permitido para compras no cartão de crédito.' }
                });
            }
        }

        const totalCentavos = Math.round(valorNum * 100);
        const valorBaseCentavos = Math.floor(totalCentavos / parcelasNum);
        const restoCentavos = totalCentavos - (valorBaseCentavos * parcelasNum);

        const grupoParcelamento = parcelasNum > 1 ? crypto.randomUUID() : null;
        const descricaoLimpa = String(descricao).trim();
        const obsLimpa = observacao && String(observacao).trim() ? String(observacao).trim() : null;

        const itensParaInserir = [];
        for (let k = 1; k <= parcelasNum; k++) {
            const centavosParcela = k === 1 ? valorBaseCentavos + restoCentavos : valorBaseCentavos;
            const valorParcela = Number((centavosParcela / 100).toFixed(2));
            const dataParcela = k === 1 ? data : adicionarMesesUTC(data, k - 1);

            itensParaInserir.push({
                descricao: descricaoLimpa,
                valor: valorParcela,
                tipo,
                data: dataParcela,
                observacao: obsLimpa,
                parcelaAtual: k,
                totalParcelas: parcelasNum,
                grupoParcelamento,
                idCategoria: categoria.id,
                idFonteDestino: fonteDestino.id,
                idUsuario: req.auth.id
            });
        }

        const idsCriados = await Lancamento.criarParcelas(itensParaInserir);

        if (parcelasNum === 1) {
            const criado = await Lancamento.buscarPorId(idsCriados[0], req.auth.id);
            return res.status(201).json(formatarLancamento(criado));
        }

        const parcelasCriadas = [];
        for (const idItem of idsCriados) {
            const item = await Lancamento.buscarPorId(idItem, req.auth.id);
            parcelasCriadas.push(formatarLancamento(item));
        }

        res.status(201).json({
            mensagem: `Compra parcelada em ${parcelasNum}x registrada com sucesso.`,
            grupoParcelamento,
            parcelas: parcelasCriadas
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar lançamento.' });
    }
});

router.put('/:id', protegerRota, async (req, res) => {
    try {
        const existente = await Lancamento.buscarPorId(req.params.id, req.auth.id);
        if (!existente) {
            return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        }

        const {
            descricao,
            valor,
            tipo,
            data,
            observacao = null,
            idCategoria,
            idFonteDestino
        } = req.body;

        const campos = {};
        if (!descricao || !String(descricao).trim()) {
            campos.descricao = 'A descrição é obrigatória.';
        }
        const valorNum = Number(valor);
        if (isNaN(valorNum) || valorNum <= 0) {
            campos.valor = 'O valor deve ser maior que zero.';
        }
        if (!TIPOS.includes(tipo)) {
            campos.tipo = 'Use entrada ou saida.';
        }
        if (!validarDataUTC(data)) {
            campos.data = 'Informe uma data válida no formato AAAA-MM-DD.';
        }
        if (!idCategoria) {
            campos.idCategoria = 'A categoria é obrigatória.';
        }
        if (!idFonteDestino) {
            campos.idFonteDestino = 'A fonte/destino é obrigatória.';
        }

        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const categoria = await Lancamento.buscarCategoriaPorId(idCategoria, req.auth.id);
        if (!categoria) {
            return res.status(404).json({ erro: 'Categoria não encontrada.' });
        }
        if (categoria.tipo !== tipo) {
            return res.status(400).json({
                erro: 'Dados inválidos.',
                campos: { idCategoria: `A categoria "${categoria.nome}" é do tipo ${categoria.tipo} e não pode ser usada em um lançamento de ${tipo}.` }
            });
        }

        const fonteDestino = await Lancamento.buscarFonteDestinoPorId(idFonteDestino, req.auth.id);
        if (!fonteDestino) {
            return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
        }

        if (existente.total_parcelas > 1) {
            if (tipo !== 'saida') {
                return res.status(400).json({
                    erro: 'Dados inválidos.',
                    campos: { tipo: 'Um lançamento parcelado não pode ser alterado para entrada.' }
                });
            }
            if (fonteDestino.tipo !== 'cartao_credito') {
                return res.status(400).json({
                    erro: 'Dados inválidos.',
                    campos: { idFonteDestino: 'Um lançamento parcelado deve estar vinculado a um cartão de crédito.' }
                });
            }
        }

        await Lancamento.atualizar(
            req.params.id,
            {
                descricao: String(descricao).trim(),
                valor: Number(valorNum.toFixed(2)),
                tipo,
                data,
                observacao: observacao && String(observacao).trim() ? String(observacao).trim() : null,
                idCategoria: categoria.id,
                idFonteDestino: fonteDestino.id
            },
            req.auth.id
        );

        const atualizado = await Lancamento.buscarPorId(req.params.id, req.auth.id);
        res.json(formatarLancamento(atualizado));
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar lançamento.' });
    }
});

router.delete('/:id', protegerRota, async (req, res) => {
    try {
        const existente = await Lancamento.buscarPorId(req.params.id, req.auth.id);
        if (!existente) {
            return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        }

        const { todasParcelas } = req.query;
        if (todasParcelas === 'true' && existente.grupo_parcelamento) {
            await Lancamento.deletarPorGrupo(existente.grupo_parcelamento, req.auth.id);
        } else {
            await Lancamento.deletar(req.params.id, req.auth.id);
        }

        res.status(204).send();
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao deletar lançamento.' });
    }
});

module.exports = router;