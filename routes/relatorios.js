const express = require('express');
const router = express.Router();
const Relatorio = require('../models/Relatorio');
const protegerRota = require('../middleware/auth');
const { validarDataUTC } = require('../utils/datas');
const { calcularFatura, dataSeguraUTC } = require('../utils/faturas');

function arredondar(valor) {
    return Number(Number(valor || 0).toFixed(2));
}

function calcularPeriodoAnterior(inicioISO, fimISO) {
    const [anoIni, mesIni, diaIni] = inicioISO.split('-').map(Number);
    const [anoFim, mesFim, diaFim] = fimISO.split('-').map(Number);

    const dataIni = new Date(Date.UTC(anoIni, mesIni - 1, diaIni));
    const dataFim = new Date(Date.UTC(anoFim, mesFim - 1, diaFim));

    const msPorDia = 24 * 60 * 60 * 1000;
    const diasPeriodo = Math.round((dataFim - dataIni) / msPorDia) + 1;

    const fimAnterior = new Date(dataIni.getTime() - msPorDia);
    const inicioAnterior = new Date(fimAnterior.getTime() - (diasPeriodo - 1) * msPorDia);

    return {
        inicio: inicioAnterior.toISOString().slice(0, 10),
        fim: fimAnterior.toISOString().slice(0, 10)
    };
}

