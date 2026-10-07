"""QLoRA fine-tuning script for Qwen3-4B.

Runs SEPARATELY from the product. This is research code.

Usage (on the GPU machine, with a separate venv):
    python -m research.training.train_qlora \
        --data research/training/data/sft_train.jsonl \
        --output research/training/output/qlora_adapter \
        --base_model Qwen/Qwen3-4B-Instruct-2507

Dependencies (install separately, not in the product):
    pip install peft transformers trl datasets accelerate bitsandbytes
"""

import argparse
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer


def load_sft_data(data_path: Path) -> Dataset:
    """Load SFT JSONL into a HuggingFace Dataset."""
    import json

    examples = []
    with open(data_path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                examples.append(json.loads(line))
    return Dataset.from_list(examples)


def train(
    data_path: Path,
    output_dir: Path,
    base_model: str,
    num_epochs: int = 3,
    batch_size: int = 2,
    learning_rate: float = 2e-4,
    lora_r: int = 16,
    lora_alpha: int = 32,
    max_seq_length: int = 2048,
) -> None:
    """Run QLoRA fine-tuning."""
    print(f"Loading base model: {base_model}")

    # Quantization config (4-bit)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
    )
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    tokenizer.pad_token = tokenizer.eos_token

    # LoRA config
    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load data
    dataset = load_sft_data(data_path)
    print(f"Loaded {len(dataset)} training examples")

    # Training arguments
    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=4,
        learning_rate=learning_rate,
        warmup_steps=50,
        logging_steps=10,
        save_steps=100,
        save_total_limit=3,
        fp16=False,
        bf16=True,
        gradient_checkpointing=True,
        optim="paged_adamw_8bit",
        lr_scheduler_type="cosine",
        report_to="none",
        max_seq_length=max_seq_length,
    )

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        tokenizer=tokenizer,
        max_seq_length=max_seq_length,
        packing=False,
    )

    # Train
    print("Starting training...")
    trainer.train()

    # Save
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    print(f"Saved adapter to {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QLoRA fine-tuning")
    parser.add_argument("--data", type=str, required=True)
    parser.add_argument("--output", type=str, required=True)
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen3-4B-Instruct-2507")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=2)
    parser.add_argument("--lr", type=float, default=2e-4)
    args = parser.parse_args()

    train(
        data_path=Path(args.data),
        output_dir=Path(args.output),
        base_model=args.base_model,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
    )
