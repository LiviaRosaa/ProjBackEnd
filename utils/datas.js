function validarDataUTC(dataStr) {
    if (typeof dataStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        return false;
    }
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return (
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia
    );
}

function adicionarMesesUTC(dataStr, mesesParaAdicionar) {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const totalMeses = (mes - 1) + mesesParaAdicionar;
    const novoAno = ano + Math.floor(totalMeses / 12);
    const novoMes = totalMeses % 12;

    const ultimoDiaDoMes = new Date(Date.UTC(novoAno, novoMes + 1, 0)).getUTCDate();
    const novoDia = Math.min(dia, ultimoDiaDoMes);

    const mm = String(novoMes + 1).padStart(2, '0');
    const dd = String(novoDia).padStart(2, '0');
    return `${novoAno}-${mm}-${dd}`;
}

module.exports = { validarDataUTC, adicionarMesesUTC };