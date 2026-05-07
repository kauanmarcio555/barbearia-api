const express = require('express');
const { Pool } = require('pg'); // Nova biblioteca do banco PostgreSQL
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Conexão com o seu banco de dados na nuvem da Render
const pool = new Pool({
    connectionString: "postgresql://banco_barbearia_hh8r_user:LQwwXdzUmLhkARvBbFPYQVYmPCfm7ler@dpg-d7ttbkdckfvc73ecut60-a/banco_barbearia_hh8r",
    ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cria a tabela de clientes automaticamente no banco novo
pool.query(`
    CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        data TEXT,
        servico TEXT
    )
`).then(() => console.log("Tabela do banco de dados pronta!"))
  .catch(err => console.error("Erro ao criar tabela:", err));

// 1. SALVAR (Com bloqueio de horário repetido)
app.post('/agendamentos', async (req, res) => {
    const { nome, data, servico } = req.body;

    try {
        // Verifica se o horário já está ocupado
        const check = await pool.query("SELECT * FROM agendamentos WHERE data = $1", [data]);
        
        if (check.rows.length > 0) {
            // Se já tiver alguém, ele barra aqui!
            return res.status(400).send("Ops! Este horário já está reservado. Escolha outro.");
        }

        // Se estiver livre, salva no banco novo
        await pool.query(
            "INSERT INTO agendamentos (nome, data, servico) VALUES ($1, $2, $3)", 
            [nome, data, servico]
        );
        res.status(200).send("Agendado com sucesso!");

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar no banco de dados.");
    }
});

// 2. LER (Painel do Admin)
app.get('/agendamentos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM agendamentos ORDER BY data ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

// 3. EXCLUIR (Botão Concluir)
app.delete('/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM agendamentos WHERE id = $1", [id]);
        res.send("Excluído com sucesso");
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao excluir do banco.");
    }
});

app.listen(port, () => {
    console.log(`Servidor profissional rodando na porta ${port}`);
});