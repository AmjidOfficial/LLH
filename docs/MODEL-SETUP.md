# Model selection and commercial licence review

## Decision: FASHN VTON v1.5 is blocked for LLH commercial use in its current dependency chain

The FASHN VTON v1.5 repository is published under Apache 2.0. However, its inference pipeline imports `fashn-human-parser` as a required dependency. The parser's own README points to the NVIDIA Source Code License for SegFormer. Section 3.3 limits the parser work and derivatives to non-commercial research/evaluation use. That conflicts with LLH's commercial customer try-on service.

Sources:
- [FASHN VTON v1.5 pipeline](https://github.com/fashn-AI/fashn-vton-1.5/blob/main/src/fashn_vton/pipeline.py)
- [FASHN Human Parser licence notice](https://github.com/fashn-AI/fashn-human-parser)
- [NVIDIA SegFormer licence, section 3.3](https://github.com/NVlabs/SegFormer/blob/master/LICENSE)

Do not download or deploy the FASHN Human Parser weights for LLH commercial use unless LLH obtains written commercial rights or replaces the parser with a separately licensed, compatible implementation and validates the changed pipeline. The FASHN adapter in this branch is experimental only and must not be enabled for production.

## Next commercial-safe candidate: Qwen-Image-Edit-2511

The official Hugging Face model card lists Apache 2.0. It supports image editing and multi-reference editing, which makes it a candidate for an LLH-specific outfit editing prototype.

- Model: https://huggingface.co/Qwen/Qwen-Image-Edit-2511
- Licence shown by the model card: Apache 2.0.
- This is a general image-editing model, not a purpose-built virtual try-on model.
- It may alter garment details, logos, seams, pockets, texture, colour or identity. It must pass a product-fidelity benchmark before customer use.
- The model is large. Rent a suitable GPU only after confirming VRAM, memory-offload behaviour and per-image cost in a small benchmark.
- Review the exact model revision, tokenizer, VAE, libraries and all downloaded weights before commercial deployment.

## Other candidate

FLUX.2 Klein 4B lists Apache 2.0 for the 4B model, but its model card also refers commercial self-hosted users to additional BFL terms and policies. Do not select it until those terms are reviewed.

## Acceptance gate

No model is approved merely because its main repository says Apache 2.0. Review all runtime dependencies, checkpoints, datasets, base models and training assets. Keep a bill of materials with exact revisions and licence copies. The product must preserve actual LLH SKU attributes and show that the preview is AI-generated, not a guaranteed fit or an exact physical rendering.
