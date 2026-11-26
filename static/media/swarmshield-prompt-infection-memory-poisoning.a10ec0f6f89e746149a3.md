Teams of language-model agents read documents, keep shared notes and send each other messages. Every one of those is a way for text to become an instruction. If one agent obeys a planted instruction that also says "copy me into every message", the next agent reads it too. If someone writes a bad note into shared memory, every agent that retrieves it is exposed. I wanted to know how far such an attack travels, and which defences stop it.

I built **SwarmShield** to study this on a small scale: a planner, three researchers and two writers, in plain Python, arranged as a chain, a star or a mesh. This post covers what my simulator predicted, and where a real model disagreed with it. The second part changed my mind about the first, so please read both.

## The setup

Agents share two channels. **Messages** go only to neighbours in the network and travel one hop per round. **Shared memory** is global. Each task asks for a short report on an invented place, and every required fact is a number in a synthetic document, so success can be checked without a model as judge.

There are two attacks. **Prompt infection** hides a notice in one document that asks the agent to write a marker string and to copy the notice onward. **Memory poisoning** plants one note in shared memory, either from an unknown author or forged to look like a real agent's note. The only "harm" is the marker, a unique code per run, so an agent counts as infected when the code shows up in its output. I took the attackers' wording from the public InjecAgent [5] and AgentDojo [6] suites as cover text.

There are three defences. **D1, provenance tags**, blocks memory writes whose author or cited sources do not check out, and labels untrusted content as data in the prompt. **D2, a sanitiser**, keeps only factual sentences in messages between agents. **D3, a majority check**, builds the final report from what at least two of three drafts agree on.

Free model tiers allow too few calls for thousands of runs, so the large experiments use a **scripted agent**: a rule-based stand-in that obeys planted text with a probability I set. That makes runs free and repeatable. It also means every simulated number is only as good as that assumption.

## What the literature says

Lee and Tiwari described prompt infection, in which malicious prompts replicate themselves across connected agents, and reported that multi-agent systems are highly susceptible [1]. Cohen, Bitton and Nassi showed a worm-like chain reaction among GenAI-powered email assistants that rely on retrieval [2]. AgentPoison poisons an agent's long-term memory or knowledge base with optimised triggers, and reports average attack success above 80% across three agents [3]. Greshake and colleagues showed earlier that applications which mix retrieved data with instructions can be attacked through that data [4]. Spotlighting, which marks the provenance of untrusted input inside the prompt, reduced attack success from over 50% to under 2% in its authors' experiments with GPT-family models [7]. My provenance label is a much simpler idea in the same spirit. My tasks, attacks and models differ from all of these, so the numbers do not compare.

## What the simulator predicted

These results use the held-out test split: 88 attack payloads, 42 tasks, three network shapes and five seeds, with the scripted agent obeying half the time. They count attacked runs whose final report contained the marker.

- **No defence:** 23% for prompt infection and 50% for forged memory poisoning.
- **A keyword blocklist**, the obvious first attempt, gave 22% and 50%. It recognised only 3 of my 126 payloads.
- **All three defences:** 0% and 2%, and tasks without an attack still all succeeded. With an agent that always obeys, the figures with all three were 0% and 9%.
- **The defences cover different routes.** The sanitiser sits on messages, so it cut the worm to 4% and did nothing to the share of reports hit by poisoned memory. The majority check gave 8% and 47%. The provenance defence gave 0% and 10%.
- **Network shape mattered for the worm.** Without defences it reached 54% of agents on a chain, 57% on a star and 91% on a mesh. Poisoned memory reached about 99% on all three, because it does not travel along links.

## What a real model did

I then ran small checks on gpt-oss-20b through a free tier, using development payloads only.

**The label helped on one route and not the other.** In single-agent calls, the model obeyed a planted document in 15 of 19 cases, and in 1 of 19 when it was labelled as untrusted data. It obeyed a poisoned memory note in 18 of 19 cases, and still in 18 of 19 with the label. In the simulator I had assumed the label cut obedience to a fifth on both routes. For memory that was wrong. So I do not expect the simulated 10% for the provenance defence, or the 2% for all three, to hold for this model on forged poison. The part of D1 that blocks unknown authors is ordinary code and does not depend on the model.

