function ultimoDiaDoMes(ano, mes) {
    return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function dataSeguraUTC(ano, mes, dia) {
    const anoAjustado = ano + Math.floor(mes / 12);
    const mesAjustado = ((mes % 12) + 12) % 12;
    const diaAjustado = Math.min(dia, ultimoDiaDoMes(anoAjustado, mesAjustado));
    return new Date(Date.UTC(anoAjustado, mesAjustado, diaAjustado));
}

function formatarDataISO(dataUTC) {
    return dataUTC.toISOString().slice(0, 10);
}

/**
 * @param {string} dataCompra - Data no formato 'AAAA-MM-DD'
 * @param {object} cartao - Objeto vindo do banco ({ dia_fechamento, dia_vencimento }) ou camelCase
 * @param {number} numeroParcela - Número da parcela atual (1 a N)
 */

function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
    const diaFechamento = Number(cartao.dia_fechamento ?? cartao.diaFechamento);
    const diaVencimento = Number(cartao.dia_vencimento ?? cartao.diaVencimento);

    const [ano, mes, dia] = dataCompra.split('-').map(Number);
    const mesZeroBased = mes - 1;
    
    const fechamentoMesCompra = Math.min(diaFechamento, ultimoDiaDoMes(ano, mesZeroBased));
    let mesFechamento = dia < fechamentoMesCompra ? mesZeroBased : mesZeroBased + 1;

    mesFechamento += (Number(numeroParcela) - 1);

    const dataFechamento = dataSeguraUTC(ano, mesFechamento, diaFechamento);
    const mesVencimento = diaVencimento > diaFechamento ? mesFechamento : mesFechamento + 1;
    const dataVencimento = dataSeguraUTC(ano, mesVencimento, diaVencimento);

    const vencimentoISO = formatarDataISO(dataVencimento);

    return {
        referencia: vencimentoISO.slice(0, 7),
        fechamento: formatarDataISO(dataFechamento),
        vencimento: vencimentoISO
    };
}

module.exports = {
    calcularFatura,
    ultimoDiaDoMes,
    dataSeguraUTC
};