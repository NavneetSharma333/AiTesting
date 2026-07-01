# Langflow AI Agents

This chapter covers building AI agents using **Langflow** — a visual framework for building multi-agent and RAG applications with LLMs.

---

## Setup

### Prerequisites
- Python 3.10+
- Langflow installed (see `install_Langflow/` for local environment)

### Installation
```bash
cd install_Langflow/langflow_env
pip install langflow
langflow run
```

Langflow UI opens at `http://127.0.0.1:7860`.

---

## Flows

### 1. Hello World — Basic Chat Agent

**File:** `Flow_001_Hello_World .json`

A minimal chat agent using the **GroqModel** component. This flow demonstrates the core Langflow pattern:

```
Chat Input → GroqModel → Chat Output
```

- **Input:** User message via Chat Input node
- **Model:** Groq LLM (configurable model, API key)
- **Output:** AI-generated response via Chat Output node

Use this as the starting template for any Langflow agent.

### 2. Local Model Agent with Ollama

**File:** `Flow_with_local_modal_ollama.json`

An agent-based flow using a **local LLM via Ollama**. This flow uses Langflow's Agent component for tool-use capabilities:

```
Chat Input → Agent (Ollama) → Chat Output
```

- **Model:** Local LLM served through Ollama (e.g., Llama 3, Mistral)
- **Agent:** Langflow Agent node with tool-calling support
- **Use Case:** Privacy-sensitive scenarios where data must stay local

---

## Architecture

All flows follow Langflow's node-graph architecture:

| Component | Role |
|-----------|------|
| **Chat Input** | Receives user messages |
| **LLM / Agent** | Processes input with an LLM (Groq or local Ollama) |
| **Chat Output** | Displays the AI response |

Prompts, model parameters, and tools are configurable through each node's settings panel.

---

## Usage

1. Launch Langflow: `langflow run`
2. Open `http://127.0.0.1:7860` in your browser
3. Click **Import** and select one of the `.json` flow files
4. Configure the API key / model settings in the respective nodes
5. Click **Play** to start chatting

---

## Files

| File | Description |
|------|-------------|
| `Flow_001_Hello_World .json` | Basic chat agent using GroqModel |
| `Flow_with_local_modal_ollama.json` | Agent-based flow with local Ollama LLM |
| `install_Langflow/` | Python virtual environment for local Langflow setup |
| `README.md` | This file |
