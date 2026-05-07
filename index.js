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

// 1. CRIAÇÃO DAS TABELAS
const criarTabelas = async () => {
    try {
        // Tabela de Agendamentos (AGORA COM TELEFONE)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS agendamentos (
                id SERIAL PRIMARY KEY,
                nome TEXT,
                telefone TEXT,
                data TEXT,
                servico TEXT
            )
        `);

        // Tabela de Faturamentos Diários (NOVIDADE)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS faturamentos (
                id SERIAL PRIMARY KEY,
                data TEXT UNIQUE,
                valor DECIMAL(10, 2) DEFAULT 0.00
            )
        `);
        console.log("Tabelas do banco de dados prontas!");
    } catch (err) {
        console.error("Erro ao criar tabelas:", err);
    }
};

criarTabelas();

// --- ROTAS DE AGENDAMENTO ---

// SALVAR NOVO AGENDAMENTO
app.post('/agendamentos', async (req, res) => {
    // Agora recebe o telefone também
    const { nome, telefone, data, servico } = req.body;

    try {
        // Verifica se o horário já está ocupado
        const check = await pool.query("SELECT * FROM agendamentos WHERE data = $1", [data]);
        
        if (check.rows.length > 0) {
            return res.status(400).send("Ops! Este horário já está reservado. Escolha outro.");
        }

        // Salva no banco com o telefone
        await pool.query(
            "INSERT INTO agendamentos (nome, telefone, data, servico) VALUES ($1, $2, $3, $4)", 
            [nome, telefone, data, servico]
        );
        res.status(200).send("Agendado com sucesso!");

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar no banco de dados.");
    }
});

// LER AGENDAMENTOS (Painel do Admin)
app.get('/agendamentos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM agendamentos ORDER BY data ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

// EXCLUIR AGENDAMENTO (Quando conclui ou cancela)
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


// --- ROTAS DE FATURAMENTO ---

// SALVAR OU ATUALIZAR FATURAMENTO DO DIA
app.post('/faturamentos', async (req, res) => {
    const { data, valor } = req.body;
    
    try {
        // Tenta inserir. Se a data já existir (ON CONFLICT), ele soma o valor novo ao valor existente.
        await pool.query(`
            INSERT INTO faturamentos (data, valor) 
            VALUES ($1, $2)
            ON CONFLICT (data) 
            DO UPDATE SET valor = faturamentos.valor + EXCLUDED.valor;
        `, [data, valor]);
        
        res.status(200).send("Faturamento atualizado!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar faturamento.");
    }
});

// LER HISTÓRICO DE FATURAMENTOS
app.get('/faturamentos', async (req, res) => {
    try {
        // Busca os faturamentos ordenados pela data mais recente
        const result = await pool.query("SELECT * FROM faturamentos ORDER BY data DESC LIMIT 30");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar faturamentos.");
    }
});


app.listen(port, () => {
    console.log(`Servidor profissional rodando na porta ${port}`);
});