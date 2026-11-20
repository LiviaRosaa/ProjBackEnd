const db = require('../database/connection');

class Relatorio {
    static async somarPorCategoria(idUsuario, tipo, inicio, fim) {
        const sql = `
            SELECT
                c.id,
                c.nome,
                COALESCE(SUM(l.valor), 0) AS total
            FROM lancamentos l
            INNER JOIN categorias c ON c.id = l.id_categoria
            WHERE l.id_usuario = ?
              AND l.tipo = ?
              AND l.data BETWEEN ? AND ?
            GROUP BY c.id, c.nome
            ORDER BY total DESC, c.nome ASC
        `;
        const [linhas] = await db.query(sql, [idUsuario, tipo, inicio, fim]);
        return linhas;
    }

    static async somarPorFonteDestino(idUsuario, inicio, fim) {
        const sql = `
            SELECT
                f.id,
                f.nome,
                f.tipo,
                COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE 0 END), 0) AS totalEntradas,
                COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor ELSE 0 END), 0) AS totalSaidas
            FROM fontes_destinos f
            LEFT JOIN lancamentos l
                ON l.id_fonte_destino = f.id
               AND l.id_usuario = ?
               AND l.data BETWEEN ? AND ?
            WHERE f.id_usuario = ?
            GROUP BY f.id, f.nome, f.tipo
            ORDER BY f.tipo ASC, f.nome ASC
        `;
        const [linhas] = await db.query(sql, [idUsuario, inicio, fim, idUsuario]);
        return linhas;
    }

    static async listarCartoesCredito(idUsuario) {
        const sql = `
            SELECT
                id,
                nome,
                dia_fechamento,
                dia_vencimento,
                limite
            FROM fontes_destinos
            WHERE id_usuario = ?
              AND tipo = 'cartao_credito'
            ORDER BY nome ASC
        `;
        const [linhas] = await db.query(sql, [idUsuario]);
        return linhas;
    }

    static async listarLancamentosCartoes(idUsuario) {
        const sql = `
            SELECT
                l.id,
                l.descricao,
                l.valor,
                DATE_FORMAT(l.data, '%Y-%m-%d') AS data,
                l.parcela_atual,
                l.total_parcelas,
                l.grupo_parcelamento,
                l.id_fonte_destino AS cartao_id,
                c.id AS categoria_id,
                c.nome AS categoria_nome
            FROM lancamentos l
            INNER JOIN fontes_destinos f ON f.id = l.id_fonte_destino
            INNER JOIN categorias c ON c.id = l.id_categoria
            WHERE l.id_usuario = ?
              AND l.tipo = 'saida'
              AND f.tipo = 'cartao_credito'
            ORDER BY l.data ASC, l.parcela_atual ASC, l.id ASC
        `;
        const [linhas] = await db.query(sql, [idUsuario]);
        return linhas;
    }

    static async resumoMensal(idUsuario, inicio, fim) {
        const [linhas] = await db.query(
            `SELECT 
                DATE_FORMAT(data, '%Y-%m') AS mes,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
                SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS saidas
             FROM lancamentos
             WHERE id_usuario = ? AND data BETWEEN ? AND ?
             GROUP BY DATE_FORMAT(data, '%Y-%m')
             ORDER BY mes ASC`,
            [idUsuario, inicio, fim]
        );
        return linhas;
    }

    static async parcelasFuturasPorMes(idUsuario, inicio, fim) {
        const [linhas] = await db.query(
            `SELECT 
                DATE_FORMAT(data, '%Y-%m') AS mes,
                SUM(valor) AS totalParcelas
             FROM lancamentos
             WHERE id_usuario = ? 
               AND tipo = 'saida'
               AND total_parcelas > 1
               AND data BETWEEN ? AND ?
             GROUP BY DATE_FORMAT(data, '%Y-%m')
             ORDER BY mes ASC`,
            [idUsuario, inicio, fim]
        );
        return linhas;
    }
}


module.exports = Relatorio;