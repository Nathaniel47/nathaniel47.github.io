Models that run on phones and microcontrollers are usually compressed, most often by quantization: storing weights and activations as 8-bit integers instead of 32-bit floats. Two things are commonly said about this. One is that a quantized model is harder to attack, because its rounding steps have no useful gradient. The other is that compression is a security-neutral engineering detail. Both are easy to assume and cheap to test.

I built **Secure TinyML** to test them on small image classifiers and to ask a third question: which cheap defences still help once the attacker is allowed to know about them? This post covers how I measured it, what I found, and what it leaves open. It is a small-scale study (one tiny network, three seeds), and I say where that limits the conclusions.

## The setup

The model is a small ResNet of about 0.15M parameters, trained on CIFAR-10 (10 epochs, 81.7% test accuracy) and GTSRB traffic signs (6 epochs, 97.2%), both at 32x32. GTSRB is split by physical sign, because each sign appears in about 30 near-identical frames and a random split would put near-copies of training images in validation.

The int8 model is an ONNX Runtime static quantization, and the same `.onnx` file is evaluated in Python and loaded in the browser, so the model I attack is the model that ships. Rounding has zero gradient, so gradient attacks cannot pass through the real int8 graph. I used two substitutes: a fake-quantization surrogate with a straight-through gradient, and a query-only attack that sees scores and nothing else. The query-only attack is the guard against gradient masking: if a gradient attack fails on an int8 model, that proves nothing until a gradient-free attack agrees.

Attacks, all written by hand and cross-checked against the Adversarial Robustness Toolbox: FGSM, 10-step PGD at three strengths, a targeted adversarial patch, and a BadNets-style backdoor (a 4x4 corner trigger on 1 to 5% of the training images). Defences: adversarial training, input purification (4-bit rounding, or 5-bit plus a blur) and activation clipping, each measured against a **non-adaptive** attacker (crafted on the undefended model) and an **adaptive** one (crafted on the defended model, with a straight-through gradient through the purifier). Every result is a CSV row per run, with three seeds, 500 test images per grid and 95% intervals over seeds.

## What the literature says

Madry et al. framed robustness as a min-max problem and showed that adversarial training with PGD is a strong baseline [1]. Athalye, Carlini and Wagner showed that many published defences owed their numbers to obfuscated gradients and fell once the attack was adapted to them [2]. That is why I report adaptive and query-only results next to non-adaptive ones. Jacob et al. introduced the integer-arithmetic scheme that most int8 deployment tools descend from [3]. Feature squeezing, which includes reducing bit depth, was proposed as a cheap input-side defence [4], and I test a version of it. On the threat side, adversarial patches [5] and BadNets backdoors [6] are the standard physical and training-time attacks. Wong, Rice and Kolter showed that a cheap one-step adversarial training can approach full PGD training [7], which is the variant my CPU could afford.

## What I measured

- **int8 neither protected nor harmed.** Clean accuracy was 81.7% in both precisions on CIFAR-10 and 97.2% versus 97.1% on GTSRB, and the two models gave the same label on 98.6% and 99.9% of test images. Under PGD the fp32-int8 differences were far inside the seed-to-seed intervals (GTSRB at 2/255: 55.5% versus 56.0%).
- **Attacks transferred almost completely.** Of the adversarial images that fooled fp32, 99.9% to 100% (CIFAR-10) and 98% to 100% (GTSRB) also fooled int8.
- **The gradient-free attack agreed.** With only 300 queries per image it is much weaker than white-box, but it still reduced CIFAR-10 accuracy to 72%, 56% and 23% at the three strengths, so the int8 graph was not hiding useful gradients.
- **Adversarial training was the one defence that clearly worked**, against the adaptive attacker too. On CIFAR-10 at 2/255 it moved int8 accuracy from 5.6% to 58.0% adaptive, at a cost of about 12 points of clean accuracy; on GTSRB it cost under 1 point. Its query-only accuracy was higher than its white-box accuracy, which is what an honest defence looks like and what masking would not.
- **Purification looked useful until the attacker knew about it.** On CIFAR-10 the blur variant scored 38.8% against a non-adaptive attacker and 13.7% against an adaptive one. On GTSRB it kept a small gain, but the intervals nearly touch at three seeds, so I call it possible, not shown. **Activation clipping did nothing** with one cap setting.
- **A planted backdoor weakened under int8.** On CIFAR-10 with 2% poisoned images, attack success was 100% in fp32 and 17% in int8, with unchanged clean accuracy, and the effect was not monotonic in the poison rate. My guess, untested, is that a small trigger is a fragile feature that rounding sometimes erases. It is one seed per rate, so it is suggestive only.
- **It runs where it should.** The models load in ONNX Runtime Web and agreed with the laptop on 200 of 200 test images, in a desktop browser and on a real Android phone. The int8 graph was not faster than fp32 there (median 8.5 ms versus 7.2 ms), likely because runtime overhead dominates a model this small. That is one phone and one run.

