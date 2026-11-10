export function encodePcmWav(samples: Float32Array, sampleRate: number): Blob {
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + samples.length * 2);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(headerSize + index * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function assertPrismaDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("The audio duration could not be read.");
  if (seconds > 30) throw new Error("Prisma v2.5 accepts audio clips up to 30 seconds.");
}

export async function normalizeAudioFile(file: File): Promise<Blob> {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) throw new Error("Audio conversion is unavailable in this browser.");
  const context = new AudioContextConstructor();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const samples = decoded.getChannelData(0);
    assertPrismaDuration(decoded.duration);
    const outputRate = 48_000;
    const outputLength = Math.ceil(samples.length * outputRate / decoded.sampleRate);
    const converted = new Float32Array(outputLength);
    for (let index = 0; index < outputLength; index += 1) {
      const sourceIndex = index * decoded.sampleRate / outputRate;
      const lower = Math.floor(sourceIndex);
      const upper = Math.min(samples.length - 1, lower + 1);
      const mix = sourceIndex - lower;
      converted[index] = (samples[lower] ?? 0) * (1 - mix) + (samples[upper] ?? 0) * mix;
    }
    return encodePcmWav(converted, outputRate);
  } finally {
    await context.close();
  }
}

export function formatAudioDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}