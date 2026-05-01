const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();

// Configurações iniciais
app.use(express.json());
// Garante que a pasta public seja encontrada em qualquer servidor
app.use(express.static(path.join(__dirname, 'public')));

let db;

// Função para conectar ao Banco de Dados (usando caminho absoluto)
async function conectarBanco() {
    db = await open({
        filename: path.join(__dirname, 'barbearia.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT,
            servico TEXT,
            data TEXT,
            hora TEXT
        )
    `);
}

conectarBanco();

const servicos = [
    { id: 1, nome: "Corte Simples" },
    { id: 2, nome: "Barba Completa" },
    { id: 3, nome: "Corte + Barba" }
];

// Rota para listar agendamentos
app.get('/agendamentos', async (req, res) => {
    try {
        const lista = await db.all('SELECT * FROM agendamentos');
        res.json(lista);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao buscar dados" });
    }
});

// Rota para criar agendamento
app.post('/agendamentos', async (req, res) => {
    const { cliente, servicoId, data, hora } = req.body;
    const servicoEscolhido = servicos.find(s => s.id === servicoId);

    if (!servicoEscolhido) {
        return res.status(400).json({ erro: "Serviço inválido" });
    }

    try {
        await db.run(
            'INSERT INTO agendamentos (cliente, servico, data, hora) VALUES (?, ?, ?, ?)',
            [cliente, servicoEscolhido.nome, data, hora]
        );
        res.status(201).json({ mensagem: "Salvo com sucesso!" });
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao salvar no banco" });
    }
});

// A mágica para o site funcionar na nuvem:
// O servidor da Render vai dizer em qual porta rodar através de process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema da Barbearia online na porta ${PORT}`);
});