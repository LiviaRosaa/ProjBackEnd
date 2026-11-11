require('dotenv').config();
const express = require('express');

const app = express();

app.use(express.json());

const rotasUsuarios = require('./routes/usuarios');
const categoriasRoutes = require('./routes/categorias');


app.use('/usuarios', rotasUsuarios);
app.use('/categorias', categoriasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});