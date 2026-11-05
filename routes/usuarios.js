const express = require('express');
const router = express.Router();
const bcrypt = require ('bcrypt');
const pool = require('../database/connection');

router.post('/cadastro', async(requestAnimationFrame,res) => {
    try{
        const {nome, email, senha} = requestAnimationFrame.body;
        const senhaHash = await bcrypt.hash(senha,10);
        const [resultado] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
            [nome, email, senhaHash]
        );

        res.status(201).json({
            mensagem:'Usuário cadastrado com sucesso!',
            id: resultado.insertId
        });

    }catch (erro){
        console.error(erro);
        res.status(400).json({
            erro:'Erro ao cadastrar. Verifique os dados ou se o e-mail já existe.'
        });
    }
});

module.exports = router;