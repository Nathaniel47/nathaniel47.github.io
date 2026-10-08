Every university runs on documents: student handbooks, course outlines, scholarship notices and departmental regulations. They are authoritative, but they are long, scattered and rarely written to answer the questions students actually ask. Large language models seem like an obvious fix, until a model confidently invents a regulation that doesn't exist.

For my final-year project at KNUST I built **KNUST Students' Pal**, a campus assistant that combines a chatbot with a scheduler and reminders, updates, a scholarships hub and course-material downloads. This post is about its core: answering questions *from the institution's own documents* rather than from the model's memory, and the research questions that design raises.

## Retrieval-augmented generation, in practice

The assistant follows the **retrieval-augmented generation (RAG)** pattern introduced by Lewis et al. [1]. Instead of relying on knowledge stored in a model's parameters, it retrieves relevant passages from a document collection and conditions the answer on them. In our system:

- **Ingestion.** Automated extraction pipelines pull text out of unstructured departmental handbooks and other documents.
- **Indexing.** The text is split into passages, embedded, and stored in a **ChromaDB** vector database.
- **Serving.** A **FastAPI** service, orchestrated with **LangChain**, retrieves the passages most similar to each question and passes them to the language model (via the OpenAI API) to compose an answer, which reaches students through a **React Native** app.

The appeal is grounding. When the handbook changes, re-indexing updates the assistant without retraining anything, and every answer can in principle be traced back to a source passage.

## What the literature says about the hard parts

RAG has become a large field in a short time, and recent surveys organise it into a pipeline of retrieval, augmentation and generation, each with its own failure modes [2]. Building a real system, I ran into the problems the literature highlights.

**Grounding does not eliminate hallucination.** Language models can still produce fluent statements that their sources do not support [3]. In an institutional setting the cost is real: a student acting on an invented deadline or eligibility rule is worse off than one who received no answer at all.

**More context is not automatically better.** Liu et al. showed that language models use information placed in the middle of a long context less reliably than information at the beginning or end [4]. This makes chunking and ranking decisions, which look like plumbing, matter for answer quality.

**Evaluation is the bottleneck.** Labelled question–answer pairs rarely exist for a specific university's documents. Reference-free evaluation frameworks such as RAGAs [5] instead measure properties like *faithfulness* (is the answer supported by the retrieved context?) and *answer relevance* without a hand-built gold set, which makes them attractive for exactly this setting.

## Open questions I want to pursue

- **Evaluating institutional assistants without gold data.** How well do reference-free metrics like those in [5] agree with judgements from students and administrators, and where do they disagree?
- **Faithful attribution.** Can the assistant reliably cite the exact handbook section behind each answer, and refuse when no passage supports one? This is the institutional version of the hallucination problem [3].
- **Documents that change.** Regulations are versioned every academic year. How should a RAG system handle outdated passages that remain semantically similar to the question?
- **Language and context.** Students do not always ask questions the way handbooks phrase them, and in Ghana they may mix English with local languages. How robust is retrieval to that gap, and what would it take to close it?

I'm interested in **trustworthy, well-evaluated language technology for institutions in low-resource settings**, and would be glad to discuss these questions with researchers working on retrieval, evaluation or NLP for African contexts.

The project code is available on [GitHub](https://github.com/Nathaniel47/KNUST-Students-Pal).

## References

1. P. Lewis *et al.* (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *NeurIPS*. [arXiv:2005.11401](https://arxiv.org/abs/2005.11401)
2. Y. Gao *et al.* (2023). Retrieval-augmented generation for large language models: A survey. [arXiv:2312.10997](https://arxiv.org/abs/2312.10997)
3. Z. Ji *et al.* (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys*. [doi:10.1145/3571730](https://doi.org/10.1145/3571730)
4. N. F. Liu *et al.* (2024). Lost in the middle: How language models use long contexts. *Transactions of the ACL*. [doi:10.1162/tacl_a_00638](https://doi.org/10.1162/tacl_a_00638)
5. S. Es, J. James, L. Espinosa Anke and S. Schockaert (2024). RAGAs: Automated evaluation of retrieval augmented generation. *EACL System Demonstrations*. [doi:10.18653/v1/2024.eacl-demo.16](https://doi.org/10.18653/v1/2024.eacl-demo.16)
