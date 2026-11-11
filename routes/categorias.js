const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const protegerRota = require('../middleware/auth');

router.get('/', protegerRota, async (req, res) => {
    try {
        const idUsuario = req.auth.id; 
        const categorias = await Categoria.listar(idUsuario);
        res.json(categorias);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar categorias' });
    }
});

router.post('/', protegerRota, async (req, res) => {
    try {
        const idUsuario = req.auth.id;
        const { nome } = req.body; 
        if (!nome) {
            return res.status(400).json({ erro: 'O nome da categoria é obrigatório' });
        }

        const novaCategoria = await Categoria.criar(nome, idUsuario);
        res.status(201).json(novaCategoria);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar categoria' });
    }
});

    router.put('/:id', protegerRota, async (req, res) => {
    try {
        const idUsuario = req.auth.id;
        const idCategoria = req.params.id;
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ erro: 'O novo nome da categoria é obrigatório' });
        }

        const linhasAfetadas = await Categoria.atualizar(idCategoria, nome, idUsuario);
        
        if (linhasAfetadas === 0) {
            return res.status(404).json({ erro: 'Categoria não encontrada ou não pertence a este usuário' });
        }
        
        res.json({ mensagem: 'Categoria atualizada com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar categoria' });
    }
});

router.delete('/:id', protegerRota, async (req, res) => {
    try {
        const idUsuario = req.auth.id;
        const idCategoria = req.params.id;

        const linhasAfetadas = await Categoria.deletar(idCategoria, idUsuario);
        
        if (linhasAfetadas === 0) {
            return res.status(404).json({ erro: 'Categoria não encontrada ou não pertence a este usuário' });
        }
        
        res.json({ mensagem: 'Categoria deletada com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao deletar categoria' });
    }
});

module.exports = router;