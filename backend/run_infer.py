"""Standalone inference runner using the repo's F5TTS API.

This script supports CLI arguments so a supervisor process (FastAPI) can
invoke it with the reference audio, generation text, and output path.
If arguments are not provided, the script falls back to the hardcoded
defaults present below (maintained for backward compatibility).
"""
import os
import argparse
from pathlib import Path

from f5_tts.api import F5TTS

# === Edit these parameters to match your environment (defaults) ===
MODEL_TYPE = "F5-TTS"  # or 'E2-TTS'
CHECKPOINT_PATH = r"E:\Bhuvan\F5-TTS\ckpts\capstone_final\model_last.pt"
VOCAB_FILE = r"E:\Bhuvan\F5-TTS\data\Capstone_final_char\vocab.txt"  # point to the project's vocab.txt
USE_EMA = False
NFE_STEPS = 64
SWAY_SAMPLING_COEF = -1
SPEED = 0.7
DEVICE = None  # None -> let F5TTS choose (cuda/mps/cpu)

USE_DURATION_MODEL = True

# Fallback reference/gen values (kept for manual runs)
REF_AUDIO = r"C:\Users\admin\Downloads\Test.wav"
REF_TEXT = ""
# GEN_TEXT = (
#     "In my old banking job, where I worked for 12 years, "
#     "I found myself frustrated with the slow pace of the work, "
#     "the layers of red tape and approvals to get anything done."
# )

# Output default
OUT_DIR = Path(".") / "infer_out"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_WAV = OUT_DIR / "generated_out.wav"


def parse_args():
    p = argparse.ArgumentParser(description="Run F5-TTS inference with optional overrides")
    p.add_argument("--ref-audio", type=str, help="Path to reference audio file")
    p.add_argument("--ref-text", type=str, help="Reference text associated with ref audio")
    p.add_argument("--gen-text", type=str, help="Generation text to synthesize")
    p.add_argument("--out-wav", type=str, help="Output WAV path to write generated audio")
    p.add_argument("--nfe-steps", type=int, help="Number of NFE steps to use for ODE sampler")
    p.add_argument("--sway-coef", type=float, help="Sway sampling coefficient (sway_sampling_coef)")
    p.add_argument("--speed", type=float, help="Speaking speed multiplier")
    p.add_argument("--seed", type=int, help="RNG seed for sampling (int)")
    return p.parse_args()


def main():
    args = parse_args()

    ref_audio = args.ref_audio if args.ref_audio else REF_AUDIO
    ref_text = args.ref_text if args.ref_text else REF_TEXT
    # Ensure gen_text is at least an empty string when not provided so the
    # downstream model sees a defined value (avoids ambiguous fallback).
    gen_text = args.gen_text if args.gen_text is not None else ""
    if isinstance(gen_text, str):
        gen_text = gen_text.strip()
    out_wav = Path(args.out_wav) if (args.out_wav) else OUT_WAV
    nfe_steps = args.nfe_steps if args.nfe_steps else NFE_STEPS
    sway_coef = args.sway_coef if args.sway_coef is not None else SWAY_SAMPLING_COEF
    speed = args.speed if args.speed is not None else SPEED
    seed = args.seed if args.seed is not None else 42

    print("Initializing F5TTS...")
    print(f"Using ref_audio={ref_audio}")
    print(f"ref_text_len={len(ref_text) if ref_text else 0}, gen_text_len={len(gen_text) if gen_text else 0}, out_wav={out_wav}")
    if gen_text:
        print(f"gen_text (preview): {gen_text[:200]}")
    else:
        print("Warning: gen_text is empty. If you expect the model to synthesize custom text, ensure the caller passes --gen-text.")

    tts = F5TTS(
        model_type=MODEL_TYPE,
        ckpt_file=CHECKPOINT_PATH,
        vocab_file=VOCAB_FILE,
        use_ema=USE_EMA,
        device=DEVICE,
    )

    print("Running inference...")

    out_wav.parent.mkdir(parents=True, exist_ok=True)

    # F5TTS.infer returns (wav, sr, spect). It will write to out_wav if file_wave is supplied.
    wav, sr, spect = tts.infer(
        ref_file=ref_audio,
        ref_text=ref_text,
        gen_text=gen_text,
        nfe_step=nfe_steps,
        sway_sampling_coef=sway_coef,
        speed=speed,
        seed=seed,
        file_wave=str(out_wav),
    )

    print(f"Inference complete. Output saved to: {out_wav} (sr={sr})")
    print(f"Returned waveform shape/type: {type(wav)}")


if __name__ == "__main__":
    main()