router.get('/categorias', protegerRota, async (req, res) => {
    try {
        const { inicio, fim } = req.query;
        const campos = {};

        if (!inicio || !validarDataUTC(inicio)) {
            campos.inicio = 'Informe a data inicial válida no formato AAAA-MM-DD.';
        }
        if (!fim || !validarDataUTC(fim)) {
            campos.fim = 'Informe a data final válida no formato AAAA-MM-DD.';
        }
        if (!campos.inicio && !campos.fim && inicio > fim) {
            campos.inicio = 'A data inicial não pode ser maior que a data final.';
        }

        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const periodoAnterior = calcularPeriodoAnterior(inicio, fim);

        const [saidasAtuais, saidasAnteriores, entradasAtuais] = await Promise.all([
            Relatorio.somarPorCategoria(req.auth.id, 'saida', inicio, fim),
            Relatorio.somarPorCategoria(req.auth.id, 'saida', periodoAnterior.inicio, periodoAnterior.fim),
            Relatorio.somarPorCategoria(req.auth.id, 'entrada', inicio, fim)
        ]);

        const mapaAnterior = new Map();
        for (const item of saidasAnteriores) {
            mapaAnterior.set(item.id, Number(item.total));
        }

        const totalSaidas = saidasAtuais.reduce((acc, item) => acc + Number(item.total), 0);
        const categoriasSaida = saidasAtuais.map((item) => {
            const totalAtual = Number(item.total);
            const totalAnt = mapaAnterior.get(item.id) || 0;
            const percentual = totalSaidas > 0 ? arredondar((totalAtual / totalSaidas) * 100) : 0;
            const variacao = totalAnt > 0
                ? arredondar(((totalAtual - totalAnt) / totalAnt) * 100)
                : (totalAtual > 0 ? 100 : 0);

            return {
                id: item.id,
                nome: item.nome,
                total: arredondar(totalAtual),
                percentual,
                anterior: arredondar(totalAnt),
                variacao
            };
        });

        const totalEntradas = entradasAtuais.reduce((acc, item) => acc + Number(item.total), 0);
        const categoriasEntrada = entradasAtuais.map((item) => {
            const totalAtual = Number(item.total);
            const percentual = totalEntradas > 0 ? arredondar((totalAtual / totalEntradas) * 100) : 0;

            return {
                id: item.id,
                nome: item.nome,
                total: arredondar(totalAtual),
                percentual
            };
        });

        res.json({
            periodo: { inicio, fim },
            periodoAnterior,
            saidas: {
                total: arredondar(totalSaidas),
                categorias: categoriasSaida
            },
            entradas: {
                total: arredondar(totalEntradas),
                categorias: categoriasEntrada
            }
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar relatório por categorias.' });
    }
});

router.get('/fontes-destinos', protegerRota, async (req, res) => {
    try {
        const { inicio, fim } = req.query;
        const campos = {};

        if (!inicio || !validarDataUTC(inicio)) {
            campos.inicio = 'Informe a data inicial válida no formato AAAA-MM-DD.';
        }
        if (!fim || !validarDataUTC(fim)) {
            campos.fim = 'Informe a data final válida no formato AAAA-MM-DD.';
        }
        if (!campos.inicio && !campos.fim && inicio > fim) {
            campos.inicio = 'A data inicial não pode ser maior que a data final.';
        }

        if (Object.keys(campos).length > 0) {
            return res.status(400).json({ erro: 'Dados inválidos.', campos });
        }

        const linhas = await Relatorio.somarPorFonteDestino(req.auth.id, inicio, fim);

        const entradasPorFonte = [];
        const saidasPorDestino = [];
        const saldoContas = [];

        for (const item of linhas) {
            const entradas = arredondar(Number(item.totalEntradas));
            const saidas = arredondar(Number(item.totalSaidas));

            if (entradas > 0 || item.tipo === 'renda' || item.tipo === 'conta') {
                entradasPorFonte.push({
                    id: item.id,
                    nome: item.nome,
                    tipo: item.tipo,
                    total: entradas
                });
            }

            if (saidas > 0 || item.tipo === 'conta' || item.tipo === 'cartao_credito') {
                saidasPorDestino.push({
                    id: item.id,
                    nome: item.nome,
                    tipo: item.tipo,
                    total: saidas
                });
            }

            if (item.tipo === 'conta') {
                saldoContas.push({
                    id: item.id,
                    nome: item.nome,
                    entradas,
                    saidas,
                    saldo: arredondar(entradas - saidas)
                });
            }
        }

        res.json({
            periodo: { inicio, fim },
            entradasPorFonte,
            saidasPorDestino,
            contas: saldoContas
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar relatório por fontes e destinos.' });
    }
});

router.get('/faturas', protegerRota, async (req, res) => {
    try {
        const mesesParam = req.query.meses !== undefined ? Number(req.query.meses) : 3;

        if (!Number.isInteger(mesesParam) || mesesParam < 1 || mesesParam > 12) {
            return res.status(400).json({
                erro: 'Dados inválidos.',
                campos: { meses: 'O parâmetro meses deve ser um inteiro entre 1 e 12.' }
            });
        }

        const [cartoes, lancamentos] = await Promise.all([
            Relatorio.listarCartoesCredito(req.auth.id),
            Relatorio.listarLancamentosCartoes(req.auth.id)
        ]);

        const hoje = new Date();
        const hojeISO = hoje.toISOString().slice(0, 10);
        const anoAtual = hoje.getUTCFullYear();
        const mesAtual = hoje.getUTCMonth();

        const resultadoCartoes = cartoes.map((cartao) => {
            const limiteTotal = arredondar(Number(cartao.limite));
            const lancamentosDoCartao = lancamentos.filter((l) => l.cartao_id === cartao.id);

            const parcelasComFatura = lancamentosDoCartao.map((l) => {
                const fatura = calcularFatura(l.data, cartao, l.parcela_atual);
                return { ...l, fatura };
            });

            const limiteUtilizado = arredondar(
                parcelasComFatura
                    .filter((item) => item.fatura.vencimento >= hojeISO)
                    .reduce((acc, item) => acc + Number(item.valor), 0)
            );
            const limiteDisponivel = arredondar(limiteTotal - limiteUtilizado);

            const faturaHoje = calcularFatura(hojeISO, cartao, 1);
            const [anoRefIni, mesRefIni] = faturaHoje.referencia.split('-').map(Number);

            const faturasJanela = [];
            for (let i = 0; i < mesesParam; i++) {
                const dataBase = dataSeguraUTC(anoRefIni, (mesRefIni - 1) + i, 1);
                const ref = dataBase.toISOString().slice(0, 7);

                const diaFech = Number(cartao.dia_fechamento);
                const diaVenc = Number(cartao.dia_vencimento);
                const mesFech = diaVenc > diaFech ? (mesRefIni - 1) + i : (mesRefIni - 1) + i - 1;

                const fechamentoISO = dataSeguraUTC(anoRefIni, mesFech, diaFech).toISOString().slice(0, 10);
                const vencimentoISO = dataSeguraUTC(anoRefIni, (mesRefIni - 1) + i, diaVenc).toISOString().slice(0, 10);

                const itensFatura = parcelasComFatura
                    .filter((item) => item.fatura.referencia === ref)
                    .map((item) => ({
                        id: item.id,
                        descricao: item.descricao,
                        valor: arredondar(Number(item.valor)),
                        data: item.data,
                        parcela: `${item.parcela_atual}/${item.total_parcelas}`,
                        categoria: {
                            id: item.categoria_id,
                            nome: item.categoria_nome
                        }
                    }));

                const valorTotal = arredondar(
                    itensFatura.reduce((acc, item) => acc + item.valor, 0)
                );

                faturasJanela.push({
                    referencia: ref,
                    fechamento: fechamentoISO,
                    vencimento: vencimentoISO,
                    valorTotal,
                    lancamentos: itensFatura
                });
            }

            return {
                cartao: {
                    id: cartao.id,
                    nome: cartao.nome,
                    diaFechamento: Number(cartao.dia_fechamento),
                    diaVencimento: Number(cartao.dia_vencimento)
                },
                limiteTotal,
                limiteUtilizado,
                limiteDisponivel,
                faturas: faturasJanela
            };
        });

        res.json({
            meses: mesesParam,
            cartoes: resultadoCartoes
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar previsão de faturas.' });
    }
});

module.exports = router;