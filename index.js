const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: "postgresql://banco_barbearia_hh8r_user:LQwwXdzUmLhkARvBbFPYQVYmPCfm7ler@dpg-d7ttbkdckfvc73ecut60-a/banco_barbearia_hh8r",
    ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. CRIAÇÃO E ATUALIZAÇÃO DAS TABELAS
const criarTabelas = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS agendamentos (
                id SERIAL PRIMARY KEY,
                nome TEXT,
                telefone TEXT,
                data TEXT,
                servico TEXT
            )
        `);

        // Garante que a coluna telefone exista
        await pool.query(`ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS telefone TEXT;`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS faturamentos (
                id SERIAL PRIMARY KEY,
                data TEXT UNIQUE,
                valor DECIMAL(10, 2) DEFAULT 0.00
            )
        `);
        console.log("Tabelas do banco de dados prontas e atualizadas!");
    } catch (err) {
        console.error("Erro ao criar/atualizar tabelas:", err);
    }
};

criarTabelas();

// --- ROTAS DE AGENDAMENTO ---

app.post('/agendamentos', async (req, res) => {
    const { nome, telefone, data, servico } = req.body;

    try {
        // --- LOGICA DE DATA E HORA ---
        const dataEscolhida = new Date(data);
        const diaSemana = dataEscolhida.getDay(); // 0 = Domingo
        const hora = dataEscolhida.getHours();

        // 1. Bloqueio de Domingo
        if (diaSemana === 0) {
            return res.status(400).send("A barbearia está fechada aos domingos. Escolha outro dia!");
        }

        // 2. Bloqueio fora do Horário Comercial (09:00 às 19:00)
        if (hora < 9 || hora >= 19) {
            return res.status(400).send("Nosso horário de atendimento é das 09:00 às 19:00.");
        }

        // 3. Verificação de Choque de Horários
        const check = await pool.query("SELECT * FROM agendamentos WHERE data = $1", [data]);
        if (check.rows.length > 0) {
            return res.status(400).send("Ops! Este horário já está reservado. Escolha outro.");
        }

        // Se passou em tudo, salva no banco
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

app.get('/agendamentos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM agendamentos ORDER BY data ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

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

app.post('/faturamentos', async (req, res) => {
    const { data, valor } = req.body;
    
    try {
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

app.get('/faturamentos', async (req, res) => {
    try {
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