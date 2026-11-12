const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Usuario = require('../models/Usuario');
const validarCPF = require('../utils/cpf');
const protegerRota = require('../middleware/auth');

router.post('/cadastro', async (req, res) => {
    try {
        let { nome, email, cpf, senha } = req.body;

        if (email) email = email.trim().toLowerCase();
        if (cpf) cpf = cpf.replace(/[^\d]+/g, '');

        const camposInvalidos = {};
        if (!nome) camposInvalidos.nome = 'O nome é obrigatório';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) camposInvalidos.email = 'E-mail inválido ou obrigatório';
        if (!cpf || !validarCPF(cpf)) camposInvalidos.cpf = 'CPF inválido ou obrigatório';
        
        if (!senha || senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
            camposInvalidos.senha = 'A senha deve ter no mínimo 8 caracteres, contendo letras e números';
        }

        if (Object.keys(camposInvalidos).length > 0) {
            return res.status(400).json({ erro: 'Falha na validação dos dados', campos: camposInvalidos });
        }

        if (await Usuario.buscarPorEmail(email)) {
            return res.status(409).json({ erro: 'Conflito de dados', campos: { email: 'Este e-mail já está cadastrado' } });
        }
        if (await Usuario.buscarPorCpf(cpf)) {
            return res.status(409).json({ erro: 'Conflito de dados', campos: { cpf: 'Este CPF já está cadastrado' } });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const idUsuario = await Usuario.criar(nome, email, cpf, senhaHash);

        res.status(201).json({ 
            mensagem: 'Usuário, categorias e conta corrente cadastrados com sucesso!', 
            id: idUsuario 
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

router.post('/login', async (req, res) => {
    try {
        let { email, senha } = req.body;
        if (email) email = email.trim().toLowerCase();

        const usuario = await Usuario.buscarPorEmail(email);
        if (!usuario) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
        }

        const token = jwt.sign(
            { id: usuario.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

router.get('/me', protegerRota, async (req, res) => {
    try {
        const usuario = await Usuario.buscarPorId(req.auth.id);
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        res.json(usuario);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

module.exports = router;