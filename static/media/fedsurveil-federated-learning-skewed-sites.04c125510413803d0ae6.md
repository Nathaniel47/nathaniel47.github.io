Federated learning is attractive for clinics and field sites for a simple reason: the images stay where they are, and only model updates travel [1]. That leaves three practical questions. What happens when each site sees a different mix of cases? What does a privacy guarantee cost? And what can a site on a slow link afford to send?

I built **FedSurveil** to measure these on a small scale. It is a simulation of ten sites on one machine, using small public benchmark images, and it makes no clinical claims. One result from my first dataset did not survive the next three, and that is the part I think is most worth reading.

## The setup

The main experiments use BloodMNIST [10], with three more datasets for part of the comparison: OrganAMNIST and PathMNIST [10], and a 10-class, 64 px subset of the IP102 insect-pest images [11]. The sites receive uneven amounts of data. How different their class mixes are is set by a Dirichlet parameter, alpha [2]: at 100 the sites look nearly alike, and at 0.1 each is dominated by a few classes.

I compare **FedAvg** [1], **FedProx** [4] and **SCAFFOLD** [5] with central training on the pooled images. The models are small and use group norm. Each run has 30 rounds and 2 local epochs per round, and each setting has three seeds unless marked. I chose the learning rate and momentum once, on BloodMNIST, without a proper search, and did not re-tune them for the other datasets.

## What the literature says

Hsu and colleagues showed that FedAvg gets worse as the data at different clients grows less alike [2]. FedProx adds a penalty that keeps each site close to the shared model, and its authors report more robust convergence than FedAvg in heterogeneous settings [4]. SCAFFOLD uses correction terms, called control variates, to cancel this "client drift", and its authors report that it needs significantly fewer communication rounds [5]. A broader experimental study found that no algorithm it tested was best in every non-identical setting [3]. My models, data splits and round budget differ from these papers, so the numbers do not compare.

## Skewed sites: the average hides who is hurt

On BloodMNIST, central training reached 94.1%. FedAvg reached 90.8% with near-identical sites, 88.6% at alpha 0.5 and 64.7% at alpha 0.1, where the spread between seeds was large (a standard deviation of 9.6 points).

The worst site tells more. At alpha 0.5 the overall figure looks fine, but the worst site got 76.2%. At alpha 0.1 it got 9.9%. A single global accuracy would not show that.

## The result that did not carry over

On BloodMNIST at alpha 0.1, SCAFFOLD looked like the fix: 71.9% against FedAvg's 64.7%, with the worst site up from 9.9% to 29.6%. The spreads overlapped, so I called it suggestive. It also uploads twice as much per round.

Then I ran the same settings on three more datasets. These are accuracies at alpha 0.1:

| Dataset | FedAvg | FedProx (mu 0.1) | SCAFFOLD |
|---|---|---|---|
| BloodMNIST | 64.7 ± 9.6% | 68.5 ± 9.9% | 71.9 ± 4.6% |
| OrganAMNIST | 84.9 ± 5.9% | 80.5 ± 3.4% | 74.0 ± 25.8% |
| PathMNIST | 82.5 ± 2.2% | 78.6 ± 1.8% | 75.2 ± 9.6% |
| IP102 subset | 39.4 ± 8.4% | 38.3 ± 1.9% | 20.8 ± 6.9% |

- **SCAFFOLD averaged below FedAvg on all three new datasets.** One OrganAMNIST seed fell to 44.2%, and one PathMNIST seed reached 65.1% while the other two reached 76.2% and 84.3%. On IP102 it was behind on all three seeds. Its average there, 20.8%, is close to what always guessing the most common test class would score (19.2%).
- **FedProx did not clearly help either.** With mu 0.1 it averaged below FedAvg on OrganAMNIST and PathMNIST. On IP102 the seeds showed no clear difference.
- **IP102 was hard for federated training in general.** Even near-identical sites reached 47.0%, against 57.7% for central training. I did not test whether more rounds would close that gap.

**This does not show that SCAFFOLD is worse than FedAvg.** I did not investigate the failures, and there are obvious suspects. The settings were chosen on one dataset. SCAFFOLD's formula is also derived for plain SGD, while I used momentum and adjusted the step size in the formula to approximate it. I have a one-site test in which SCAFFOLD matches FedAvg exactly, but it does not check this approximation at all: it runs without momentum, and with one site the correction is always zero. I also never compared SCAFFOLD without momentum, so the approximation could affect the BloodMNIST gain too. What the results do show is that a gain measured on one dataset, with one set of settings, was not enough to rely on.

## What privacy cost

These tests use BloodMNIST at alpha 0.5, where plain FedAvg reached 88.8%. There are two different guarantees, and their numbers should not be compared.

**Client-level differential privacy** protects a whole site's participation. Geyer and colleagues report that, with enough clients, it can be had at only a minor cost in performance [6]. With only ten sites, my results were very different (all at delta 1e-5):

| Noise level | Epsilon (smaller is more private) | Accuracy |
|---|---|---|
| 0.3 | 253 | 68.8% |
| 1.0 | 40 | 40.8% |
| 3.0 | 10 | 14.4% |

Even epsilon 40 is a weak guarantee, and it already cost more than half the accuracy. I did not tune the noise and clipping settings carefully, and I did not test larger numbers of sites.

**Sample-level DP-SGD** [7] protects a single training image inside a site. One run reached 64.8% at epsilon 39. It is a single seed, so I would not draw a conclusion from it.

