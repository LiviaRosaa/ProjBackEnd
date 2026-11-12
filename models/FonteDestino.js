const db = require('../database/connection');

class FonteDestino {
    static async listar(idUsuario, tipo) {
        let sql = 'SELECT * FROM fontes_destinos WHERE id_usuario = ?';
        const params = [idUsuario];
        if (tipo) {
            sql += ' AND tipo = ?';
            params.push(tipo);
        }
        const [linhas] = await db.query(sql, params);
        return linhas;
    }

    static async criar({ nome, tipo, dia_fechamento, dia_vencimento, limite }, idUsuario) {
        const [resultado] = await db.query(
            `INSERT INTO fontes_destinos 
            (nome, tipo, dia_fechamento, dia_vencimento, limite, id_usuario) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, tipo, dia_fechamento, dia_vencimento, limite, idUsuario]
        );
        return {
            id: resultado.insertId,
            nome,
            tipo,
            dia_fechamento,
            dia_vencimento,
            limite,
            id_usuario: idUsuario
        };
    }

    static async atualizar(id, { nome, tipo, dia_fechamento, dia_vencimento, limite }, idUsuario) {
        const [resultado] = await db.query(
            `UPDATE fontes_destinos 
            SET nome = ?, tipo = ?, dia_fechamento = ?, dia_vencimento = ?, limite = ? 
            WHERE id = ? AND id_usuario = ?`,
            [nome, tipo, dia_fechamento, dia_vencimento, limite, id, idUsuario]
        );
        return resultado.affectedRows;
    }

    static async deletar(id, idUsuario) {
        const [resultado] = await db.query(
            'DELETE FROM fontes_destinos WHERE id = ? AND id_usuario = ?',
            [id, idUsuario]
        );
        return resultado.affectedRows;
    }
}

module.exports = FonteDestino;