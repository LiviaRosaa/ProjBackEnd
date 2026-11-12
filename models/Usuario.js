const db = require('../database/connection');

class Usuario {
    static async criar(nome, email, cpf, senhaHash) {
        const conexao = await db.getConnection(); 
        
        try {
            await conexao.beginTransaction(); 

            const [resultadoUsuario] = await conexao.query(
                'INSERT INTO usuarios (nome, email, cpf, senha) VALUES (?, ?, ?, ?)',
                [nome, email, cpf, senhaHash]
            );
            const idUsuario = resultadoUsuario.insertId;

            const categoriasPadrao = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Salário'];
            for (const categoria of categoriasPadrao) {
                await conexao.query(
                    'INSERT INTO categorias (nome, id_usuario) VALUES (?, ?)',
                    [categoria, idUsuario]
                );
            }

            await conexao.query(
                'INSERT INTO fontes_destinos (nome, id_usuario) VALUES (?, ?)',
                ['Conta corrente', idUsuario]
            );

            await conexao.commit(); 
            return idUsuario;

        } catch (erro) {
            await conexao.rollback(); 
            throw erro; 
        } finally {
            conexao.release(); 
        }
    }

    static async buscarPorEmail(email) {
        const [linhas] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        return linhas[0];
    }

    static async buscarPorCpf(cpf) {
        const [linhas] = await db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
        return linhas[0];
    }

    static async buscarPorId(id) {
        const [linhas] = await db.query('SELECT id, nome, email, cpf FROM usuarios WHERE id = ?', [id]);
        return linhas[0];
    }
}

module.exports = Usuario;