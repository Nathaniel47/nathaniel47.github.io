An agent that can send email, edit a calendar, query a database and run code acts with its user's authority, but it also reads text written by other people: web pages, inbox messages, calendar titles, database rows and notes saved in earlier sessions. Any of that text can contain instructions, and the model cannot reliably tell them apart from the user's own. Many defences have been proposed, yet they are usually shown one at a time, against one kind of attack, on a system built to demonstrate them.

I built **AgentGuard** to ask a more practical question: for one small agent, *which* defence stops *which* kind of attack, at what cost to normal work, and how sure can we be? This post covers how I measured it, what I found, and the questions it leaves open.

## The setup

The agent is a plain Python loop, with no agent framework, so every step and decision is visible. It has five tools: search over a small document set, a sandboxed Python runner, a calendar, a mock email (it writes to an outbox and never sends anything) and a database of invented customers. Every tool result is tagged as trusted or untrusted, and a long-term memory records where each note came from.

Five guardrails wrap it, each a separate switchable hook:

- **G1, input screen:** pattern-based detection of override wording, fake system markers and role-play.
- **G2, tool policy:** least privilege. Email only to the company domain, a read-only database, no calendar deletes, call caps and a strict code sandbox.
- **G3, taint:** once untrusted content is in the context, refuse tools that change the world or send data out.
- **G4, memory write gate:** refuse notes that look like standing orders or impersonate the system.
- **G5, output filter:** redact secrets, canary tokens and personal-data shapes from the answer.

A red-team harness runs 220 attacks (direct and indirect injection, jailbreaks, tool abuse, memory poisoning, data exfiltration and sandbox escape) and 40 benign tasks. **Success is read from system state, never judged by a model:** a canary in the answer, a mail to the attacker's address in the outbox, a deleted row, a file written outside the sandbox. Thirty percent of the cases were used to tune the guardrails and the rest were held out for reporting.

## What the literature says

Greshake et al. showed that applications built on language models blur the line between data and instructions, which makes *indirect* prompt injection possible: the attacker never talks to the model, only plants text where it will be read [1]. InjecAgent [2] and AgentDojo [3] turned this into benchmarks for tool-using agents, and AgentDojo is deliberately an extensible environment rather than a fixed test set, because attacks and defences keep changing. AgentPoison extended the threat to agents with memory or knowledge bases, where poisoned entries are retrieved to inform later planning [4]. On the defence side, CaMeL argues for a design-level answer, extracting control and data flow from the trusted request so that untrusted data can never change the program flow [5]. My taint guardrail is a much cruder cousin of that idea.

## What I measured

I ran the harness two ways. A deterministic scripted agent that obeys every instruction it reads gives a free, repeatable worst case. A real model (`gpt-oss-20b` through Groq's free tier) ran a seeded sample of 21 held-out attacks and 8 benign tasks under every configuration.

- **Defences are complementary.** On the 154 held-out test attacks, the worst-case agent lost 92% with no guardrails and 0 with all five. The input screen cut direct injection from 100% to 21% and jailbreaks to 14%, but did nothing for attacks arriving through tool results. Taint and tool policy cut indirect injection from 100% to 11%. The memory gate removed all 21 memory-poisoning successes and affected nothing else.
- **Least privilege beat detection.** Tool policy was the strongest single guardrail on both agents (31% attack success on the worst-case agent, 5% on the real model). A blocklist of famous injection phrases changed nothing.
- **The real model fails in different places.** It ignored all three sampled indirect injections but carried out all three tool-abuse requests, because the user had asked for them. That is a policy failure that no injection detector fixes. With no guardrails 8 of 21 attacks succeeded; with all five, 0 of 21, though with a sample that small the true rate could still be about 15%. Across three seeds the unprotected rate was 38%, 48% and 38%.
- **No sampled benign task was blocked**, but the benign tasks are single-step lookups, so this understates the cost of guardrails that refuse read-then-act workflows.

The most useful lesson was about the harness itself. My first real-model run looked plausible and was wrong: the model answered in a different JSON shape than I had asked for, some replies came back as API errors that still carried the text, typographic dashes broke exact matching, a refusal that quoted a marker was scored as a leak, and one guardrail crashed on a malformed argument. A guardrail that crashes is itself a vulnerability, so the loop now fails closed. I fixed each problem, discarded the affected runs, and checked that replaying the final run from cache reproduced every outcome. The scripted agent could never have revealed any of this.

## Open questions I want to pursue

- **Adaptive attackers.** Every attack here is a fixed string played once, and I wrote the guardrails while looking at the style of the tuning cases. How much of the protection survives an attacker who sees refusals and adapts?
- **Finer-grained taint.** Refusing every sensitive tool after any untrusted read is blunt. How close can a practical system get to the data-flow guarantees of [5] without rewriting how agents are built, and what does that cost on multi-step tasks?
- **Memory provenance.** My write gate is a rule list. Can provenance-aware memory be made robust to paraphrase, and how should it treat notes that are useful *and* originated from untrusted content [4]?
- **Evaluation validity.** A worst-case agent is cheap and a real model is expensive and noisy. How should results from the two be combined, and how large must a real-model sample be before differences between guardrails mean anything?

I'm interested in **the security and reliable evaluation of LLM agents and their memory**, and would be glad to discuss these questions with researchers working on agent safety, adversarial robustness or evaluation methodology.

The code, data and run records are on [GitHub](https://github.com/Nathaniel47/agentguard), including a limitations file that lists where the results are weak.

## References

1. K. Greshake, S. Abdelnabi, S. Mishra, C. Endres, T. Holz and M. Fritz (2023). Not what you've signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection. [arXiv:2302.12173](https://arxiv.org/abs/2302.12173)
2. Q. Zhan, Z. Liang, Z. Ying and D. Kang (2024). InjecAgent: Benchmarking indirect prompt injections in tool-integrated large language model agents. [arXiv:2403.02691](https://arxiv.org/abs/2403.02691)
3. E. Debenedetti, J. Zhang, M. Balunović, L. Beurer-Kellner, M. Fischer and F. Tramèr (2024). AgentDojo: A dynamic environment to evaluate prompt injection attacks and defenses for LLM agents. [arXiv:2406.13352](https://arxiv.org/abs/2406.13352)
4. Z. Chen, Z. Xiang, C. Xiao, D. Song and B. Li (2024). AgentPoison: Red-teaming LLM agents via poisoning memory or knowledge bases. [arXiv:2407.12784](https://arxiv.org/abs/2407.12784)
5. E. Debenedetti, I. Shumailov, T. Fan, J. Hayes, N. Carlini, D. Fabian, C. Kern, C. Shi, A. Terzis and F. Tramèr (2025). Defeating prompt injections by design. [arXiv:2503.18813](https://arxiv.org/abs/2503.18813)
