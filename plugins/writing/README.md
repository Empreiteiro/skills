# Writing skills

Text a person will read, written so it does not read as AI: a brand voice system that runs two editing passes, and
one craft skill per form.

| Skill | Use it when a task… |
|---|---|
| `write` | Writes or reviews brand copy: UI strings, emails, ads, captions, landing pages, PR descriptions, support replies |
| `no-ai-slop` | Needs AI-slop patterns flagged line by line and cut, keeping the writer's voice |
| `humanizer` | Has text that still reads as AI and needs rewriting without changing what it says |
| `writing-academic-research` | Papers, abstracts, literature reviews, theses, responses to reviewers |
| `writing-blog-posts` | How-tos, tutorials, explainers, postmortems, announcements |
| `writing-books-fiction` | Novels, short stories, scenes, dialogue, opening pages |
| `writing-business-legal` | Contracts, memos, reports, proposals, grant applications |
| `writing-essays` | Personal and argument essays, columns, op-eds |
| `writing-ghostwriting` | Books, bylined articles, founder posts and speeches under someone else's name |
| `writing-journalism` | News, features, profiles, explainers, investigations, headlines |
| `writing-marketing-copy` | Landing and product pages, ads, launch emails, taglines, calls to action |
| `writing-newsletters` | Issues, subject lines and preview text, link digests, product updates |
| `writing-nonfiction-memoir` | Memoir, personal and reported narrative, biography, trade nonfiction |
| `writing-poetry` | Free verse, prose poems, fixed forms, spoken word, collections |
| `writing-scripts-speeches` | Screen and stage scripts, video and podcast scripts, talks, toasts |
| `writing-social-media` | LinkedIn and X posts, threads, captions, carousel text, replies |
| `writing-technical` | READMEs, tutorials, API references, runbooks, release notes, interface copy |

## The brand voice

`write` reads two templates, `skills/write/references/voice-dna.md` and `skills/write/references/opinion-dna.md`.
The first time it runs without them filled, it asks for two or three samples of copy you like and drafts both from
them. Keep the filled copies in your project, for example in `.claude/brand/`, so a plugin update does not overwrite
them. Then the order is: draft, check every claim against what the product does today, `no-ai-slop`, `humanizer` on
what is still flagged, and a last pass against the AI tells.

`humanizer` ([blader/humanizer](https://github.com/blader/humanizer)) and `no-ai-slop`
([petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop)) are vendored unedited under their MIT licenses.
Each craft skill credits the sources it was built from at the end.

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install writing@empreiteiro-skills
```

Skills are then available as `/writing:write`, `/writing:writing-essays` and so on, and Claude loads them on its own
when a task matches. Copying by hand: keep `write`, `no-ai-slop` and `humanizer` together.
