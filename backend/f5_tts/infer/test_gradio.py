import gradio as gr
from cached_path import cached_path
from f5_tts.infer.utils_infer import infer_process, preprocess_ref_audio_text, load_vocoder, load_model
from f5_tts.model import DiT, UNetT  # Import model classes

# Model configurations (adjust if needed)
F5TTS_model_cfg = dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4)
E2TTS_model_cfg = dict(dim=1024, depth=24, heads=16, ff_mult=4)

# Path to your custom finetuned checkpoint
custom_ckpt_path = rimport gradio as gr
from cached_path import cached_path
from f5_tts.infer.utils_infer import infer_process, preprocess_ref_audio_text, load_vocoder, load_model
from f5_tts.model import DiT, UNetT  # Import model classes

# Model configurations (adjust if needed)
F5TTS_model_cfg = dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4)
E2TTS_model_cfg = dict(dim=1024, depth=24, heads=16, ff_mult=4)

# Path to your custom finetuned checkpoint
custom_ckpt_path = r"C:\Users\admin\Bhuvan\F5-TTS\ckpts\capstone_finetune\model_1000.pt"

# Load vocoder once
vocoder = load_vocoder()

# Load your custom finetuned model (F5-TTS example)
F5TTS_ema_model = load_model(
    DiT,  # Model class, NOT string
    F5TTS_model_cfg,
    custom_ckpt_path
)

# Uncomment below if you want to test E2-TTS instead
# E2TTS_ema_model = load_model(
#     UNetT,
#     E2TTS_model_cfg,
#     custom_ckpt_path
# )

def infer(ref_audio_path, ref_text, gen_text, model_name, speed=1.0):
    if ref_audio_path is None:
        return None

    # Preprocess reference audio and text (auto transcribe if ref_text empty)
    ref_audio, ref_text = preprocess_ref_audio_text(ref_audio_path, ref_text)

    # Select model
    if model_name == "F5-TTS":
        ema_model = F5TTS_ema_model
    else:
        # Uncomment below if you loaded E2TTS model above
        # ema_model = E2TTS_ema_model
        return "E2-TTS model not loaded in this script."

    # Run inference with print as show_info to avoid NoneType error
    final_wave, final_sample_rate, _ = infer_process(
        ref_audio,
        ref_text,
        gen_text,
        ema_model,
        vocoder,
        cross_fade_duration=0.15,
        speed=speed,
        show_info=print,  # Pass print function here
        progress=None,
    )

    return final_sample_rate, final_wave

with gr.Blocks() as demo:
    gr.Markdown("## F5/E2 TTS Voice Cloning and Synthesis Demo")

    with gr.Row():
        ref_audio_input = gr.Audio(label="Reference Audio (for voice cloning)", type="filepath")
        ref_text_input = gr.Textbox(label="Reference Text (optional, leave blank to auto-transcribe)", lines=2)

    gen_text_input = gr.Textbox(label="Text to Generate", lines=4)
    model_choice = gr.Radio(["F5-TTS", "E2-TTS"], label="Choose TTS Model", value="F5-TTS")
    speed_slider = gr.Slider(0.3, 2.0, value=1.0, label="Speed")

    synth_button = gr.Button("Synthesize")

    audio_output = gr.Audio(label="Synthesized Audio")

    synth_button.click(
        infer,
        inputs=[ref_audio_input, ref_text_input, gen_text_input, model_choice, speed_slider],
        outputs=audio_output,
    )

if __name__ == "__main__":
    demo.launch()


# Load vocoder once
vocoder = load_vocoder()

# Load your custom finetuned model (F5-TTS example)
F5TTS_ema_model = load_model(
    DiT,  # Model class, NOT string
    F5TTS_model_cfg,
    custom_ckpt_path
)

# Uncomment below if you want to test E2-TTS instead
# E2TTS_ema_model = load_model(
#     UNetT,
#     E2TTS_model_cfg,
#     custom_ckpt_path
# )

def infer(ref_audio_path, ref_text, gen_text, model_name, speed=1.0):
    if ref_audio_path is None:
        return None

    # Preprocess reference audio and text (auto transcribe if ref_text empty)
    ref_audio, ref_text = preprocess_ref_audio_text(ref_audio_path, ref_text)

    # Select model
    if model_name == "F5-TTS":
        ema_model = F5TTS_ema_model
    else:
        # Uncomment below if you loaded E2TTS model above
        # ema_model = E2TTS_ema_model
        return "E2-TTS model not loaded in this script."

    # Run inference with print as show_info to avoid NoneType error
    final_wave, final_sample_rate, _ = infer_process(
        ref_audio,
        ref_text,
        gen_text,
        ema_model,
        vocoder,
        cross_fade_duration=0.15,
        speed=speed,
        show_info=print,  # Pass print function here
        progress=None,
    )

    return final_sample_rate, final_wave

with gr.Blocks() as demo:
    gr.Markdown("## F5/E2 TTS Voice Cloning and Synthesis Demo")

    with gr.Row():
        ref_audio_input = gr.Audio(label="Reference Audio (for voice cloning)", type="filepath")
        ref_text_input = gr.Textbox(label="Reference Text (optional, leave blank to auto-transcribe)", lines=2)

    gen_text_input = gr.Textbox(label="Text to Generate", lines=4)
    model_choice = gr.Radio(["F5-TTS", "E2-TTS"], label="Choose TTS Model", value="F5-TTS")
    speed_slider = gr.Slider(0.3, 2.0, value=1.0, label="Speed")

    synth_button = gr.Button("Synthesize")

    audio_output = gr.Audio(label="Synthesized Audio")

    synth_button.click(
        infer,
        inputs=[ref_audio_input, ref_text_input, gen_text_input, model_choice, speed_slider],
        outputs=audio_output,
    )

if __name__ == "__main__":
    demo.launch()
