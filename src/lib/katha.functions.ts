import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getTimbrePreferredLanguage } from "@/lib/katha/voices";

const LANGUAGES = ["te-IN", "hi-IN", "en-IN", "ta-IN", "kn-IN", "ml-IN", "bn-IN", "mr-IN", "pa-IN", "gu-IN", "hi-en"] as const;
const languageSchema = z.enum(LANGUAGES);
const audioInputSchema = z.object({ base64: z.string().min(1).max(32_000_000), mimeType: z.string().max(120).default("audio/wav"), language: languageSchema });
const ttsInputSchema = z.object({ text: z.string().trim().min(1).max(3000), voice: z.string().min(1).max(60), language: languageSchema, speed: z.number().min(0.85).max(1.15).default(1), voicePreview: z.boolean().default(false) });
const scriptSchema = z.object({
  title: z.string().min(1).max(160), synopsis: z.string().max(1200), language: languageSchema,
  characters: z.array(z.object({ id: z.string(), name: z.string().min(1), role: z.string(), description: z.string() })).max(80),
  scenes: z.array(z.object({ id: z.string(), title: z.string().min(1), order: z.number().int().positive(), lines: z.array(z.object({ id: z.string(), speakerId: z.string(), text: z.string(), type: z.string(), order: z.number().int().positive() })).max(300) })).max(80),
});

function missing(name: string) { return { ok: false as const, message: `Missing server setting: ${name}.` }; }
function safeProviderMessage(status: number) {
  if (status === 401 || status === 403) return "The provider rejected its server credential or account access.";
  if (status === 429) return "The provider is rate-limiting requests. Please retry shortly.";
  if (status === 413) return "The uploaded audio exceeds the provider's file limit.";
  if (status === 415 || status === 422) return "The provider could not accept this audio or request format.";
  if (status >= 500) return "The provider is temporarily unavailable.";
  return "The provider request could not be completed.";
}

export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => ({
  gnaniConfigured: Boolean(process.env["GNANI_API_KEY"]),
  groqConfigured: Boolean(process.env["GROQ_API_KEY"]),
  groqModelConfigured: Boolean(process.env["GROQ_MODEL"]),
  groqModel: process.env["GROQ_MODEL"] ? "configured" : null,
}));

export const testGnaniConnection = createServerFn({ method: "POST" }).handler(async () => {
  const key = process.env["GNANI_API_KEY"];
  if (!key) return missing("GNANI_API_KEY");
  try {
    const response = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST", headers: { "X-API-Key-ID": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "నమస్కారం", voice: "Suhana", model: "timbre-v2.5", language: "te-IN", speed: 1, audio_config: { encoding: "linear_pcm", container: "wav", num_channels: 1, sample_rate: 48000, sample_width: 2 } }),
    });
    if (!response.ok) return { ok: false as const, message: safeProviderMessage(response.status) };
    const audio = await response.arrayBuffer();
    return audio.byteLength > 44 ? { ok: true as const, message: "Gnani returned a real Timbre audio sample." } : { ok: false as const, message: "Gnani responded without playable audio." };
  } catch { return { ok: false as const, message: "Could not reach Gnani. Check network access and try again." }; }
});

export const testGroqConnection = createServerFn({ method: "POST" }).handler(async () => {
  const key = process.env["GROQ_API_KEY"];
  const model = process.env["GROQ_MODEL"];
  if (!key) return missing("GROQ_API_KEY");
  if (!model) return missing("GROQ_MODEL");
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) return { ok: false as const, message: safeProviderMessage(response.status) };
    const payload = await response.json() as { data?: { id?: string }[] };
    return payload.data?.some(item => item.id === model)
      ? { ok: true as const, message: "Groq is reachable and the configured model is available." }
      : { ok: false as const, message: "Groq is reachable, but the configured model was not found for this account." };
  } catch { return { ok: false as const, message: "Could not reach Groq. Check network access and try again." }; }
});

