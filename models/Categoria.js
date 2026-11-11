const db = require('../database/connection');

class Categoria {
    static async listar(idUsuario) {
        const [linhas] = await db.query(
            'SELECT * FROM categorias WHERE id_usuario = ?', 
            [idUsuario]
        );
        return linhas;
    }

    static async criar(nome, idUsuario) {
        const [resultado] = await db.query(
            'INSERT INTO categorias (nome, id_usuario) VALUES (?, ?)', 
            [nome, idUsuario]
        );
        return { id: resultado.insertId, nome, id_usuario: idUsuario };
    }
}

module.exports = Categoria;