import { tool } from "@kilocode/plugin";

/**
## Speak tool

Sends a message to a Pocket TTS server and plays the returned audio via speaker lib.

Note: needs https://github.com/Kilo-Org/kilo/pull/581 to work properly, otherwise the agent will continue after speaking.

Install:
- Add `"speaker": "^0.5.4"` to `~/.config/kilo/package.json`
- Build speaker plugin: `cd ~/.config/kilo && npm install && npm rebuild speaker`

Usage:
- Start Pocket TTS server: `uvx pocket-tts serve --port 5003`
- Adjust prompt/description below as needed
- Also add instructions to AGENTS.md when/how to use this tool

Pocket TTS: https://github.com/kyutai-labs/pocket-tts
uv/uvx: https://docs.astral.sh/uv/getting-started/installation/
 */

const DESCRIPTION = `Speak a short message aloud to the user via text-to-speech.

MANDATORY: Call this tool at the end of EVERY assistant turn — including after completing a task, after asking the user a question, and after any error or waiting state.

USAGE:
- Call this tool ONCE as the very last action of every turn
- Summarize results in 1-2 sentences; single words ("Done", "Failed", "Ready") are fine for short tasks
- Speak summarizes — it never replaces. Always deliver the full response as text first; speak only narrates it.
- Use natural spoken language — no markdown, no special characters
- Keep it brief: the user will hear it aloud
`;

export default tool({
  description: DESCRIPTION,
  args: {
    text: tool.schema
      .string()
      .describe(
        "Short spoken summary of what was done or what the assistant needs from the user. 1-2 sentences max.",
      ),
    voice: tool.schema
      .string()
      .optional()
      .describe(
        "Voice URL or predefined voice name (e.g. 'alba', 'marius', 'jean'). Leave empty for default voice.",
      ),
    gain: tool.schema
      .number()
      .optional()
      .describe(
        "Audio gain multiplier (e.g. 0.5 for quieter, 2.0 for louder). Default is 1.0.",
      ),
  },
  async execute(args) {
    const text = args.text;
    const ttsUrl = process.env.TTS_URL || "http://localhost:5003";

    const form = new FormData();
    form.append("text", text);
    const voice = args.voice || "azelma";
    // Predefined names and hf:// URIs are voice_url; http(s):// URLs too
    form.append("voice_url", voice);

    try {
      const response = await fetch(`${ttsUrl}/tts`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        return {
          title: "TTS Error",
          output: `TTS request failed: ${response.status} ${response.statusText}`,
          metadata: {},
        };
      }

      const audioBuffer = await response.arrayBuffer();
      const wavData = Buffer.from(audioBuffer);

      // Dynamic import for speaker (ESM)
      const { default: Speaker } = await import("speaker");

      // Standard WAV: RIFF header (12 bytes), fmt chunk
      const numChannels = wavData.readUInt16LE(22);
      const sampleRate = wavData.readUInt32LE(24);
      const bitsPerSample = wavData.readUInt16LE(34);

      // Find data chunk (skip headers)
      let dataOffset = 12;
      while (dataOffset < wavData.length - 8) {
        const chunkId = wavData.toString("ascii", dataOffset, dataOffset + 4);
        const chunkSize = wavData.readUInt32LE(dataOffset + 4);
        if (chunkId === "data") {
          dataOffset += 8;
          break;
        }
        dataOffset += 8 + chunkSize;
      }

      const audioData = wavData.subarray(dataOffset);

      const gain = args.gain ?? 1.0;
      let processedAudio = audioData;
      if (gain !== 1.0 && bitsPerSample === 16) {
        processedAudio = Buffer.alloc(audioData.length);
        for (let i = 0; i < audioData.length; i += 2) {
          const sample = audioData.readInt16LE(i);
          const scaled = Math.max(
            -32768,
            Math.min(32767, Math.round(sample * gain)),
          );
          processedAudio.writeInt16LE(scaled, i);
        }
      }

      const speaker = new Speaker({
        channels: numChannels,
        bitDepth: bitsPerSample,
        sampleRate: sampleRate,
        signed: bitsPerSample === 16,
      });

      return new Promise((resolve) => {
        speaker.on("close", () => {
          resolve({
            title: "Spoken",
            output: `Assistant spoke: "${text}"`,
            metadata: { stop: true },
          });
        });

        speaker.on("error", (err: Error) => {
          resolve({
            title: "Audio Error",
            output: `Audio playback error: ${err.message}`,
            metadata: {},
          });
        });

        speaker.write(processedAudio);
        speaker.end();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        title: "TTS Error",
        output: `TTS error: ${message}. Is the TTS service running at ${ttsUrl}?`,
        metadata: {},
      };
    }
  },
});
