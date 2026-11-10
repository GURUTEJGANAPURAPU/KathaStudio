import { describe, expect, it } from "vitest";
import { assertPrismaDuration, encodePcmWav } from "@/lib/katha/audio";
import { getTimbrePreferredLanguage, getVoicePreviewLine, TIMBRE_V25_VOICES } from "@/lib/katha/voices";

describe("Katha audio and verified voice rules", () => {
  it("accepts the documented 30-second Prisma limit", () => {
    expect(() => assertPrismaDuration(30)).not.toThrow();
  });

  it("rejects clips longer than 30 seconds for Prisma v2.5", () => {
    expect(() => assertPrismaDuration(30.01)).toThrow("Prisma v2.5 accepts audio clips up to 30 seconds.");
  });

  it("offers only the 42 voices listed in the Timbre v2.5 catalogue", () => {
    expect(TIMBRE_V25_VOICES).toHaveLength(42);
    expect(TIMBRE_V25_VOICES.map(voice => voice.name)).toContain("Suhana");
    expect(TIMBRE_V25_VOICES.map(voice => voice.name)).not.toContain("Sreeja");
  });

  it("uses each voice's own language metadata for its localized preview", () => {
    const hindiVoice = TIMBRE_V25_VOICES.find(voice => voice.name === "Ambuja");
    const englishVoice = TIMBRE_V25_VOICES.find(voice => voice.name === "Devika");
    if (!hindiVoice || !englishVoice) throw new Error("Expected catalogue preview voices are missing.");
    expect(getVoicePreviewLine(hindiVoice)).toBe("नमस्कार, यह आपकी कहानी के लिए एक आवाज़ का नमूना है।");
    expect(getVoicePreviewLine(hindiVoice)).not.toBe(getVoicePreviewLine(englishVoice));
    expect(getTimbrePreferredLanguage(hindiVoice.name)).toBe(hindiVoice.language);
    expect(TIMBRE_V25_VOICES.every(voice => getVoicePreviewLine(voice).length > 0)).toBe(true);
  });

  it("exports PCM audio with a WAV container signature", async () => {
    const blob = encodePcmWav(new Float32Array([0, 0.5, -0.5]), 48_000);
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Expected WAV bytes."));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read WAV bytes."));
      reader.readAsArrayBuffer(blob);
    });
    expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(buffer.slice(8, 12))).toBe("WAVE");
  });
});
