# Use of AI (Super Intelligence) in SowSmart

NASA Space Apps 2026 asks teams to say clearly where and how AI ("Super Intelligence", SI) tools were used, and to
label AI-generated content: a visible watermark on images and video, and descriptive text and metadata for audio,
code and data. This file is that statement for the whole project.

## The tool
- **Anthropic Claude (Claude Code)**, a large language model, used as a coding and analysis assistant by both team
  members.
- No other AI tools were used for the website, the data, the graphics, the video or the music.
- The 30-second demo video and its music were also made with Claude. They are labelled as SI-generated (see the
  table below).

## What the AI did, under our direction
- **Code:** it wrote most of the data pipeline (`pipeline/*.py`), the scoring engine (`web/js/scoring.js`) and the
  website (`web/`).
- **Analysis:** it ran the statistical checks (backtest against government yields, extreme-value fits, before/after
  comparisons) and reviewed pull requests.
- **Writing:** it drafted the documentation (`docs/`, this file, the README) and the text shown on the site, in
  English and Tamil.
- **Planning:** it drafted the video storyboard (`docs/video/STORYBOARD.md`) as suggestions for the team.
- **Video and music:** it built the 30-second demo video: the code that draws each animated scene, the captions,
  and the code that synthesises the background music (no samples or third-party audio). The team chose the story,
  reviewed each version and asked for changes.

## What the team did
- **Decisions:** chose the challenge, the region (Tamil Nadu) and the audience (farmers and policy makers).
- **Field work:** interviewed a farmer (`docs/FIELD_NOTES.md`).
- **Oversight:** decided every modelling choice, reviewed every result against sanity checks, and kept a log of
  every change of direction (`docs/RESEARCH_LOG.md`).
- **The idea:** the AI did not come up with it.

## Labels and metadata

| Content | AI involvement | How it is labelled |
|---|---|---|
| Code (`pipeline/`, `web/js/`, `web/*.html`, `web/css/`, and the video and music scripts) | **SI-generated** with Claude, under the team's direction and review | This file and the README's "Use of AI" section. `Co-Authored-By: Claude` on AI-assisted commits in the git history. An `ai-assistance` `<meta>` tag on every page. |
| Data (`web/data/`, `pipeline/data/`) | **Not AI-generated.** Downloaded from NASA and the other listed sources and processed by the SI-assisted code, so the processing steps are SI-assisted. | This file and the README. The data contract (`docs/data_contract.md`) and each file's `source` fields name the original datasets. |
| Charts and maps on the website | Drawn in the browser by the AI-assisted code from the data. No AI image generation. | Footer on every page: "🤖 Built with AI assistance (Claude)", linking to the "Use of AI" section on the references page. |
| Video graphics (`docs/video/*.png`) | Drawn by AI-assisted code (`pipeline/video_assets.py`, matplotlib) from real data. Not AI-generated images. | A visible label on every image ("Chart drawn by AI-assisted code (Claude) from real data · not an AI-generated image") and the same text in the PNG metadata (`Description`, `Software`). |
| Website text (English and Tamil) | Drafted with AI assistance, reviewed by the team | Footer label and the references page section. |
| 30-second demo video | **SI-generated.** Scenes, animation and captions made with Claude under the team's direction (story, review and changes by Nimalan and Subramanian). Graphics are drawn by code from the project's real data and screenshots of the live site. No AI image or video generation model was used. | A visible watermark on every frame: "SI-generated · made with Anthropic Claude: code-drawn graphics, captions, music". The same statement in the MP4 metadata (`comment`, `description`) and in the video's description text when it is uploaded. |
| Music in the demo video | **SI-generated.** Composed and synthesised from scratch by Python code written with Claude (numpy only, no samples, loops or third-party audio). Released under CC0. | The video's watermark names the music. The MP4 audio track is titled "SI-generated music (synthesised by SI-assisted code, CC0)", and the file `comment` says the same. A `MUSIC_LICENCE.md` beside the music source says the same. |

## What we did not do
- **Data:** no AI-generated data is shown as data. Every number traces back to a listed dataset.
- **Branding:** no NASA logos, insignia or mission identifiers appear anywhere in the project. NASA is named only as
  the source of the datasets.
