export type KathaLanguage = "te-IN" | "hi-IN" | "en-IN" | "ta-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "pa-IN" | "gu-IN" | "hi-en";
export type KathaVoice = { name: string; language: KathaLanguage; languageName: string; persona: string; gender: string };

const VOICE_ROWS: [string, string, string, string, string][] = [
  ["Ambuja", "hi-IN", "Hindi", "Professional", "Female"], ["Asmita", "ta-IN", "Tamil", "Professional", "Female"],
  ["Bhavna", "hi-IN", "Hindi", "Friendly", "Female"], ["Brinda", "ta-IN", "Tamil", "Professional", "Female"],
  ["Chitra", "hi-IN", "Hindi", "Warm", "Female"], ["Deepak", "hi-IN", "Hindi", "Professional", "Male"],
  ["Devika", "en-IN", "English", "Professional", "Female"], ["Dhruva", "bn-IN", "Bengali", "Conversational", "Male"],
  ["Falak", "gu-IN", "Gujarati", "Conversational", "Female"], ["Girish", "en-IN", "English", "Expressive", "Male"],
  ["Hemraj", "hi-IN", "Hindi", "Confident", "Male"], ["Ishaan", "mr-IN", "Marathi", "Professional", "Male"],
  ["Jalaj", "hi-IN", "Hindi", "Expressive", "Male"], ["Jwala", "hi-IN", "Hindi", "Friendly", "Female"],
  ["Kaveri", "en-IN", "English", "Professional", "Female"], ["Kavin", "kn-IN", "Kannada", "Professional", "Male"],
  ["Kirra", "bn-IN", "Bengali", "Conversational", "Female"], ["Lavanya", "te-IN", "Telugu", "Warm", "Female"],
  ["Lehara", "te-IN", "Telugu", "Warm", "Female"], ["Mehuli", "pa-IN", "Punjabi", "Expressive", "Female"],
  ["Nalini", "hi-IN", "Hindi", "Friendly", "Female"], ["Noopur", "ta-IN", "Tamil", "Friendly", "Female"],
  ["Omkar", "hi-IN", "Hindi", "Confident", "Male"], ["Poorvi", "hi-en", "Hinglish", "Conversational", "Female"],
  ["Pranav", "en-IN", "English", "Friendly", "Male"], ["Reshma", "ml-IN", "Malayalam", "Friendly", "Female"],
  ["Riyaan", "ml-IN", "Malayalam", "Conversational", "Male"], ["Roopesh", "hi-IN", "Hindi", "Professional", "Male"],
  ["Saanvi", "kn-IN", "Kannada", "Expressive", "Female"], ["Shlok", "en-IN", "English", "Conversational", "Male"],
  ["Suhana", "te-IN", "Telugu", "Warm", "Female"], ["Trisha", "ta-IN", "Tamil", "Friendly", "Female"],
  ["Trupti", "en-IN", "English", "Professional", "Female"], ["Urmila", "hi-IN", "Hindi", "Professional", "Female"],
  ["Varuni", "te-IN", "Telugu", "Conversational", "Female"], ["Vedika", "ta-IN", "Tamil", "Professional", "Female"],
  ["Veera", "gu-IN", "Gujarati", "Friendly", "Male"], ["Vikrant", "hi-IN", "Hindi", "Conversational", "Male"],
  ["Yashvi", "hi-IN", "Hindi", "Warm", "Female"], ["Yukti", "te-IN", "Telugu", "Friendly", "Female"],
  ["Zahira", "mr-IN", "Marathi", "Expressive", "Female"], ["Zayan", "pa-IN", "Punjabi", "Warm", "Male"],
];

export const TIMBRE_V25_VOICES: KathaVoice[] = VOICE_ROWS.map(([name, language, languageName, persona, gender]) => ({ name, language: language as KathaLanguage, languageName, persona, gender }));

const VOICE_PREVIEW_LINES: Record<KathaLanguage, string> = {
  "te-IN": "నమస్కారం, ఇది మీ కథ కోసం ఒక స్వర నమూనా.",
  "hi-IN": "नमस्कार, यह आपकी कहानी के लिए एक आवाज़ का नमूना है।",
  "en-IN": "Hello, this is a voice sample for your story.",
  "ta-IN": "வணக்கம், இது உங்கள் கதைக்கான ஒரு குரல் மாதிரி.",
  "kn-IN": "ನಮಸ್ಕಾರ, ಇದು ನಿಮ್ಮ ಕಥೆಗಾಗಿ ಒಂದು ಧ್ವನಿ ಮಾದರಿ.",
  "ml-IN": "നമസ്കാരം, ഇത് നിങ്ങളുടെ കഥയ്ക്കുള്ള ഒരു ശബ്ദ മാതൃകയാണ്.",
  "bn-IN": "নমস্কার, এটি আপনার গল্পের জন্য একটি কণ্ঠের নমুনা।",
  "mr-IN": "नमस्कार, हा तुमच्या कथेसाठी आवाजाचा नमुना आहे.",
  "pa-IN": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਇਹ ਤੁਹਾਡੀ ਕਹਾਣੀ ਲਈ ਆਵਾਜ਼ ਦਾ ਨਮੂਨਾ ਹੈ।",
  "gu-IN": "નમસ્તે, આ તમારી વાર્તા માટે અવાજનો નમૂનો છે.",
  "hi-en": "Namaste, yeh aapki kahani ke liye ek voice sample hai.",
};

export function getVoicePreviewLine(voice: Pick<KathaVoice, "language">) {
  return VOICE_PREVIEW_LINES[voice.language];
}

export function getTimbrePreferredLanguage(voiceName: string) {
  return TIMBRE_V25_VOICES.find(voice => voice.name === voiceName)?.language;
}
