const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const protegerRota = require('../middleware/auth'); // A sua fechadura!

router.get('/', protegerRota, async (req, res) => {
    try {
        const idUsuario = req.auth.id; // O ID vem do token, super seguro
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
        const { nome } = req.body; // Pega o nome que o usuário digitou no Postman

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

module.exports = router;