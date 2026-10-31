# LLM context windows (slide 2)

The timeline right after the cover: release date of each model (x) against its context window in tokens
(y, log scale from 1K to 10M), with the launch of four tools marked on the time axis. The slide has no title
or text besides these labels.

`build_timeline.py` holds the data and writes the SVG between the `linha-do-tempo` markers of
`../../index.html`:

```bash
python build_timeline.py            # rewrite the block
python build_timeline.py --check    # confirm index.html holds exactly that block
```

## Models

Context size at launch (the number the vendor announced on release day).

| Model | Release | Context | Note |
|---|---|---|---|
| GPT-3 | Jun 2020 | 2K (2,048) | OpenAI API |
| ChatGPT (GPT-3.5) | Nov 2022 | 4K (4,096) | |
| GPT-4 | Mar 2023 | 8K (8,192) | a 32K version was announced alongside |
| Claude 2 | Jul 2023 | 100K | |
| GPT-4 Turbo | Nov 2023 | 128K | |
| Gemini 1.5 Pro | Feb 2024 | 1M | later 2M |
| Claude 3 | Mar 2024 | 200K | |
| Llama 3.1 | Jul 2024 | 128K | open weights |
| Llama 4 Scout | Apr 2025 | 10M | open weights, announced figure |
| GPT-4.1 | Apr 2025 | 1M | |
| GPT-5 | Aug 2025 | 400K | API |
| Claude Opus 4.6 | Feb 2026 | 1M | in beta at launch, generally available in March 2026 |

## Tools

| Tool | Launch | Note |
|---|---|---|
| LangChain | Oct 2022 | first public release of the open-source library |
| Langflow | Feb 2023 | released by Logspace (Brazil) as a visual builder for LangChain |
| Cursor | Mar 2023 | public launch of the editor by Anysphere |
| Claude Code | Feb 2025 | research preview, released with Claude 3.7 Sonnet; generally available in May 2025 |

## Sources

Vendor announcements and model cards of each model (OpenAI, Anthropic, Google, Meta). Checked in October 2026;
Langflow and Cursor launch months come from secondary sources (no primary announcement with the exact day was
found), e.g. https://www.noze.it/en/insights/langflow-open-source and https://komo.ai/directory/anysphere.
