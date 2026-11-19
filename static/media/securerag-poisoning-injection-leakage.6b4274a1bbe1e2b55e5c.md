A retrieval-augmented assistant answers from documents it fetches at question time. That makes the document store part of the attack surface: anyone who can add or edit a document can change what the assistant says, and anyone who can type a question can try to talk it out of its rules. Defences exist for each of these problems, but they are usually shown one at a time, against one attack, on a system built to show them off.

I built **SecureRAG** to ask a narrower, measurable question: for one small assistant, how often do four well-known attacks work, how much does each of several simple defences reduce that, and what does defending cost in normal use? This post covers how I measured it, what I found, and what it leaves open.

## The setup

The assistant answers questions about Ghana from about 400 English Wikipedia articles (2,330 text chunks). A question retrieves the three most similar chunks, and `gpt-oss-20b` answers from them. The pipeline is plain Python, with no framework, and each defence is a separate class that plugs into one stage: accepting a document, checking the query, filtering retrieved chunks, generating, or filtering the answer.

Four attacks, 25 attempts each:

- **Poisoning:** planted documents repeat the target question and state a wrong answer.
- **Indirect injection:** planted documents carry instructions the model may obey.
- **Direct injection:** a user message overrides the rules or asks for the system prompt, which holds a canary string.
- **Leakage:** questions that ask for restricted case notes. These are synthetic, with invented names and IDs, and no real personal data is used.

Poisoning and injection arrive two ways: as a user upload (15 attempts) or as an edit to an "official" page (10).

Five defences, each switchable alone: a **source filter** (reject untrusted uploads and instruction phrases), a **retrieval anomaly check** (drop chunks that contain instructions, match the question too closely, or duplicate each other), a **consistency check** (answer from two halves of the evidence and abstain on disagreement), an **output filter** (block the canary, personal-data patterns and echoes of the system prompt), and Meta's **Prompt Guard** model as an extra. "Combined" means the first four together.

Scoring is automatic: a whole-word marker for attacks and a normalised match for clean answers, so there is no model acting as judge. Every rate carries a 95% Wilson interval, because 25 attempts is a small sample.

## What the literature says

Lewis et al. introduced retrieval-augmented generation, which couples a language model to an external, retrievable memory [1]. Greshake et al. showed that applications built this way blur the line between data and instructions, so an attacker can plant text where it will be read instead of talking to the model [2]. PoisonedRAG made the attack on the knowledge base concrete: inject a handful of crafted texts so that a chosen question retrieves them and the model produces an attacker-chosen answer [3]. On the defence side, RobustRAG proposes isolate-then-aggregate: answer from each retrieved passage separately and combine the results so that a few corrupted passages cannot decide the outcome, with certified guarantees [4]. My consistency check is a much cruder cousin of that idea, with only two groups.

## What I measured

On the full set of 100 attacks and 150 clean questions:

- **With no defence, 60% of attacks succeeded** (95% interval 50% to 69%). Leakage was 100% (25 of 25), poisoning 68%, and indirect and direct injection 36% each. The four core defences combined brought the total to **6%** (3% to 12%), with no false blocks and no false flags on the clean questions. Clean accuracy stayed between 55% and 59%.
- **The retrieval anomaly check was the strongest single defence** against planted documents: none of the 50 poisoning and indirect-injection attempts got through. It does nothing about direct injection (still 36%).
- **The output filter was the leakage defence**, taking leakage from 100% to 12%, but it did nothing for poisoning.
- **A trust label was the weak point.** The source filter stopped injection and leakage entirely, but 7 of 10 poisonings that arrived as edits to an "official" page still got through, because that label is exactly what the attacker used.
- **The consistency check barely helped** (58% of attacks still succeeded) and doubled the cost per query. When both halves of the evidence contain poison, the halves agree.
- **Prompt Guard mainly helped direct injection** (36% to 12%) and had little effect elsewhere.
- **The remaining 6 successes of the combined defences were all direct injection.**

Three repeat runs gave an undefended success rate of 59.2% with a standard deviation of 2.9 points, so the model's own sampling noise is small next to the uncertainty from having only 25 attempts per attack. A confirmation run on a second model (Gemini) over a 70-query subset pointed the same way: 19 of 40 attacks succeeded with no defence and 2 of 40 with the combined defences.

The most useful lessons were about the measurement itself. A 30-answer hand check of the accuracy scorer agreed with it on 27. Two of the three disagreements were correct answers it rejected because the reference carried extra detail; the third came from a spreadsheet silently rewriting the reference "January 7" as "Jan-07" in the file I was checking. And the baseline accuracy is only 55%, because retrieval puts the right chunk in the top three for roughly 89% of questions and the model is small, so defence effects are best read relative to that baseline.

## Open questions I want to pursue

- **Adaptive attackers.** My poisons repeat the question word for word and my injections use five fixed templates, which is exactly what two of the defences are built to catch. How much protection survives a paraphrased poison, or an injection with no trigger phrase?
- **Provenance instead of labels.** If an "official" tag can be forged by an edit, what should replace it, and how do you keep the benefit of trusting a good source?
- **Isolation with more than two groups.** The consistency check failed against a pair of poisons. How does the certified approach in [4] behave on a small corpus and a small model, and what does it cost in answer quality?
- **Evaluation without a judge model.** Automatic scoring keeps the results reproducible, but it is lenient in some places and strict in others. How should a RAG security benchmark report that uncertainty?

I'm interested in **the security and reliable evaluation of retrieval-augmented and agentic LLM systems**, and would be glad to discuss these questions with researchers working on poisoning, prompt injection or evaluation methodology.

You can try it in the [live demo](https://huggingface.co/spaces/NathanielAAidoo/securerag): the Results and Recorded runs tabs show every stored outcome, and the Live playground asks real questions (a free tier, so allow up to a minute for the first load, and live questions are capped per day). The code, data and run records are on [GitHub](https://github.com/Nathaniel47/securerag), including a limitations file that lists where the results are weak.

## References

1. P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W. Yih, T. Rocktäschel, S. Riedel and D. Kiela (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. [arXiv:2005.11401](https://arxiv.org/abs/2005.11401)
2. K. Greshake, S. Abdelnabi, S. Mishra, C. Endres, T. Holz and M. Fritz (2023). Not what you've signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection. [arXiv:2302.12173](https://arxiv.org/abs/2302.12173)
3. W. Zou, R. Geng, B. Wang and J. Jia (2024). PoisonedRAG: Knowledge corruption attacks to retrieval-augmented generation of large language models. [arXiv:2402.07867](https://arxiv.org/abs/2402.07867)
4. C. Xiang, T. Wu, Z. Zhong, D. Wagner, D. Chen and P. Mittal (2024). Certifiably robust RAG against retrieval corruption. [arXiv:2405.15556](https://arxiv.org/abs/2405.15556)