export const transcribeKathaAudio = createServerFn({ method: "POST" }).validator((data) => audioInputSchema.parse(data)).handler(async ({ data }) => {
  const key = process.env["GNANI_API_KEY"];
  if (!key) return { ok: false as const, message: "Missing server setting: GNANI_API_KEY." };
  try {
    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const form = new FormData();
    form.append("audio_file", new Blob([bytes], { type: data.mimeType }), "katha-recording");
    form.append("language_code", data.language);
    const response = await fetch("https://api.vachana.ai/stt/v3", { method: "POST", headers: { "X-API-Key-ID": key }, body: form, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) return { ok: false as const, message: safeProviderMessage(response.status) };
    const payload = await response.json() as { transcript?: unknown; model?: unknown };
    if (typeof payload.transcript !== "string") return { ok: false as const, message: "Gnani returned an unexpected transcription response." };
    if (payload.model !== "prisma-v2.5") return { ok: false as const, message: "The response was not from the requested Prisma v2.5 model." };
    return { ok: true as const, transcript: payload.transcript, model: "prisma-v2.5" };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error && error.name === "TimeoutError" ? "Transcription timed out. Try a shorter audio clip." : "Transcription could not be completed." };
  }
});

export const generateKathaSpeech = createServerFn({ method: "POST" }).validator((data) => ttsInputSchema.parse(data)).handler(async ({ data }) => {
  const key = process.env["GNANI_API_KEY"];
  if (!key) return { ok: false as const, message: "Missing server setting: GNANI_API_KEY." };
  const language = data.voicePreview ? getTimbrePreferredLanguage(data.voice) : data.language;
  if (!language) return { ok: false as const, message: "This voice is not in the Timbre v2.5 catalogue." };
  try {
    const response = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST", headers: { "X-API-Key-ID": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.text, voice: data.voice, model: "timbre-v2.5", language, speed: data.speed, audio_config: { encoding: "linear_pcm", container: "wav", num_channels: 1, sample_rate: 48000, sample_width: 2 } }), signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return { ok: false as const, message: safeProviderMessage(response.status) };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 44) return { ok: false as const, message: "Gnani returned an incomplete audio file." };
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return { ok: true as const, audioBase64: btoa(binary), mimeType: response.headers.get("content-type") ?? "audio/wav" };
  } catch { return { ok: false as const, message: "Speech generation timed out or could not reach Gnani." }; }
});

export const generateKathaScreenplay = createServerFn({ method: "POST" }).validator((data) => z.object({ story: z.string().trim().min(12).max(30000), language: languageSchema, notes: z.string().max(500).optional() }).parse(data)).handler(async ({ data }) => {
  const key = process.env["GROQ_API_KEY"];
  const model = process.env["GROQ_MODEL"];
  if (!key) return { ok: false as const, message: "Missing server setting: GROQ_API_KEY." };
  if (!model) return { ok: false as const, message: "Missing server setting: GROQ_MODEL." };
  const languageName = new Map([["te-IN", "Telugu"], ["hi-IN", "Hindi"], ["en-IN", "English"], ["ta-IN", "Tamil"], ["kn-IN", "Kannada"], ["ml-IN", "Malayalam"], ["bn-IN", "Bengali"], ["mr-IN", "Marathi"], ["pa-IN", "Punjabi"], ["gu-IN", "Gujarati"], ["hi-en", "Hinglish"]]).get(data.language) ?? data.language;
  const prompt = `Transform this story into an editable screenplay. Preserve its language and events; do not invent plot elements. Use ${languageName} (${data.language}). Return JSON with title, synopsis, language, characters [{id,name,role,description}], scenes [{id,title,order,lines:[{id,speakerId,text,type,order}]}]. Preserve the supplied story's language and meaning. ${data.notes ? `Production notes: ${data.notes}` : ""}\nSTORY:\n${data.story}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "system", content: "You are a faithful screenplay structurer. Output JSON only; do not add plot events." }, { role: "user", content: attempt ? `${prompt}\nReturn valid JSON only and include every required key.` : prompt }], response_format: { type: "json_object" }, temperature: 0.2 }), signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) return { ok: false as const, message: safeProviderMessage(response.status) };
      const result = await response.json() as { choices?: { message?: { content?: string } }[] };
      const raw = result.choices?.[0]?.message?.content;
      if (typeof raw !== "string") continue;
      const parsedJson: unknown = JSON.parse(raw);
      const screenplay = scriptSchema.safeParse(parsedJson);
      if (screenplay.success) return { ok: true as const, screenplay: screenplay.data };
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.message.includes("fetch"))) return { ok: false as const, message: "Groq timed out or could not be reached." };
    }
  }
  return { ok: false as const, message: "Groq returned screenplay data that did not pass validation. Your original story remains unchanged." };
});
