require('dotenv').config();
const express = require('express');

const app = express();

app.use(express.json());

const rotasUsuarios = require('./routes/usuarios');
const categoriasRoutes = require('./routes/categorias');
const fontesDestinosRoutes = require('./routes/fontesDestinos');

app.use('/auth', rotasUsuarios);
app.use('/categorias', categoriasRoutes);
app.use('/fontes-destinos', fontesDestinosRoutes);

app.use((req, res, next) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ erro: 'Token de acesso ausente ou inválido' });
    }
    
    console.error(err.stack);
    res.status(500).json({ erro: 'Erro interno no servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});