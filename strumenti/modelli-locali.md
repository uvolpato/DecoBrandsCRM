# Modelli locali per scrivere il codice: considerazioni (02/11/2026)

Domanda di Ugo: si possono far girare in locale modelli che scrivono codice buono per questa app?
Le considerazioni valgono per i modelli noti a metà 2026: prima di comprare, verifica le versioni
più nuove.

## Con la RTX 5060 Ti da 16 GB

- **Cosa ci gira:**
  - modelli MoE con pochi parametri attivi, come Qwen3-Coder-30B-A3B in Q4 (circa 18 GB, una
    parte va nella RAM); sono veloci lo stesso, perché a ogni passo lavorano solo circa 3 miliardi
    di parametri;
  - modelli densi da 14–24 miliardi di parametri in Q4, come Devstral Small o Qwen-Coder 14B.
- **Il limite vero è il contesto.** Un lavoro su questa app legge CLAUDE.md, parti della spec e
  diversi file: servono 50–100 mila token. Con 16 GB si arriva a circa 32–64 mila, e oltre i 32
  mila questi modelli peggiorano molto. Tendono anche a dimenticare le regole fitte del progetto
  (V12, V13, D-xx, transazioni, `FOR UPDATE`).
- **Uso consigliato:** solo per i lavori da Haiku, cioè rinomine, testi, guida, piccole correzioni
  di stile e ritocchi alle prove. Si collegano a OpenCode attraverso Ollama, LM Studio o
  llama.cpp, con l'interfaccia compatibile con OpenAI.

## Con 128 GB di memoria condivisa (DGX Spark o simili)

- **Cosa ci gira:**
  - gpt-oss-120b (circa 65 GB);
  - GLM-4.5-Air o il suo successore in Q4 (circa 65–70 GB), tra i migliori per lavorare da agente
    su più file;
  - Qwen3-235B-A22B in Q3 (circa 100 GB, ci sta appena).
- **Contesto:** da 64 a 128 mila token, abbastanza per i lavori da Sonnet.
- **Limite:** la banda di memoria, circa 273 GB/s sulla Spark. Con i modelli MoE si scrivono
  20–40 token al secondo, che per un agente va bene; i modelli densi grandi sono lenti.
- **Alternative:**
  - mini PC con Ryzen AI Max+ 395 (Strix Halo, 128 GB): costa circa metà, ma il software (ROCm,
    Vulkan) è meno comodo dello stack NVIDIA;
  - Mac Studio: più banda, ma niente CUDA.
- **Prima di comprare:** prova un modello di codice sul server GPU che serve già per GLM-OCR
  (vLLM), se ha memoria libera.

## Conti e scelta

- DeepSeek via API costa pochi euro al mese per il volume di questa app: una Spark (circa 4.000 €)
  non si ripaga col risparmio.
- Ha senso per due motivi:
  1. il **codice resta in casa**, e conta perché è software proprietario (patent box, D-43);
  2. si usano gli **stessi modelli locali** della fase LLM dell'app (spec §18,
     `specifica-automazione-llm.md`).
- **Oggi:**
  - lavori da Sonnet → DeepSeek in OpenCode;
  - lavori da Opus → Claude;
  - lavori da Haiku → si può provare il modello locale da 16 GB. Una prova utile: lo stesso
    lavoro piccolo fatto anche da DeepSeek, poi si confrontano i risultati.