The most useful lessons were about measurement. My first int8 model lost 7.6 points of accuracy; a torch simulation of the same rounding lost 0.1, which pointed at the runtime, where a default kernel was saturating its intermediate sums. Every comparison made before that fix was confounded. A reference library's attacks looked far weaker than mine until I found that it needed the true labels passed in. And my first query-only numbers were computed on 200 images while the file said 1,000, which a sample-count column would have caught on day one.

## Open questions I want to pursue

- **Why does int8 weaken a backdoor?** Is it the trigger's small size, the calibration, or the rounding itself? This needs more seeds, other triggers and a second quantization toolchain (I have not yet run TFLite or quantization-aware training).
- **Stronger adaptive attacks on purification.** I used 10-step PGD without restarts, so the robust numbers are upper bounds. How much of the remaining purification gain survives AutoAttack?
- **Does the result hold at scale?** One 0.15M-parameter network on 32x32 images says little about larger models, other quantization schemes, or real microcontroller runtimes.
- **Protecting a model that sits on a device.** If attacks transfer from a full-precision copy at nearly 100%, what is worth defending, and what can an on-device model reveal to an attacker who extracts it?

I'm interested in **trustworthy and secure on-device machine learning**, and would be glad to discuss these questions with researchers working on adversarial robustness, quantization or embedded AI security.

You can try it in the [live browser demo](https://nathaniel47.github.io/secure-tinyml/demo.html): it runs the three models side by side on your device, with pre-computed adversarial patches, and nothing leaves your browser. The code, the per-run result files and a written list of limitations are on [GitHub](https://github.com/Nathaniel47/secure-tinyml).

## References

1. A. Madry, A. Makelov, L. Schmidt, D. Tsipras and A. Vladu (2018). Towards deep learning models resistant to adversarial attacks. [arXiv:1706.06083](https://arxiv.org/abs/1706.06083)
2. A. Athalye, N. Carlini and D. Wagner (2018). Obfuscated gradients give a false sense of security: Circumventing defenses to adversarial examples. [arXiv:1802.00420](https://arxiv.org/abs/1802.00420)
3. B. Jacob, S. Kligys, B. Chen, M. Zhu, M. Tang, A. Howard, H. Adam and D. Kalenichenko (2018). Quantization and training of neural networks for efficient integer-arithmetic-only inference. [arXiv:1712.05877](https://arxiv.org/abs/1712.05877)
4. W. Xu, D. Evans and Y. Qi (2018). Feature squeezing: Detecting adversarial examples in deep neural networks. [arXiv:1704.01155](https://arxiv.org/abs/1704.01155)
5. T. Brown, D. Mané, A. Roy, M. Abadi and J. Gilmer (2017). Adversarial patch. [arXiv:1712.09665](https://arxiv.org/abs/1712.09665)
6. T. Gu, B. Dolan-Gavitt and S. Garg (2017). BadNets: Identifying vulnerabilities in the machine learning model supply chain. [arXiv:1708.06733](https://arxiv.org/abs/1708.06733)
7. E. Wong, L. Rice and J. Z. Kolter (2020). Fast is better than free: Revisiting adversarial training. [arXiv:2001.03994](https://arxiv.org/abs/2001.03994)
