const express = require('express');
const router = express.Router();
const FonteDestino = require('../models/FonteDestino');
const protegerRota = require('../middleware/auth');

const TIPOS_VALIDOS = ['renda', 'conta', 'cartao_credito'];

function validarDadosFonteDestino(body) {
    const { nome, tipo, dia_fechamento, dia_vencimento, limite } = body;
    const campos = {};

    if (!nome || !String(nome).trim()) campos.nome = 'O nome é obrigatório.';
    if (!TIPOS_VALIDOS.includes(tipo)) campos.tipo = 'Use renda, conta ou cartao_credito.';

    let fechamentoFinal = null, vencimentoFinal = null, limiteFinal = null;

    if (tipo === 'cartao_credito') {
        const fechamentoNum = Number(dia_fechamento);
        const vencimentoNum = Number(dia_vencimento);
        const limiteNum = Number(limite);

        if (!Number.isInteger(fechamentoNum) || fechamentoNum < 1 || fechamentoNum > 31) {
            campos.dia_fechamento = 'Informe um dia de fechamento entre 1 e 31.';
        }
        if (!Number.isInteger(vencimentoNum) || vencimentoNum < 1 || vencimentoNum > 31) {
            campos.dia_vencimento = 'Informe um dia de vencimento entre 1 e 31.';
        }
        if (limite === undefined || limite === null || limite === '' || Number.isNaN(limiteNum) || limiteNum <= 0) {
            campos.limite = 'O limite deve ser maior que zero.';
        }

        fechamentoFinal = fechamentoNum;
        vencimentoFinal = vencimentoNum;
        limiteFinal = limiteNum;
    }

    return {
        campos,
        dadosNormalizados: {
            nome: nome ? String(nome).trim() : '',
            tipo,
            dia_fechamento: fechamentoFinal,
            dia_vencimento: vencimentoFinal,
            limite: limiteFinal
        }
    };
}


router.get('/', protegerRota, async (req, res) => {
    try {
        const { tipo } = req.query;
        if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos: { tipo: 'Use renda, conta ou cartao_credito.' } });
        }
        const fontes = await FonteDestino.listar(req.auth.id, tipo);
        res.json(fontes);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar fontes e destinos' });
    }
});


router.post('/', protegerRota, async (req, res) => {
    try {
        const { campos, dadosNormalizados } = validarDadosFonteDestino(req.body);
        
        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const nova = await FonteDestino.criar(dadosNormalizados, req.auth.id);
        res.status(201).json(nova);
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe uma fonte/destino com esse nome.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar fonte/destino' });
    }
});

router.put('/:id', protegerRota, async (req, res) => {
    try {
        const { campos, dadosNormalizados } = validarDadosFonteDestino(req.body);
        
        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const linhas = await FonteDestino.atualizar(req.params.id, dadosNormalizados, req.auth.id);
        if (linhas === 0) {
            return res.status(404).json({ erro: 'Fonte/Destino não encontrada.' });
        }
        res.json({ mensagem: 'Fonte/Destino atualizada com sucesso!' });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe uma fonte/destino com esse nome.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar fonte/destino' });
    }
});

router.delete('/:id', protegerRota, async (req, res) => {
    try {
        const linhas = await FonteDestino.deletar(req.params.id, req.auth.id);
        if (linhas === 0) {
            return res.status(404).json({ erro: 'Fonte/Destino não encontrada.' });
        }
        res.status(204).send();
    } catch (erro) {
        if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ erro: 'Esta fonte/destino possui lançamentos vinculados e não pode ser excluída.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao deletar fonte/destino' });
    }
});

module.exports = router;