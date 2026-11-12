const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const protegerRota = require('../middleware/auth');

const TIPOS = ['entrada', 'saida'];

router.get('/', protegerRota, async (req, res) => {
    try {
        const { tipo } = req.query;
        if (tipo && !TIPOS.includes(tipo)) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos: { tipo: 'Use entrada ou saida.' } });
        }
        const categorias = await Categoria.listar(req.auth.id, tipo);
        res.json(categorias);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar categorias' });
    }
});

router.post('/', protegerRota, async (req, res) => {
    try {
        const { nome, tipo } = req.body;
        const campos = {};
        if (!nome || !nome.trim()) campos.nome = 'O nome da categoria é obrigatório.';
        if (!TIPOS.includes(tipo)) campos.tipo = 'Use entrada ou saida.';
        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const nova = await Categoria.criar(nome.trim(), tipo, req.auth.id);
        res.status(201).json(nova);
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe uma categoria com esse nome para este tipo.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar categoria' });
    }
});

router.put('/:id', protegerRota, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome || !nome.trim()) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos: { nome: 'O nome da categoria é obrigatório.' } });
        }

        const linhas = await Categoria.atualizar(req.params.id, nome.trim(), req.auth.id);
        if (linhas === 0) {
            return res.status(404).json({ erro: 'Categoria não encontrada.' });
        }
        res.json({ mensagem: 'Categoria atualizada com sucesso!' });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe uma categoria com esse nome para este tipo.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar categoria' });
    }
});

router.delete('/:id', protegerRota, async (req, res) => {
    try {
        const linhas = await Categoria.deletar(req.params.id, req.auth.id);
        if (linhas === 0) {
            return res.status(404).json({ erro: 'Categoria não encontrada.' });
        }
        res.status(204).send();
    } catch (erro) {
        if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ erro: 'Categoria possui lançamentos vinculados e não pode ser excluída.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao deletar categoria' });
    }
});

module.exports = router;