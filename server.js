require('dotenv').config();
const express = require('express');

const app = express();

app.use(express.json());

const rotasUsuarios = require('./routes/usuarios');
app.use('/usuarios', rotasUsuarios);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});