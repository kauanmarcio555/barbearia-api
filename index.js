const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// CONFIGURAÇÃO DA PORTA (Essencial para a Render funcionar)
const port = process.env.PORT || 3000;

// Middlewares para o servidor entender JSON e encontrar a pasta 'public'
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// CONEXÃO COM O BANCO DE DADOS
const db = new sqlite3.Database('./banco.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria a tabela se ela não existir
        db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            data TEXT,
            servico TEXT
        )`);
    }
});

// 1. ROTA PARA SALVAR (Usada pela tela do Cliente)
app.post('/agendamentos', (req, res) => {
    const { nome, data, servico } = req.body;
    const query = `INSERT INTO agendamentos (nome, data, servico) VALUES (?, ?, ?)`;
    
    db.run(query, [nome, data, servico], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Erro ao salvar no banco.");
        }
        res.status(200).send("Agendado com sucesso!");
    });
});

// 2. ROTA PARA LISTAR (Usada pela tela do Admin)
app.get('/agendamentos', (req, res) => {
    db.all(`SELECT * FROM agendamentos ORDER BY data ASC`, [], (err, rows) => {
        if (err) {
            return res.status(500).send("Erro ao buscar dados.");
        }
        res.json(rows);
    });
});

// 3. ROTA PARA EXCLUIR (Usada pelo botão 'Concluir' no Admin)
app.delete('/agendamentos/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM agendamentos WHERE id = ?", [id], (err) => {
        if (err) {
            return res.status(500).send("Erro ao excluir.");
        }
        res.send("Excluído com sucesso");
    });
});

// INICIAR O SERVIDOR
app.listen(port, () => {
    console.log(`Servidor rodando perfeitamente na porta ${port}`);
});