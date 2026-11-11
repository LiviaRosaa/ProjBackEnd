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

    static async atualizar(idCategoria, nome, idUsuario) {
        const [resultado] = await db.query(
            'UPDATE categorias SET nome = ? WHERE id = ? AND id_usuario = ?',
            [nome, idCategoria, idUsuario]
        );
        return resultado.affectedRows;
    }

    static async deletar(idCategoria, idUsuario) {
        const [resultado] = await db.query(
            'DELETE FROM categorias WHERE id = ? AND id_usuario = ?',
            [idCategoria, idUsuario]
        );
        return resultado.affectedRows;
    }
}

module.exports = Categoria;