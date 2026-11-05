const express = require('express');
const router = express.Router();
const bcrypt = require ('bcrypt');
const pool = require('../database/connection');
const jwt = require('jsonwebtoken');

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

router.post('/login', async(req,res) => {
    try{
        const {email, senha} = req.body;
        const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (usuarios.length === 0){
            return res.status(401).json({
                erro:'Email ou senha incorretos.'});

            }

        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if(!senhaValida){
            return res.status(401).json({
                erro:'Email ou senha incorretos.'
            });
        }

        const token = jwt.sign(
            {id: usuario.id},
            process.env.JWT_SECRET,
            {expiresIn: '8h'}
        );

        res.json({
            mensagem:'Login realizado com sucesso!',
            token: token,
            usuario:{
                id: usuario.id,
                nome:usuario.nome,
                email: usuario.email
            }
        });   

        }catch (erro){
            console.error(erro);
            res.status(500).json({
                erro:'Erro interno no servidor, faça login novamente'});
            }
        });

module.exports = router;