I also **simulated secure aggregation** with pairwise masks that cancel in the sum. Accuracy stayed about the same (89.0%). This is not real cryptography: there is no key exchange, no handling of a site dropping out and no protection against a dishonest server. By itself it gives no differential privacy.

Finally, a simple **membership-inference attack**, which guesses that low-loss images were in the training set, scored an AUROC of 0.50 to 0.52, close to chance, even without any privacy. That does **not** show the model is safe. The attack is basic compared with the broader membership-inference work [8], and Carlini and colleagues argue that attacks should be judged by how well they work at very low false-positive rates, which I did not measure [9].

## What a slow link can afford

One uncompressed update from the BloodMNIST model is about 379 KB, roughly 30 seconds of upload on a 0.1 Mbit/s link, every round. Storing updates as 8-bit integers (4 times smaller) cost 0.7 points. Sending only the largest 10% of values (5 times smaller) cost 1.2 points. Sending only the largest 1% (50 times smaller) cost 5.4 points. I did not combine compression with privacy or secure aggregation, and I did not measure a real network.

A separate short demo runs FedAvg with the Flower framework as separate server and site processes on one computer. It shows the protocol working, not a result.

## Mistakes and rough edges

- **A chart that did not match its title.** The first four-dataset chart said its dots were seeds, but drew only one dot for BloodMNIST: the average. The table was correct. It now draws all three, and a test checks it.
- **A leak in a public benchmark split.** My data check found 5 BloodMNIST training images that also appear in the test set (5 of 3,421 test images). It is small, but results on that dataset should be read with it in mind.
- **Thin records.** For the three added datasets I saved only final results, not round-by-round logs or the library versions of each run. Free GPU sessions dropped, so some of these comparisons were run in two or three sessions.
- **Noise in the measurements.** Three seeds is few. The same seed and settings gave results up to 0.7 points apart in two sessions, and each worst-site figure comes from only 500 sampled test images.

## Open questions I want to pursue

- **Why did SCAFFOLD fail?** Running it without momentum, and tuning the learning rate for each dataset and method, would help separate the method from my choices.
- **When can you trust a drift fix before deploying it?** Real sites cannot pool data to check. Is there a warning sign visible during training?
- **Who should the model be judged by?** A better average can leave one site badly served. How should training and reporting protect the worst-off site?
- **How many sites does useful client-level privacy need?** Mine had ten. I would like to measure how the cost changes as that number grows.

I'm interested in **trustworthy machine learning, AI for public health and distributed systems**, and would be glad to discuss these questions with researchers working on federated learning.

You can look through the results in the [live dashboard](https://fedsurveil-smwgy3kxghui5lqha38jve.streamlit.app). The comparison across datasets is under "Final results"; the replay tabs show BloodMNIST runs only, and the free host may need about a minute to wake up. The code, result files and a written list of limitations are on [GitHub](https://github.com/Nathaniel47/fedsurveil).

## References

1. H. B. McMahan, E. Moore, D. Ramage, S. Hampson and B. Agüera y Arcas (2016). Communication-efficient learning of deep networks from decentralized data. [arXiv:1602.05629](https://arxiv.org/abs/1602.05629)
2. T.-M. H. Hsu, H. Qi and M. Brown (2019). Measuring the effects of non-identical data distribution for federated visual classification. [arXiv:1909.06335](https://arxiv.org/abs/1909.06335)
3. Q. Li, Y. Diao, Q. Chen and B. He (2021). Federated learning on non-IID data silos: An experimental study. [arXiv:2102.02079](https://arxiv.org/abs/2102.02079)
4. T. Li, A. K. Sahu, M. Zaheer, M. Sanjabi, A. Talwalkar and V. Smith (2018). Federated optimization in heterogeneous networks. [arXiv:1812.06127](https://arxiv.org/abs/1812.06127)
5. S. P. Karimireddy, S. Kale, M. Mohri, S. J. Reddi, S. U. Stich and A. T. Suresh (2019). SCAFFOLD: Stochastic controlled averaging for federated learning. [arXiv:1910.06378](https://arxiv.org/abs/1910.06378)
6. R. C. Geyer, T. Klein and M. Nabi (2017). Differentially private federated learning: A client level perspective. [arXiv:1712.07557](https://arxiv.org/abs/1712.07557)
7. M. Abadi, A. Chu, I. Goodfellow, H. B. McMahan, I. Mironov, K. Talwar and L. Zhang (2016). Deep learning with differential privacy. [arXiv:1607.00133](https://arxiv.org/abs/1607.00133)
8. R. Shokri, M. Stronati, C. Song and V. Shmatikov (2016). Membership inference attacks against machine learning models. [arXiv:1610.05820](https://arxiv.org/abs/1610.05820)
9. N. Carlini, S. Chien, M. Nasr, S. Song, A. Terzis and F. Tramèr (2021). Membership inference attacks from first principles. [arXiv:2112.03570](https://arxiv.org/abs/2112.03570)
10. J. Yang, R. Shi, D. Wei, Z. Liu, L. Zhao, B. Ke, H. Pfister and B. Ni (2021). MedMNIST v2: A large-scale lightweight benchmark for 2D and 3D biomedical image classification. [arXiv:2110.14795](https://arxiv.org/abs/2110.14795)
11. X. Wu, C. Zhan, Y.-K. Lai, M.-M. Cheng and J. Yang (2019). IP102: A large-scale benchmark dataset for insect pest recognition. CVPR 2019. [doi:10.1109/CVPR.2019.00899](https://doi.org/10.1109/CVPR.2019.00899)
