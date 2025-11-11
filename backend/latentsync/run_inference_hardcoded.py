#!/usr/bin/env python3
"""
run_inference_hardcoded.py

Small helper to run LatentSync inference with a few hardcoded, easy-to-edit
parameters. Edit the constants below to set input/output paths and the
two primary tunables: INFERENCE_STEPS and GUIDANCE_SCALE.

This script re-uses the existing `scripts.inference.main` entrypoint so it
keeps behavior consistent with the project's CLI.
"""

import os
import sys
import argparse
from types import SimpleNamespace
from omegaconf import OmegaConf


# Ensure the project root (the folder that contains `scripts/`) is on sys.path.
# This makes the import work even if the script is copied or executed from
# a different working directory.
def _find_project_root_with_scripts(start_dir: str) -> str:
    cur = os.path.abspath(start_dir)
    while True:
        if os.path.isdir(os.path.join(cur, "scripts")):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            # reached filesystem root
            return os.path.abspath(start_dir)
        cur = parent


_repo_root = _find_project_root_with_scripts(os.path.dirname(__file__))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Diagnostic info to help when the import fails after copying files
print(f"[run_inference_hardcoded] discovered repo root: {_repo_root}")
print(f"[run_inference_hardcoded] sys.path[0]: {sys.path[0]}")
print(f"[run_inference_hardcoded] listing {_repo_root} -> {os.listdir(_repo_root)[:20]}")

# Import the project's main inference entry (re-uses existing pipeline wiring)
try:
    from scripts.inference import main as inference_main
except Exception as e:
    # Provide an informative error including whether the scripts folder exists
    scripts_path = os.path.join(_repo_root, "scripts")
    scripts_exists = os.path.isdir(scripts_path)
    listing = os.listdir(scripts_path) if scripts_exists else None
    # Fallback: try to load scripts/inference.py directly by path. This is more robust
    # when imports/packages don't behave as expected after copying folders.
    if scripts_exists:
        inference_py = os.path.join(scripts_path, "inference.py")
        if os.path.isfile(inference_py):
            try:
                import importlib.util

                spec = importlib.util.spec_from_file_location("scripts.inference", inference_py)
                if spec is None or spec.loader is None:
                    raise ImportError(f"Could not create module spec for {inference_py}")
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                # register in sys.modules so relative imports inside inference.py work
                sys.modules["scripts.inference"] = module
                inference_main = getattr(module, "main")
                print(f"[run_inference_hardcoded] successfully loaded {inference_py} via importlib")
            except Exception as e2:
                raise ImportError(
                    f"Failed to import scripts.inference (via normal import and via direct load). repo_root={_repo_root}, "
                    f"scripts_exists={scripts_exists}, scripts_listing={listing}. Original error: {e}; fallback error: {e2}"
                )
        else:
            raise ImportError(
                f"Failed to import scripts.inference. repo_root={_repo_root}, scripts_exists={scripts_exists}, "
                f"scripts_listing={listing}. 'inference.py' not found in scripts folder. Original error: {e}"
            )
    else:
        raise ImportError(
            f"Failed to import scripts.inference. repo_root={_repo_root}, scripts_exists={scripts_exists}. "
            f"Make sure a 'scripts' folder exists under the repo root. Original error: {e}"
        )

# ---------------------- EDIT THESE (defaults, can be overridden by CLI) ----------------------
# Paths (relative to repo root)
UNET_CONFIG = "configs/unet/stage2_512.yaml"
CKPT_PATH = "checkpoints/latentsync_unet.pt"
VIDEO_PATH = "assets/demo1_video.mp4"    # input video
AUDIO_PATH = "assets/demo1_audio.wav"   # input audio
OUTPUT_PATH = "temp/hardcoded_output.mp4"  # where the final mp4 will be written

# Tunable inference parameters
INFERENCE_STEPS = 20
GUIDANCE_SCALE = 1.5
SEED = 1247
TEMP_DIR = "temp"
ENABLE_DEEPCACHE = True
# -------------------------------------------------------------------------------------------


def parse_cli_args():
    parser = argparse.ArgumentParser(description="Run LatentSync inference with optional overrides for input/output paths and params.")
    parser.add_argument("--unet-config", dest="unet_config", default=UNET_CONFIG)
    parser.add_argument("--ckpt-path", dest="ckpt_path", default=CKPT_PATH)
    parser.add_argument("--video-path", dest="video_path", default=VIDEO_PATH)
    parser.add_argument("--audio-path", dest="audio_path", default=AUDIO_PATH)
    parser.add_argument("--video-out-path", dest="video_out_path", default=OUTPUT_PATH)
    parser.add_argument("--inference-steps", dest="inference_steps", type=int, default=INFERENCE_STEPS)
    parser.add_argument("--guidance-scale", dest="guidance_scale", type=float, default=GUIDANCE_SCALE)
    parser.add_argument("--seed", dest="seed", type=int, default=SEED)
    parser.add_argument("--temp-dir", dest="temp_dir", default=TEMP_DIR)
    parser.add_argument("--enable-deepcache", dest="enable_deepcache", type=lambda v: v.lower() in ("1", "true", "yes"), default=ENABLE_DEEPCACHE)
    # slicing/compile flags left as constants but can be added if needed
    return parser.parse_args()


def build_args(parsed):
    """Return a namespace similar to argparse Namespace expected by scripts.inference.main

    `parsed` is the argparse.Namespace returned by parse_cli_args().
    """
    return SimpleNamespace(
        inference_ckpt_path=parsed.ckpt_path,
        video_path=parsed.video_path,
        audio_path=parsed.audio_path,
        video_out_path=parsed.video_out_path,
        inference_steps=parsed.inference_steps,
        guidance_scale=parsed.guidance_scale,
        temp_dir=parsed.temp_dir,
        seed=parsed.seed,
        enable_deepcache=parsed.enable_deepcache,
        enable_attention_slicing=True,
        enable_vae_slicing=True,
        enable_torch_compile=False,
        use_dpmsolver=False,
    )


def main():
    # Parse CLI overrides (if any)
    parsed = parse_cli_args()

    # Ensure output folder exists
    out_dir = os.path.dirname(parsed.video_out_path) or "."
    os.makedirs(out_dir, exist_ok=True)

    # Resolve any relative paths against the discovered repo root so the script
    # works correctly even when launched with a different current working dir.
    unet_config_path = parsed.unet_config
    if not os.path.isabs(unet_config_path):
        unet_config_path = os.path.join(_repo_root, unet_config_path)

    ckpt_path = parsed.ckpt_path
    if not os.path.isabs(ckpt_path):
        ckpt_path = os.path.join(_repo_root, ckpt_path)

    # Load config and run the project's main() -- this will set up models and pipeline
    config = OmegaConf.load(unet_config_path)
    # Replace parsed values with resolved absolute paths so downstream code sees them
    parsed.ckpt_path = ckpt_path
    parsed.unet_config = unet_config_path
    args = build_args(parsed)

    print("Running LatentSync with the following settings:")
    print(f"  video: {args.video_path}")
    print(f"  audio: {args.audio_path}")
    print(f"  output: {args.video_out_path}")
    print(f"  checkpoint: {args.inference_ckpt_path}")
    print(f"  inference_steps: {args.inference_steps}")
    print(f"  guidance_scale: {args.guidance_scale}")

    inference_main(config=config, args=args)

    print(f"Finished. Output saved to: {args.video_out_path}")


if __name__ == "__main__":
    main()