**Whether the worm travelled depended on how agents handed over output.** In six full runs without defences, where an agent passed on only its message field, the marker never left the first agent. The model obeyed, but put the code and the copied notice outside that field. When I passed on each whole reply instead, the infection got past the first agent in 4 of 6 runs, once reaching five of six agents. How far it went depended strongly on which of the two payloads I used: other agents repeated the code on 2 of 25 exposed turns with one and 14 of 30 with the other. No parsed final report contained it.

These samples are small: one model, two payloads in the full runs, and turns that are not independent. They cannot give a rate or compare network shapes. They are enough to show that my simulator's single obedience number is too simple.

## Mistakes that taught me something

- **A memory design hid the attack.** At first, agents read only the most recent notes, so the poisoned note scrolled out of view and a defence looked far better than it was. Retrieval by relevance fixed it.
- **A silent bug looked like a result.** For a while the provenance label was never added to the prompt. Rows identical to the no-defence row gave it away.
- **My scorer failed on real output.** All six first real runs scored as task failures, partly because the model writes 1,419 where my check expected 1419. After fixing it, three succeeded. The scripted agent copies text exactly, so offline tests could not show this.
- **One payload is one example.** After three full runs with the same payload, I summarised that the worm mostly did not spread. The second payload showed otherwise.

## Open questions I want to pursue

- **What actually stops a memory note being obeyed?** A label did nothing here. Would separating instructions from retrieved data structurally, or limiting what a memory entry may ask for, do better?
- **How should agents hand over output?** A strict message format blocked this worm by accident. How easily does a payload that knows the format get through?
- **Obedience by route and payload.** A simulator needs separate, measured rates for documents, messages and memory before its network results mean much.
- **Larger teams and other models.** Do the differences between network shapes survive with real agents, more of them and many payloads?

I'm interested in **LLM agent security and red-teaming**, and would be glad to discuss these questions with researchers working on the safety of multi-agent systems or agent memory.

You can watch the simulated infection spread, and switch the defences on and off, in the [live demo](https://swarmshield.streamlit.app). It runs the scripted agent, not a real model, and the free host may need about a minute to wake up. The code, result files and a written list of limitations are on [GitHub](https://github.com/Nathaniel47/swarmshield).

## References

1. D. Lee and M. Tiwari (2024). Prompt Infection: LLM-to-LLM prompt injection within multi-agent systems. [arXiv:2410.07283](https://arxiv.org/abs/2410.07283)
2. S. Cohen, R. Bitton and B. Nassi (2024). Here comes the AI worm: Unleashing zero-click worms that target GenAI-powered applications. [arXiv:2403.02817](https://arxiv.org/abs/2403.02817)
3. Z. Chen, Z. Xiang, C. Xiao, D. Song and B. Li (2024). AgentPoison: Red-teaming LLM agents via poisoning memory or knowledge bases. [arXiv:2407.12784](https://arxiv.org/abs/2407.12784)
4. K. Greshake, S. Abdelnabi, S. Mishra, C. Endres, T. Holz and M. Fritz (2023). Not what you've signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection. [arXiv:2302.12173](https://arxiv.org/abs/2302.12173)
5. Q. Zhan, Z. Liang, Z. Ying and D. Kang (2024). InjecAgent: Benchmarking indirect prompt injections in tool-integrated large language model agents. [arXiv:2403.02691](https://arxiv.org/abs/2403.02691)
6. E. Debenedetti, J. Zhang, M. Balunović, L. Beurer-Kellner, M. Fischer and F. Tramèr (2024). AgentDojo: A dynamic environment to evaluate prompt injection attacks and defenses for LLM agents. [arXiv:2406.13352](https://arxiv.org/abs/2406.13352)
7. K. Hines, G. Lopez, M. Hall, F. Zarfati, Y. Zunger and E. Kiciman (2024). Defending against indirect prompt injection attacks with spotlighting. [arXiv:2403.14720](https://arxiv.org/abs/2403.14720)
