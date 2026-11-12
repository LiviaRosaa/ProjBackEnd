const db = require('../database/connection');

class Categoria {
    static async listar(idUsuario, tipo) {
        let sql = 'SELECT * FROM categorias WHERE id_usuario = ?';
        const params = [idUsuario];
        if (tipo) {
            sql += ' AND tipo = ?';
            params.push(tipo);
        }
        const [linhas] = await db.query(sql, params);
        return linhas;
    }

    static async criar(nome, tipo, idUsuario) {
        const [resultado] = await db.query(
            'INSERT INTO categorias (nome, tipo, id_usuario) VALUES (?, ?, ?)',
            [nome, tipo, idUsuario]
        );
        return { id: resultado.insertId, nome, tipo, id_usuario: idUsuario };
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