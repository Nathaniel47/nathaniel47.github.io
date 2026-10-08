Mosquito-borne diseases remain one of the heaviest public-health burdens in sub-Saharan Africa, and the threat is shifting. *Anopheles stephensi*, an urban malaria vector historically confined to South Asia and the Arabian Peninsula, has established itself in the Horn of Africa, and modelling suggests that well over a hundred million people in African cities could be at risk if it spreads further [1]. Responding to changes like this depends on **entomological surveillance**: knowing which vectors are present, where, and in what numbers.

The bottleneck is identification. Telling mosquito genera, species and sexes apart traditionally requires a trained entomologist and a microscope, and that expertise is scarce exactly where surveillance matters most. This post reflects on my work as Lead Mobile Developer on **RAPiD-VBP** at KNUST, where we built a Flutter field application that classifies mosquitoes on the device itself, and on the research questions that work has left me with.

## What we built

The application pairs a geospatial surveillance interface (interactive maps with cascading regional filters) with an **on-device computer vision pipeline**. A single photo of a specimen yields predictions across five taxonomic tiers:

1. **Verification**: is this actually a mosquito?
2. **Life stage**
3. **Genus**
4. **Species**
5. **Sex**

My work focused on the mobile inference pipeline: running the deep learning models on the phone, parsing their outputs across all five tiers, and enforcing **state-based morphological validation rules** so that the combined prediction is biologically coherent. Rules of this kind encode domain knowledge the network does not guarantee on its own. A species label, for example, must belong to the predicted genus, and the remaining tiers mean little if the verification tier says the image is not a mosquito at all.

## Where this sits in the literature

Deep learning for mosquito identification has matured quickly. Convolutional networks can separate vector species from images with high accuracy in controlled laboratory settings [2], and object detectors have been applied to the harder joint task of species *and* sex identification [3]. CNNs have even been used to probe *cryptic* morphological variation among malaria vector species that are difficult to separate by eye [4]. Goodwin et al. showed that a **multitiered ensemble** can both identify known species and flag specimens that belong to none of them, which is essential when a surveillance tool meets an invasive or unrecorded species in the field [5].

Two features of our setting push beyond most of this work.

**The labels are hierarchical, not flat.** Our five tiers form a taxonomy, and hierarchical classification has a long literature on exactly the tension we met in practice: predicting each level independently and reconciling afterwards, versus decoding the whole hierarchy jointly so that inconsistent combinations are never produced [6]. Our rule-based validation is a pragmatic form of the former.

**Inference happens at the edge.** Field teams often work with limited or no connectivity, so the models must run on the phone. Architectures such as MobileNetV3 were designed for precisely this accuracy–latency trade-off [7], but mobile deployment adds its own failure modes: varied cameras, lighting and specimen condition that rarely appear in curated training sets.

## Open questions I want to pursue

Building the system made the following research questions concrete for me:

- **Hierarchy-consistent inference.** Can constraints like ours be built into training and decoding, for example through hierarchy-aware losses or constrained decoding, rather than applied as post-hoc rules? And does doing so improve accuracy at the finest tiers (species and sex), where data is scarcest?
- **Knowing when not to answer.** Modern neural networks are often poorly calibrated, confidently wrong rather than appropriately uncertain [8]. For surveillance, a calibrated model that *abstains* and refers the specimen to an entomologist may be worth more than a slightly more accurate one. How should abstention thresholds be set per tier, given the cost of different errors?
- **Robustness in the field.** How much does performance degrade from curated images to phone photos taken in the field, and can open-set methods like those in [5] reliably flag novel or invasive species such as *An. stephensi*?
- **Multimodal evidence.** Our app already records *where* a specimen was found. Could spatial priors, combined with acoustic data such as wingbeat recordings from large datasets like HumBugDB [9], improve identification beyond images alone?

These questions sit at the intersection of **trustworthy machine learning, edge AI and public health**. I would welcome conversations with researchers working in any of these areas.

## References

1. M. E. Sinka *et al.* (2020). A new malaria vector in Africa: Predicting the expansion range of *Anopheles stephensi* and identifying the urban populations at risk. *PNAS*. [doi:10.1073/pnas.2003976117](https://doi.org/10.1073/pnas.2003976117)
2. J. Park *et al.* (2020). Classification and morphological analysis of vector mosquitoes using deep convolutional neural networks. *Scientific Reports*. [doi:10.1038/s41598-020-57875-1](https://doi.org/10.1038/s41598-020-57875-1)
3. V. Kittichai *et al.* (2021). Deep learning approaches for challenging species and gender identification of mosquito vectors. *Scientific Reports*. [doi:10.1038/s41598-021-84219-4](https://doi.org/10.1038/s41598-021-84219-4)
4. J. Couret *et al.* (2020). Delimiting cryptic morphological variation among human malaria vector species using convolutional neural networks. *PLOS Neglected Tropical Diseases*. [doi:10.1371/journal.pntd.0008904](https://doi.org/10.1371/journal.pntd.0008904)
5. A. Goodwin *et al.* (2021). Mosquito species identification using convolutional neural networks with a multitiered ensemble model for novel species detection. *Scientific Reports*. [doi:10.1038/s41598-021-92891-9](https://doi.org/10.1038/s41598-021-92891-9)
6. C. N. Silla Jr. and A. A. Freitas (2011). A survey of hierarchical classification across different application domains. *Data Mining and Knowledge Discovery*. [doi:10.1007/s10618-010-0175-9](https://doi.org/10.1007/s10618-010-0175-9)
7. A. Howard *et al.* (2019). Searching for MobileNetV3. *ICCV*. [doi:10.1109/ICCV.2019.00140](https://doi.org/10.1109/ICCV.2019.00140)
8. C. Guo, G. Pleiss, Y. Sun and K. Q. Weinberger (2017). On calibration of modern neural networks. *ICML*. [arXiv:1706.04599](https://arxiv.org/abs/1706.04599)
9. I. Kiskin *et al.* (2021). HumBugDB: A large-scale acoustic mosquito dataset. *NeurIPS Datasets and Benchmarks*. [arXiv:2110.07607](https://arxiv.org/abs/2110.07607)
