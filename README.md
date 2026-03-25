# 🚀 allu Growth Ads Manager

Uma ferramenta interna de Growth Ops desenvolvida para automatizar e centralizar a gestão de criativos para **TikTok Ads** e **Meta Ads**, utilizando Inteligência Artificial (**Google Gemini**) para otimização de performance e fluxo de trabalho.

## 🛠️ Stack Tecnológica

* **Frontend:** React.js + TailwindCSS (Vite)
* **Backend:** FastAPI (Python 3.9+)
* **IA:** Google Gemini API (Geração de Copy Contextualizada)
* **Banco de Dados:** SQLite (Persistência local de configurações e cards)
* **Marketing APIs:** TikTok Business API (Meta Ads em desenvolvimento)

## ✨ Funcionalidades Principais

### 1. Kanban de Fluxo de Trabalho
Gerenciamento visual do ciclo de vida dos criativos através das fases:
* **Fila:** Recebimento e higienização automática de nomes.
* **Aguardando Upload:** Configuração de copy e seleção de destino.
* **Subido:** Confirmação de publicação nas plataformas.
* **Erro:** Log de falhas para correção rápida.

### 2. Higienização Inteligente de Nomenclatura
O sistema remove automaticamente ruídos de arquivos (`allu-ads-`, `vert`, `stories`, `v1`, etc.) e padroniza os nomes para as plataformas:
* `VD_[NOME_LIMPO]` para vídeos.
* `IMG_[NOME_LIMPO]` para imagens.

### 3. Geração de Copy Contextual (Gemini AI)
Integração com Gemini para gerar legendas e títulos baseados em:
* **Contexto da Marca:** Upload de arquivos (.txt/.pdf) com diretrizes da marca.
* **Few-shot Learning:** Exemplos de copies de alta performance salvos nas configurações.
* **Restrições Rígidas:** TikTok: máx. 100 caracteres. Meta: Primary Text 125 / Headline 40 / Description 30 chars. Sem emojis, marca **allu** sempre em minúsculas.

### 4. Publicação Multi-Plataforma
Seleção dinâmica de Campanhas e Adsets diretamente pela interface, permitindo subir um único criativo para múltiplos conjuntos de anúncios simultaneamente.

## 🚀 Como Rodar Localmente

### Pré-requisitos
* Node.js instalado
* Python 3.9+ instalado

### 1. Configuração do Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

O backend estará disponível em `http://localhost:8000`.

### 2. Configuração do Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

### 3. Variáveis de Ambiente

Crie um arquivo `.env` dentro da pasta `backend/` com as seguintes chaves:

```env
GEMINI_API_KEY=sua_chave_aqui
TIKTOK_APP_ID=seu_app_id_aqui
TIKTOK_SECRET=seu_secret_aqui
TIKTOK_ACCESS_TOKEN=seu_token_aqui
TIKTOK_ADVERTISER_ID=seu_advertiser_id_aqui
```

> As configurações de UTM, copies de referência e arquivo de contexto da marca são gerenciadas diretamente pela interface em **Configurações**.

## 📁 Estrutura do Projeto

```
allu-ads/
├── backend/
│   ├── main.py               # Entry point FastAPI
│   ├── routers/
│   │   ├── creatives.py      # CRUD e upload de criativos
│   │   ├── tiktok.py         # Integração TikTok Ads
│   │   ├── meta.py           # Integração Meta Ads
│   │   ├── insights.py       # Dashboard de métricas
│   │   └── settings.py       # Configurações da ferramenta
│   ├── services/
│   │   ├── database.py       # SQLite helpers
│   │   └── gemini.py         # Geração de copy via Gemini
│   └── uploads/              # Arquivos enviados pelos usuários
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Kanban.jsx     # Quadro principal de criativos
    │   │   ├── Insights.jsx   # Página de métricas
    │   │   └── Settings.jsx   # Configurações
    │   ├── App.jsx
    │   └── api.js             # Camada de comunicação com o backend
    └── index.html
```
