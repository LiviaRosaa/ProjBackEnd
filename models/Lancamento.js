const db = require('../database/connection');

class Lancamento {
    static async buscarCategoriaPorId(idCategoria, idUsuario) {
        const [linhas] = await db.query(
            'SELECT id, nome, tipo FROM categorias WHERE id = ? AND id_usuario = ?',
            [idCategoria, idUsuario]
        );
        return linhas[0] || null;
    }

    static async buscarFonteDestinoPorId(idFonteDestino, idUsuario) {
        const [linhas] = await db.query(
            'SELECT id, nome, tipo, dia_fechamento, dia_vencimento, limite FROM fontes_destinos WHERE id = ? AND id_usuario = ?',
            [idFonteDestino, idUsuario]
        );
        return linhas[0] || null;
    }

    static async listar(idUsuario, filtros) {
        const { dataInicio, dataFim, tipo, idCategoria, idFonteDestino, pagina = 1 } = filtros;
        const limite = 20;
        const offset = (pagina - 1) * limite;

        let where = 'WHERE l.id_usuario = ?';
        const params = [idUsuario];

        if (dataInicio) {
            where += ' AND l.data >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            where += ' AND l.data <= ?';
            params.push(dataFim);
        }
        if (tipo) {
            where += ' AND l.tipo = ?';
            params.push(tipo);
        }
        if (idCategoria) {
            where += ' AND l.id_categoria = ?';
            params.push(idCategoria);
        }
        if (idFonteDestino) {
            where += ' AND l.id_fonte_destino = ?';
            params.push(idFonteDestino);
        }

        const sqlItens = `
            SELECT
                l.id,
                l.descricao,
                l.valor,
                l.tipo,
                DATE_FORMAT(l.data, '%Y-%m-%d') AS data,
                l.observacao,
                l.parcela_atual,
                l.total_parcelas,
                l.grupo_parcelamento,
                c.id AS categoria_id,
                c.nome AS categoria_nome,
                c.tipo AS categoria_tipo,
                f.id AS fonte_id,
                f.nome AS fonte_nome,
                f.tipo AS fonte_tipo
            FROM lancamentos l
            INNER JOIN categorias c ON l.id_categoria = c.id
            INNER JOIN fontes_destinos f ON l.id_fonte_destino = f.id
            ${where}
            ORDER BY l.data DESC, l.id DESC
            LIMIT ? OFFSET ?
        `;
        const [linhas] = await db.query(sqlItens, [...params, limite, offset]);

        const sqlResumo = `
            SELECT
                COUNT(*) AS totalItens,
                COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE 0 END), 0) AS totalEntradas,
                COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor ELSE 0 END), 0) AS totalSaidas
            FROM lancamentos l
            ${where}
        `;
        const [[resumo]] = await db.query(sqlResumo, params);

        return {
            linhas,
            totalItens: Number(resumo.totalItens),
            totalEntradas: Number(resumo.totalEntradas),
            totalSaidas: Number(resumo.totalSaidas)
        };
    }

    static async buscarPorId(id, idUsuario) {
        const sql = `
            SELECT
                l.id,
                l.descricao,
                l.valor,
                l.tipo,
                DATE_FORMAT(l.data, '%Y-%m-%d') AS data,
                l.observacao,
                l.parcela_atual,
                l.total_parcelas,
                l.grupo_parcelamento,
                c.id AS categoria_id,
                c.nome AS categoria_nome,
                c.tipo AS categoria_tipo,
                f.id AS fonte_id,
                f.nome AS fonte_nome,
                f.tipo AS fonte_tipo
            FROM lancamentos l
            INNER JOIN categorias c ON l.id_categoria = c.id
            INNER JOIN fontes_destinos f ON l.id_fonte_destino = f.id
            WHERE l.id = ? AND l.id_usuario = ?
        `;
        const [linhas] = await db.query(sql, [id, idUsuario]);
        return linhas[0] || null;
    }

    static async criarParcelas(listaLancamentos) {
        const conexao = await db.getConnection();
        try {
            await conexao.beginTransaction();

            const idsCriados = [];
            for (const item of listaLancamentos) {
                const [resultado] = await conexao.query(
                    `INSERT INTO lancamentos
                    (descricao, valor, tipo, data, observacao, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        item.descricao,
                        item.valor,
                        item.tipo,
                        item.data,
                        item.observacao,
                        item.parcelaAtual,
                        item.totalParcelas,
                        item.grupoParcelamento,
                        item.idCategoria,
                        item.idFonteDestino,
                        item.idUsuario
                    ]
                );
                idsCriados.push(resultado.insertId);
            }

            await conexao.commit();
            return idsCriados;
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    }

    static async atualizar(id, dados, idUsuario) {
        const [resultado] = await db.query(
            `UPDATE lancamentos
            SET descricao = ?, valor = ?, tipo = ?, data = ?, observacao = ?, id_categoria = ?, id_fonte_destino = ?
            WHERE id = ? AND id_usuario = ?`,
            [
                dados.descricao,
                dados.valor,
                dados.tipo,
                dados.data,
                dados.observacao,
                dados.idCategoria,
                dados.idFonteDestino,
                id,
                idUsuario
            ]
        );
        return resultado.affectedRows;
    }

    static async deletar(id, idUsuario) {
        const [resultado] = await db.query(
            'DELETE FROM lancamentos WHERE id = ? AND id_usuario = ?',
            [id, idUsuario]
        );
        return resultado.affectedRows;
    }

    static async deletarPorGrupo(grupoParcelamento, idUsuario) {
        const [resultado] = await db.query(
            'DELETE FROM lancamentos WHERE grupo_parcelamento = ? AND id_usuario = ?',
            [grupoParcelamento, idUsuario]
        );
        return resultado.affectedRows;
    }
}

module.exports = Lancamento;