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

    router.get('/saude-financeira', protegerRota, async (req, res) => {
    try {
        const mesesProjecao = req.query.meses !== undefined ? Number(req.query.meses) : 3;

        if (!Number.isInteger(mesesProjecao) || mesesProjecao < 1 || mesesProjecao > 12) {
            return res.status(400).json({
                erro: 'Dados inválidos.',
                campos: { meses: 'O parâmetro meses deve ser um inteiro entre 1 e 12.' }
            });
        }

        const hoje = new Date();
        const hojeISO = hoje.toISOString().slice(0, 10);
        const anoAtual = hoje.getUTCFullYear();
        const mesAtual = hoje.getUTCMonth();

        // Janela histórica: últimos 3 meses (incluindo o mês atual)
        const inicioHistorico = dataSeguraUTC(anoAtual, mesAtual - 2, 1).toISOString().slice(0, 10);
        const fimHistorico = dataSeguraUTC(anoAtual, mesAtual + 1, 0).toISOString().slice(0, 10);

        // Janela futura para parcelas já agendadas
        const inicioFuturo = dataSeguraUTC(anoAtual, mesAtual + 1, 1).toISOString().slice(0, 10);
        const fimFuturo = dataSeguraUTC(anoAtual, mesAtual + mesesProjecao + 1, 0).toISOString().slice(0, 10);

        const [historico, cartoes, lancamentosCartoes] = await Promise.all([
            Relatorio.resumoMensal(req.auth.id, inicioHistorico, fimHistorico),
            Relatorio.listarCartoesCredito(req.auth.id),
            Relatorio.listarLancamentosCartoes(req.auth.id)
        ]);

        // 1. Indicadores de Entradas, Saídas e Poupança
        const totalEntradas = historico.reduce((acc, m) => acc + Number(m.entradas), 0);
        const totalSaidas = historico.reduce((acc, m) => acc + Number(m.saidas), 0);
        const saldoPeriodo = arredondar(totalEntradas - totalSaidas);
        const mesesComDados = historico.length || 1;

        const mediaEntradas = arredondar(totalEntradas / mesesComDados);
        const mediaSaidas = arredondar(totalSaidas / mesesComDados);

        const comprometimentoRenda = totalEntradas > 0
            ? arredondar((totalSaidas / totalEntradas) * 100)
            : (totalSaidas > 0 ? 100 : 0);

        const taxaPoupanca = totalEntradas > 0
            ? arredondar(((totalEntradas - totalSaidas) / totalEntradas) * 100)
            : 0;

        // 2. Indicador de Uso do Limite de Cartão
        const limiteTotal = arredondar(cartoes.reduce((acc, c) => acc + Number(c.limite || 0), 0));
        let limiteUtilizado = 0;

        for (const cartao of cartoes) {
            const lancsDoCartao = lancamentosCartoes.filter((l) => l.cartao_id === cartao.id);
            for (const l of lancsDoCartao) {
                const fatura = calcularFatura(l.data, cartao, l.parcela_atual);
                if (fatura.vencimento >= hojeISO) {
                    limiteUtilizado += Number(l.valor);
                }
            }
        }
        limiteUtilizado = arredondar(limiteUtilizado);
        const usoLimiteCartao = limiteTotal > 0
            ? arredondar((limiteUtilizado / limiteTotal) * 100)
            : 0;

        // Classificação geral
        let classificacao = 'saudavel';
        if (comprometimentoRenda > 90 || taxaPoupanca < 0 || usoLimiteCartao > 80) {
            classificacao = 'critica';
        } else if (comprometimentoRenda > 70 || taxaPoupanca < 15 || usoLimiteCartao > 50) {
            classificacao = 'atencao';
        }

        // 3. Projeção mês a mês
        // Parcelas são agrupadas pela fatura em que caem (a data gravada é a da compra)
        const mapaParcelas = new Map();
        for (const l of lancamentosCartoes) {
            if (Number(l.total_parcelas) <= 1) continue;
            const cartao = cartoes.find((c) => c.id === l.cartao_id);
            if (!cartao) continue;
            const { referencia } = calcularFatura(l.data, cartao, l.parcela_atual);
            mapaParcelas.set(referencia, (mapaParcelas.get(referencia) || 0) + Number(l.valor));
        }

        const projecaoMensal = [];
        let saldoAcumulado = saldoPeriodo;

        for (let i = 1; i <= mesesProjecao; i++) {
            const dataProj = dataSeguraUTC(anoAtual, mesAtual + i, 1);
            const mesRef = dataProj.toISOString().slice(0, 7);
            const parcelasAgendadas = arredondar(mapaParcelas.get(mesRef) || 0);
            const saidaEstimada = arredondar(mediaSaidas + parcelasAgendadas);
            const saldoMes = arredondar(mediaEntradas - saidaEstimada);
            saldoAcumulado = arredondar(saldoAcumulado + saldoMes);

            projecaoMensal.push({
                mes: mesRef,
                entradasEstimadas: mediaEntradas,
                saidasEstimadas: saidaEstimada,
                parcelasAgendadas,
                saldoMes,
                saldoAcumulado
            });
        }

        // 4. Dicas geradas a partir dos dados reais
        const dicas = [];

        if (totalEntradas === 0 && totalSaidas === 0) {
            dicas.push('Registre suas entradas e saídas para receber análises e recomendações personalizadas.');
        } else {
            if (taxaPoupanca < 0) {
                dicas.push(`Suas saídas superaram suas entradas no período (saldo de R$ ${saldoPeriodo.toFixed(2)}). Revise gastos não essenciais com prioridade.`);
            } else if (taxaPoupanca < 15) {
                dicas.push(`Sua taxa de poupança está em ${taxaPoupanca}%. Tente direcionar pelo menos 15% a 20% da renda para reserva de emergência.`);
            } else {
                dicas.push(`Excelente disciplina! Você poupou ${taxaPoupanca}% da sua renda no período.`);
            }

            if (comprometimentoRenda > 80) {
                dicas.push(`Atenção: ${comprometimentoRenda}% da sua renda está comprometida com saídas. Isso reduz sua margem para imprevistos.`);
            }

            if (limiteTotal > 0 && usoLimiteCartao > 50) {
                dicas.push(`Você está utilizando ${usoLimiteCartao}% do limite total dos seus cartões (R$ ${limiteUtilizado.toFixed(2)} de R$ ${limiteTotal.toFixed(2)}). Evite novos parcelamentos.`);
            } else if (limiteTotal > 0) {
                dicas.push(`Uso saudável do crédito: apenas ${usoLimiteCartao}% do limite total dos seus cartões está comprometido.`);
            }

            const mesNegativo = projecaoMensal.find((p) => p.saldoMes < 0);
            if (mesNegativo) {
                dicas.push(`Na projeção, o mês ${mesNegativo.mes} apresenta saldo negativo estimado de R$ ${mesNegativo.saldoMes.toFixed(2)}. Planeje reduzir gastos antes desse período.`);
            }
        }

        res.json({
            aviso: 'Informações educativas; não constituem recomendação financeira profissional.',
            periodoAnalisado: { inicio: inicioHistorico, fim: fimHistorico },
            classificacao,
            indicadores: {
                taxaPoupanca,
                comprometimentoRenda,
                usoLimiteCartao,
                saldoPeriodo,
                mediaMensalEntradas: mediaEntradas,
                mediaMensalSaidas: mediaSaidas
            },
            projecaoMensal,
            dicas
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar relatório de saúde financeira.' });
    }
});

module.exports = router;