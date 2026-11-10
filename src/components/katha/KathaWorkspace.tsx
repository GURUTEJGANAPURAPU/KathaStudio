import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AudioLines,
  ArrowDownToLine,
  ArrowLeft,
  AudioWaveform,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Clock3,
  FileAudio2,
  FileText,
  Headphones,
  Home,
  Library,
  ListMusic,
  LoaderCircle,
  Mic,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Square,
  Trash2,
  Upload,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { blobToBase64, base64ToAudioBlob, deleteAudioAsset, getAudioAsset, saveAudioAsset } from "@/lib/katha/storage";
import { getVoicePreviewLine, TIMBRE_V25_VOICES, type KathaVoice } from "@/lib/katha/voices";
import { normalizeAudioFile } from "@/lib/katha/audio";
import { encodePcmWav } from "@/lib/katha/audio";
import { generateKathaScreenplay, generateKathaSpeech, getIntegrationStatus, testGnaniConnection, testGroqConnection, transcribeKathaAudio } from "@/lib/katha.functions";

export type StudioLine = { id: string; speaker: string; text: string; audioUrl?: string; audioAssetId?: string; voice?: string; speed?: number };
export type StudioScene = { id: string; title: string; lines: StudioLine[] };
export type StudioProject = {
  id: string;
  title: string;
  language: string;
  story: string;
  synopsis: string;
  updatedAt: string;
  status: "Draft" | "In production" | "Published";
  scenes: StudioScene[];
  audioUrl?: string;
  audioAssetId?: string;
  storyAudioAssetId?: string;
  storyAudioUrl?: string;
  voiceAssignments?: Record<string, string>;
  lockedVoices?: string[];
};

const LANGUAGES = [
  ["te-IN", "Telugu"], ["hi-IN", "Hindi"], ["en-IN", "English"], ["ta-IN", "Tamil"],
  ["kn-IN", "Kannada"], ["ml-IN", "Malayalam"], ["bn-IN", "Bengali"], ["mr-IN", "Marathi"], ["pa-IN", "Punjabi"], ["gu-IN", "Gujarati"], ["hi-en", "Hinglish"],
];
const NAV = [
  { label: "Dashboard", href: "/", icon: Home, page: "dashboard" },
  { label: "My productions", href: "/projects", icon: Library, page: "projects" },
  { label: "Create a story", href: "/create", icon: Plus, page: "create" },
  { label: "Voice library", href: "/voice-library", icon: AudioLines, page: "voice-library" },
  { label: "Audio studio", href: "/studio", icon: AudioWaveform, page: "studio" },
  { label: "Published", href: "/published", icon: Clapperboard, page: "published" },
  { label: "Settings", href: "/settings", icon: Settings2, page: "settings" },
] as const;

const STORAGE_KEY = "katha-studio-projects-v1";

function readProjects(): StudioProject[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as StudioProject[]) : [];
  } catch {
    return [];
  }
}

function persistProjects(projects: StudioProject[]) {
  const clean = projects.map(({ audioUrl: _audioUrl, storyAudioUrl: _storyAudioUrl, ...project }) => ({
    ...project,
    scenes: project.scenes.map(scene => ({ ...scene, lines: scene.lines.map(({ audioUrl: _lineUrl, ...line }) => line) })),
  }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

function useProjects() {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const existing = readProjects();
    setProjects(existing);
    setHydrated(true);
    void Promise.all(existing.map(async project => {
      const storyAudio = project.storyAudioAssetId ? await getAudioAsset(project.storyAudioAssetId).catch(() => undefined) : undefined;
      const finalAudio = project.audioAssetId ? await getAudioAsset(project.audioAssetId).catch(() => undefined) : undefined;
      const scenes = await Promise.all(project.scenes.map(async scene => ({
        ...scene,
        lines: await Promise.all(scene.lines.map(async line => {
          const asset = line.audioAssetId ? await getAudioAsset(line.audioAssetId).catch(() => undefined) : undefined;
          return asset ? { ...line, audioUrl: URL.createObjectURL(asset.blob) } : line;
        })),
      })));
      return { ...project, scenes, ...(storyAudio ? { storyAudioUrl: URL.createObjectURL(storyAudio.blob) } : {}), ...(finalAudio ? { audioUrl: URL.createObjectURL(finalAudio.blob) } : {}) } as StudioProject & { storyAudioUrl?: string };
    })).then(restored => setProjects(restored));
  }, []);
  useEffect(() => {
    if (hydrated) {
      try { persistProjects(projects); }
      catch { toast.error("Could not save project details in this browser. Check available storage."); }
    }
  }, [hydrated, projects]);
  return [projects, setProjects, hydrated] as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function AppFrame({ children, active }: { children: React.ReactNode; active: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="studio-shell flex bg-background text-foreground">
      <aside className={`studio-sidebar fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border transition-all duration-200 md:sticky md:top-0 md:h-screen ${collapsed ? "w-[4.5rem]" : "w-[16rem]"}`}>
        <div className="flex h-[4.75rem] items-center gap-3 border-b border-sidebar-border px-5">
          {!collapsed && <div><div className="font-display text-xl leading-none">Katha</div><div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] opacity-60">Studio</div></div>}
          <Button variant="ghost" size="icon" className="ml-auto hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex" aria-label="Collapse sidebar" title="Collapse sidebar" onClick={() => setCollapsed(!collapsed)}><ChevronDown className={`size-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-90"}`} /></Button>
        </div>
        <div className={`px-3 pt-7 ${collapsed ? "px-2" : ""}`}>
          {!collapsed && <div className="studio-eyebrow mb-3 px-3 text-sidebar-foreground/45">Workspace</div>}
          <nav className="grid gap-1" aria-label="Main navigation">
            {NAV.map(({ label, href, icon: Icon, page }) => (
              <Link key={page} to={href} title={collapsed ? label : undefined} className="studio-nav-link" data-active={active === page} aria-label={label}>
                <Icon size={17} strokeWidth={1.8} /><span className={collapsed ? "sr-only" : ""}>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          {!collapsed && <div className="mb-4 rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold"><span className="size-2 rounded-full bg-sidebar-primary" />Provider checks</div>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-sidebar-foreground/60">Test Gnani and Groq before using speech or screenplay tools.</p>
            <Link to="/settings" className="mt-2 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-sidebar-primary">Test connections <ChevronRight size={13} /></Link>
          </div>}
          <button className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent" aria-label="Account settings" onClick={() => { window.location.assign("/settings"); }}>
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-foreground/10 text-xs font-semibold">KG</div>
            {!collapsed && <div className="min-w-0"><div className="truncate text-xs font-semibold">Storyteller</div><div className="text-[0.66rem] text-sidebar-foreground/55">Local workspace</div></div>}
            {!collapsed && <MoreHorizontal size={16} className="ml-auto opacity-60" />}
          </button>
        </div>
      </aside>
      <main className={`studio-main min-h-screen flex-1 ${collapsed ? "md:ml-0" : "md:ml-0"} pl-[4.5rem] md:pl-0`}>
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between border-b border-border/70 bg-background/95 px-5 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-2 font-display text-xl"><AudioWaveform size={18} className="text-accent" />Katha Studio</div>
          <Link to="/settings" aria-label="Open settings" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"><Settings2 size={18} /></Link>
        </header>
        {children}
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="studio-eyebrow mb-2 text-accent">{eyebrow}</div><h1 className="studio-display text-4xl leading-tight sm:text-[2.6rem]">{title}</h1>{subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}</div>{action}</div>;
}

function Dashboard({ projects }: { projects: StudioProject[] }) {
  const navigate = useNavigate();
  const totalScenes = projects.reduce((total, project) => total + project.scenes.length, 0);
  const totalLines = projects.reduce((total, project) => total + project.scenes.reduce((count, scene) => count + scene.lines.length, 0), 0);
  const latest = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return <div className="studio-page">
    <PageHeading eyebrow="Your creative desk" title="Make room for a story." subtitle="Welcome back. What will you bring to life today?" action={<Button className="h-10" onClick={() => navigate({ to: "/create" })}><Plus />New production</Button>} />
    <div className="mb-9 grid grid-cols-2 gap-y-5 border-y border-border py-5 sm:grid-cols-4">
      {[["Productions", projects.length], ["Scenes", totalScenes], ["Dialogue lines", totalLines], ["Audio generated", "—"]].map(([label, value], index) => <div key={label} className={`studio-stat ${index > 1 ? "sm:block" : ""}`}><div className="studio-overline">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div></div>)}
    </div>
    {latest && <section className="mb-10">
      <div className="mb-3 flex items-center justify-between"><div className="studio-eyebrow text-muted-foreground">Pick up where you left off</div><span className="text-xs text-muted-foreground">Edited {formatDate(latest.updatedAt)}</span></div>
      <div className="grid overflow-hidden border border-border bg-card md:grid-cols-[1.15fr_1fr]">
        <div className="flex min-h-[15rem] flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-8"><div className="flex items-center gap-2 text-xs text-primary-foreground/60"><span className="size-2 rounded-full bg-accent" />{latest.status} · {LANGUAGES.find(([code]) => code === latest.language)?.[1] ?? latest.language}</div><div><div className="studio-display max-w-md text-3xl sm:text-4xl">{latest.title || "Untitled story"}</div><p className="mt-3 line-clamp-2 max-w-lg text-sm leading-relaxed text-primary-foreground/70">{latest.synopsis || latest.story || "Your story is ready for its next chapter."}</p></div><Button variant="secondary" className="mt-5 w-fit" onClick={() => navigate({ to: "/projects/$id/storyboard", params: { id: latest.id } })}>Continue editing <ChevronRight /></Button></div>
        <div className="flex flex-col justify-between border-t border-border p-6 md:border-l md:border-t-0 sm:p-8"><div><div className="studio-eyebrow text-muted-foreground">Production notes</div><div className="mt-5 grid grid-cols-2 gap-5"><div><div className="text-2xl font-semibold">{latest.scenes.length.toString().padStart(2, "0")}</div><div className="text-xs text-muted-foreground">Scenes</div></div><div><div className="text-2xl font-semibold">{new Set(latest.scenes.flatMap(scene => scene.lines.map(line => line.speaker)).filter(Boolean)).size.toString().padStart(2, "0")}</div><div className="text-xs text-muted-foreground">Characters</div></div></div></div><div className="mt-8 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span>Saved in this browser</span><BookOpenText size={16} /></div></div>
      </div>
    </section>}
    <section>
      <div className="mb-4 flex items-center justify-between"><div className="studio-eyebrow text-muted-foreground">Recent productions</div><Link className="text-xs font-semibold text-primary hover:text-accent" to="/projects">View all</Link></div>
      {projects.length === 0 ? <div className="flex min-h-[20rem] flex-col items-center justify-center border border-dashed border-border px-5 text-center">
        <div className="studio-empty-mark"><BookOpenText size={21} /></div><h2 className="studio-display mt-5 text-2xl">Every great production starts somewhere.</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Start with a story in your own words. Save it as a draft and build your scenes at your own pace.</p><Button className="mt-5" onClick={() => navigate({ to: "/create" })}><Plus />Create your first story</Button>
      </div> : <div className="divide-y divide-border border-y border-border">{projects.slice(0, 4).map(project => <ProjectRow key={project.id} project={project} onOpen={() => navigate({ to: "/projects/$id/storyboard", params: { id: project.id } })} />)}</div>}
    </section>
  </div>;
}

function ProjectRow({ project, onOpen, onDelete }: { project: StudioProject; onOpen: () => void; onDelete?: () => void }) {
  const lang = LANGUAGES.find(([code]) => code === project.language)?.[1] ?? project.language;
  return <div className="group flex items-center gap-4 py-4">
    <button onClick={onOpen} aria-label={`Open ${project.title}`} className="grid size-12 shrink-0 place-items-center border border-border bg-background text-accent transition-colors group-hover:bg-secondary"><Music2 size={18} /></button>
    <button onClick={onOpen} className="min-w-0 flex-1 text-left"><div className="truncate text-sm font-semibold">{project.title || "Untitled story"}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{lang}</span><span>{project.scenes.length} scenes</span><span>{formatDate(project.updatedAt)}</span></div></button>
    <span className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-accent" />{project.status}</span>
    {onDelete && <Button variant="ghost" size="icon" className="text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Delete production" aria-label={`Delete ${project.title}`} onClick={onDelete}><Trash2 size={16} /></Button>}
    <Button variant="ghost" size="icon" aria-label={`Continue editing ${project.title}`} onClick={onOpen}><ChevronRight size={17} /></Button>
  </div>;
}

function ProjectsPage({ projects, setProjects }: { projects: StudioProject[]; setProjects: React.Dispatch<React.SetStateAction<StudioProject[]>> }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [sort, setSort] = useState("recent");
  const navigate = useNavigate();
  const visible = [...projects.filter(project => project.title.toLowerCase().includes(query.toLowerCase()) && (language === "all" || project.language === language))].sort((a, b) => sort === "recent" ? b.updatedAt.localeCompare(a.updatedAt) : a.title.localeCompare(b.title));
  return <div className="studio-page"><PageHeading eyebrow="Your library" title="My productions" subtitle="Stories in progress, gathered in one place." action={<Button onClick={() => navigate({ to: "/create" })}><Plus />New production</Button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search productions" className="pl-9" /></div><select className="studio-input h-9 w-full px-3 text-sm sm:w-40" value={language} onChange={event => setLanguage(event.target.value)} aria-label="Filter by language"><option value="all">All languages</option>{LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><select className="studio-input h-9 w-full px-3 text-sm sm:w-40" value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort productions"><option value="recent">Recently edited</option><option value="title">Title A–Z</option></select></div>
    {visible.length ? <div className="divide-y divide-border border-y border-border">{visible.map(project => <ProjectRow key={project.id} project={project} onOpen={() => navigate({ to: "/projects/$id/storyboard", params: { id: project.id } })} onDelete={() => { if (window.confirm(`Delete “${project.title}”? This only removes the local draft.`)) setProjects(items => items.filter(item => item.id !== project.id)); }} />)}</div> : <div className="border border-dashed border-border py-16 text-center"><div className="studio-display text-2xl">{projects.length ? "No matching stories." : "Your library is waiting."}</div><p className="mt-2 text-sm text-muted-foreground">{projects.length ? "Try a different title or language." : "Create a story to begin your first production."}</p>{!projects.length && <Button className="mt-4" onClick={() => navigate({ to: "/create" })}><Plus />Create a story</Button>}</div>}
  </div>;
}

function CreatePage({ setProjects }: { setProjects: React.Dispatch<React.SetStateAction<StudioProject[]>> }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [language, setLanguage] = useState("te-IN");
  const [genre, setGenre] = useState("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const transcribeFn = useServerFn(transcribeKathaAudio);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearInterval(timer.current); mediaRecorder.current?.stream.getTracks().forEach(track => track.stop()); if (audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  const startTimer = () => { if (timer.current !== null) window.clearInterval(timer.current); timer.current = window.setInterval(() => setSeconds(value => value + 1), 1000); };
  const startRecording = async () => {
    setPermissionLoading(true); setMediaError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Audio recording is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder; chunks.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" }); const file = new File([blob], `katha-recording.${blob.type.includes("mp4") ? "m4a" : "webm"}`, { type: blob.type }); setAudioFile(file); setAudioUrl(URL.createObjectURL(blob)); stream.getTracks().forEach(track => track.stop()); };
      recorder.start(500); setRecording(true); setPaused(false); setSeconds(0); startTimer();
    } catch (error) { setMediaError(error instanceof Error ? error.message : "Microphone access could not be started."); }
    finally { setPermissionLoading(false); }
  };
  const stopRecording = () => { const recorder = mediaRecorder.current; if (recorder && recorder.state !== "inactive") recorder.stop(); setRecording(false); setPaused(false); if (timer.current !== null) window.clearInterval(timer.current); };
  const pickFile = (file: File | undefined) => { if (!file) return; if (!file.type.startsWith("audio/")) { setMediaError("Choose an audio file to continue."); return; } setAudioFile(file); setAudioUrl(URL.createObjectURL(file)); setMediaError(""); };
  const saveDraft = async () => {
    if (saving) return;
    if (mode === "text" && story.trim().length < 12) { toast.error("Add a little more of your story before saving."); return; }
    if (mode === "voice" && !audioFile && story.trim().length < 12) { toast.error("Record, upload audio, or add a written story first."); return; }
    setSaving(true);
    let storyAudioAssetId: string | undefined;
    try {
      if (audioFile) storyAudioAssetId = await saveAudioAsset(audioFile, audioFile.name);
      const createdAt = new Date().toISOString();
      const project: StudioProject = { id: crypto.randomUUID(), title: title.trim() || "Untitled story", language, story: story.trim(), synopsis: "", updatedAt: createdAt, status: "Draft", scenes: [], ...(storyAudioAssetId ? { storyAudioAssetId } : {}), ...(audioUrl ? { storyAudioUrl: audioUrl } : {}) };
      persistProjects([project, ...readProjects()]);
      setProjects(existing => [project, ...existing]);
      toast.success("Draft saved in this browser.");
      void navigate({ to: "/projects/$id/storyboard", params: { id: project.id } });
    } catch {
      if (storyAudioAssetId) await deleteAudioAsset(storyAudioAssetId).catch(() => undefined);
      toast.error("The draft could not be saved in this browser. Check available storage and try again.");
    } finally {
      setSaving(false);
    }
  };
  const transcribeRecording = async () => {
    if (!audioFile) return;
    setTranscribing(true); setMediaError("");
    try {
      const wav = await normalizeAudioFile(audioFile);
      const result = await transcribeFn({ data: { base64: await blobToBase64(wav), mimeType: "audio/wav", language } });
      if (!result.ok) { setMediaError(result.message); return; }
      setStory(result.transcript);
      toast.success("Prisma v2.5 returned the transcript.");
    } catch (error) { setMediaError(error instanceof Error ? error.message : "Transcription could not be completed."); }
    finally { setTranscribing(false); }
  };
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return <div className="studio-page max-w-5xl"><PageHeading eyebrow="Begin a production" title="Every story has a voice." subtitle="Start with words, a recording, or a little of both." />
    <div className="mb-6 flex gap-6 border-b border-border"><button className="studio-tab inline-flex items-center gap-2" data-active={mode === "text"} onClick={() => setMode("text")}><FileText size={16} />Write a story</button><button className="studio-tab inline-flex items-center gap-2" data-active={mode === "voice"} onClick={() => setMode("voice")}><Mic size={16} />Tell it aloud</button></div>
    <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-5">
        <label className="block"><span className="studio-overline mb-2 block">Story title</span><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="A name for this story" maxLength={120} /></label>
        <label className="block"><span className="studio-overline mb-2 block">Your story</span><Textarea value={story} onChange={event => setStory(event.target.value)} placeholder={mode === "voice" ? "Add a few notes, or record your story on the right…" : "Write your story just as you imagine it. Dialogue, descriptions, and fragments are all welcome…"} className="min-h-[19rem] resize-y bg-card p-4 text-base leading-7" maxLength={30000} /></label>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Keep your natural voice and language.</span><span>{story.length.toLocaleString()} / 30,000</span></div>
      </div>
      <aside className="space-y-4">
        <div className="studio-panel p-4">
          <div className="mb-4 flex items-center justify-between"><span className="studio-eyebrow text-muted-foreground">Production details</span><ListMusic size={16} className="text-accent" /></div>
          <label className="mb-4 block"><span className="studio-overline mb-2 block">Language</span><select value={language} onChange={event => setLanguage(event.target.value)} className="studio-input h-10 px-3 text-sm">{LANGUAGES.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
          <label className="block"><span className="studio-overline mb-2 block">Genre or character notes <span className="font-normal">· optional</span></span><Input value={genre} onChange={event => setGenre(event.target.value)} placeholder="Folktale, family, mystery…" maxLength={300} /></label>
        </div>
        {mode === "voice" && <div className="studio-panel p-4">
          <div className="mb-4 flex items-center justify-between"><span className="studio-eyebrow text-muted-foreground">Narration recording</span><span className={`flex items-center gap-1.5 text-xs ${recording ? "text-accent" : "text-muted-foreground"}`}><span className={`size-2 rounded-full ${recording ? "animate-pulse bg-accent" : "bg-border"}`} />{recording ? "Recording" : "Ready"}</span></div>
          <div className="flex items-center justify-center py-2"><button disabled={permissionLoading || (recording && !paused)} onClick={() => recording ? (mediaRecorder.current?.resume(), setPaused(false), startTimer()) : startRecording()} className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-70" aria-label={recording ? "Resume recording" : "Start recording"}>{permissionLoading ? <LoaderCircle className="animate-spin" /> : recording && !paused ? <Mic size={25} /> : <Mic size={25} />}</button></div>
          <div className="my-3 text-center font-mono text-2xl tabular-nums">{minutes}:{remaining}</div><div className="flex h-14 items-center justify-center border-y border-border text-xs text-muted-foreground">{recording ? "Recording audio…" : "Audio preview appears after recording"}</div>
          {recording && <div className="mt-4 flex gap-2"><Button className="flex-1" variant="secondary" onClick={() => { mediaRecorder.current?.pause(); setPaused(true); if (timer.current !== null) window.clearInterval(timer.current); }}><Pause />Pause</Button><Button className="flex-1" onClick={stopRecording}><Square />Stop</Button></div>}
          {!recording && <Button variant="outline" className="mt-4 w-full" onClick={() => fileInput.current?.click()}><Upload />{audioFile ? "Replace audio" : "Upload audio"}</Button>}
          {audioFile && <Button variant="secondary" className="mt-2 w-full" disabled={transcribing} onClick={() => void transcribeRecording()}>{transcribing ? <LoaderCircle className="animate-spin" /> : <AudioLines />}{transcribing ? "Transcribing…" : "Transcribe with Prisma v2.5"}</Button>}
          <input ref={fileInput} className="sr-only" type="file" accept="audio/*" onChange={event => pickFile(event.target.files?.[0])} />
          {audioUrl && <div className="mt-4 border-t border-border pt-4"><audio className="w-full" controls src={audioUrl}>Audio playback is unavailable in this browser.</audio><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span className="truncate pr-2">{audioFile?.name || "Recording"}</span><button className="inline-flex items-center gap-1 text-primary hover:text-accent" onClick={() => { setAudioUrl(""); setAudioFile(null); setSeconds(0); }}>Re-record <X size={13} /></button></div></div>}
          {mediaError && <p role="alert" className="mt-3 text-xs text-destructive">{mediaError}</p>}
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">Audio stays in this browser. Prisma v2.5 accepts clips up to 30 seconds; transcription sends the selected clip to Gnani.</p>
        </div>}
        <Button className="h-11 w-full" disabled={saving} onClick={() => void saveDraft()}>{saving ? <LoaderCircle className="animate-spin" /> : <Check />}{saving ? "Saving…" : "Save draft and continue"}</Button>
      </aside>
    </div>
    {genre.trim() && <div className="sr-only">{genre}</div>}
  </div>;
}

function StoryboardPage({ projectId, projects, setProjects }: { projectId: string; projects: StudioProject[]; setProjects: React.Dispatch<React.SetStateAction<StudioProject[]>> }) {
  const navigate = useNavigate();
  const project = projects.find(item => item.id === projectId);
  const [selectedScene, setSelectedScene] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [newLineText, setNewLineText] = useState("");
  const [speaker, setSpeaker] = useState("Narrator");
  const [newSpeaker, setNewSpeaker] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptionError, setTranscriptionError] = useState("");
  const [busy, setBusy] = useState(false);
  const screenplayFn = useServerFn(generateKathaScreenplay);
  const transcribeFn = useServerFn(transcribeKathaAudio);
  const fileInput = useRef<HTMLInputElement>(null);
  const scene = project?.scenes.find(item => item.id === selectedScene) ?? project?.scenes[0];
  useEffect(() => { if (project?.scenes.length && !selectedScene) setSelectedScene(project.scenes[0]?.id ?? ""); }, [project?.scenes, selectedScene]);
  if (!project) return <div className="studio-page"><Link to="/projects" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />Productions</Link><div className="py-20 text-center"><div className="studio-display text-3xl">This story isn't in this browser.</div><p className="mt-2 text-sm text-muted-foreground">Local drafts stay on the device where they were created.</p><Button className="mt-5" onClick={() => navigate({ to: "/create" })}>Create a story</Button></div></div>;
  const updateProject = (updater: (current: StudioProject) => StudioProject) => setProjects(items => items.map(item => item.id === project.id ? updater({ ...item, updatedAt: new Date().toISOString() }) : item));
  const addScene = () => {
    const next: StudioScene = { id: crypto.randomUUID(), title: `Scene ${project.scenes.length + 1}`, lines: [] };
    updateProject(current => ({ ...current, scenes: [...current.scenes, next], status: "In production" })); setSelectedScene(next.id); toast.success("Scene added.");
  };
  const addLine = () => {
    const speakerName = speaker === "New character" ? newSpeaker.trim() : speaker;
    if (!scene || newLineText.trim().length === 0 || !speakerName) return;
    const line: StudioLine = { id: crypto.randomUUID(), speaker: speakerName, text: newLineText.trim() };
    updateProject(current => ({ ...current, scenes: current.scenes.map(item => item.id === scene.id ? { ...item, lines: [...item.lines, line] } : item) })); setNewLineText(""); setNewSpeaker(""); setSpeaker(speakerName);
  };
  const updateLine = (lineId: string, text: string) => updateProject(current => ({ ...current, scenes: current.scenes.map(item => item.id === scene?.id ? { ...item, lines: item.lines.map(line => line.id === lineId ? { ...line, text } : line) } : item) }));
  const removeLine = (lineId: string) => updateProject(current => ({ ...current, scenes: current.scenes.map(item => item.id === scene?.id ? { ...item, lines: item.lines.filter(line => line.id !== lineId) } : item) }));
  const runTranscription = async () => {
    if (!project.storyAudioAssetId) { setTranscriptionError("No audio recording is saved for this story."); return; }
    setBusy(true); setTranscriptionError("");
    try {
      const stored = await getAudioAsset(project.storyAudioAssetId);
      if (!stored) { setTranscriptionError("The saved recording could not be found in this browser."); return; }
      const wav = await normalizeAudioFile(new File([stored.blob], stored.name, { type: stored.type }));
      const result = await transcribeFn({ data: { base64: await blobToBase64(wav), mimeType: "audio/wav", language: project.language as "te-IN" | "hi-IN" | "en-IN" | "ta-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "pa-IN" | "gu-IN" | "hi-en" } });
      if (!result.ok) { setTranscriptionError(result.message); return; }
      setTranscript(result.transcript);
      updateProject(current => ({ ...current, story: result.transcript }));
      toast.success("Prisma v2.5 returned the transcript. Review it before adding scenes.");
    } catch (error) { setTranscriptionError(error instanceof Error ? error.message : "Transcription could not be completed."); }
    finally { setBusy(false); }
  };
  const generateScreenplay = async () => {
    const sourceStory = transcript.trim() || project.story.trim();
    if (sourceStory.length < 12) { setTranscriptionError("Add a story or transcript with at least a few sentences first."); return; }
    if (project.scenes.length && !window.confirm("Replace the existing screenplay with a new Groq extraction?")) return;
    setBusy(true); setTranscriptionError("");
    try {
      const result = await screenplayFn({ data: { story: sourceStory, language: project.language as "te-IN" | "hi-IN" | "en-IN" | "ta-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "pa-IN" | "gu-IN" | "hi-en" } });
      if (!result.ok) { setTranscriptionError(result.message); return; }
      const speakerNames = new Map(result.screenplay.characters.map(character => [character.id, character.name]));
      const scenes: StudioScene[] = result.screenplay.scenes.sort((a, b) => a.order - b.order).map(item => ({
        id: item.id, title: item.title, lines: item.lines.sort((a, b) => a.order - b.order).map(line => ({ id: line.id, speaker: speakerNames.get(line.speakerId) ?? line.speakerId, text: line.text })),
      }));
      updateProject(current => ({ ...current, title: result.screenplay.title || current.title, synopsis: result.screenplay.synopsis, story: sourceStory, scenes, status: "In production" }));
      setSelectedScene(scenes[0]?.id ?? ""); setTranscript("");
      toast.success("Screenplay generated and saved. Review the scenes and dialogue.");
    } catch { setTranscriptionError("Screenplay generation could not be completed. Your existing story and scenes remain unchanged."); }
    finally { setBusy(false); }
  };
  const splitTranscript = () => {
    const sourceText = transcript.trim() || project.story.trim();
    const parts = sourceText.split(/(?<=[.!?。！？])\s+/).map(text => text.trim()).filter(Boolean);
    if (!parts.length) { setTranscriptionError("Add or transcribe some story text first."); return; }
    const nextScene: StudioScene = { id: crypto.randomUUID(), title: "Transcribed story", lines: parts.map(text => ({ id: crypto.randomUUID(), speaker: "Narrator", text })) };
    updateProject(current => ({ ...current, story: sourceText, scenes: [...current.scenes, nextScene], status: "In production" })); setSelectedScene(nextScene.id); setTranscript(""); setTranscriptionError(""); toast.success("Story text placed into a new scene.");
  };
  const exportScreenplay = () => {
    const content = [`# ${project.title}`, `Language: ${LANGUAGES.find(([code]) => code === project.language)?.[1] ?? project.language}`, "", project.synopsis, "", ...project.scenes.flatMap((item, sceneIndex) => [`## ${sceneIndex + 1}. ${item.title}`, ...item.lines.flatMap(line => ["", `**${line.speaker}:** ${line.text}`]), ""])].join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "screenplay"}.md`; anchor.click(); URL.revokeObjectURL(url); toast.success("Screenplay downloaded.");
  };
  const renameProject = (title: string) => updateProject(current => ({ ...current, title: title || "Untitled story" }));
  const uploadAudio = (file: File | undefined) => { if (!file) return; if (!file.type.startsWith("audio/")) { setTranscriptionError("Choose an audio file to continue."); return; } setTranscriptionError(""); void saveAudioAsset(file, file.name).then(id => { const storyAudioUrl = URL.createObjectURL(file); updateProject(current => ({ ...current, storyAudioAssetId: id, storyAudioUrl })); }).catch(() => setTranscriptionError("Could not save the uploaded audio in this browser.")); };
  return <div className="studio-page max-w-7xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Productions</Link><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-accent" />Saved locally <span className="mx-1">·</span><Button variant="outline" size="sm" onClick={exportScreenplay}><ArrowDownToLine />Export screenplay</Button><Button size="sm" onClick={() => navigate({ to: "/projects/$id/casting", params: { id: project.id } })}>Continue to casting <ChevronRight /></Button></div></div>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div className="min-w-0 flex-1">{editingTitle ? <Input autoFocus value={project.title} onChange={event => renameProject(event.target.value)} onBlur={() => setEditingTitle(false)} onKeyDown={event => { if (event.key === "Enter") setEditingTitle(false); }} className="max-w-2xl font-display text-3xl" aria-label="Production title" /> : <button className="studio-display max-w-full truncate text-left text-4xl" onClick={() => setEditingTitle(true)} title="Rename production">{project.title}<span className="ml-2 text-xs font-sans text-muted-foreground">Edit title</span></button>}<p className="mt-2 text-sm text-muted-foreground">Screenplay · {LANGUAGES.find(([code]) => code === project.language)?.[1] ?? project.language} · {project.status}</p></div><Button variant="outline" onClick={addScene}><Plus />Add scene</Button></div>
    <div className="mb-8 grid gap-6 border border-border bg-card p-5 md:grid-cols-[1fr_1.1fr] sm:p-7"><div><div className="studio-eyebrow text-accent">Story to screenplay</div><h2 className="studio-display mt-2 text-2xl">Let the story take shape.</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Generate scenes and speakers with Groq, or add the text as editable narration.</p><Textarea value={transcript} onChange={event => setTranscript(event.target.value)} className="mt-4 min-h-36 resize-y" placeholder="Paste a story or review a transcript here…" /><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void generateScreenplay()} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <WandSparkles />}{busy ? "Working…" : "Generate screenplay"}</Button><Button variant="secondary" onClick={splitTranscript}><Plus />Add as narration</Button><Button variant="outline" disabled={busy || !project.storyAudioAssetId} onClick={() => void runTranscription()}>{busy ? <LoaderCircle className="animate-spin" /> : <Mic />}{busy ? "Transcribing" : "Transcribe recording"}</Button><Button variant="ghost" onClick={() => fileInput.current?.click()}><Upload />Upload audio</Button></div><input ref={fileInput} type="file" accept="audio/*" className="sr-only" onChange={event => uploadAudio(event.target.files?.[0])} />{transcriptionError && <p role="alert" className="mt-3 text-xs text-destructive">{transcriptionError}</p>}</div><div className="flex flex-col justify-center border-t border-border pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0"><div className="studio-eyebrow text-muted-foreground">Story notes</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{project.story || "Your original story will stay here while you build out the screenplay."}</p>{project.storyAudioUrl && <div className="mt-5"><div className="studio-eyebrow mb-2 text-muted-foreground">Story recording</div><audio controls src={project.storyAudioUrl} className="w-full">Audio playback is unavailable.</audio></div>}</div></div>
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_17rem]">
      <aside className="studio-panel h-fit p-3"><div className="mb-3 flex items-center justify-between px-2"><span className="studio-eyebrow text-muted-foreground">Scenes · {project.scenes.length}</span><button title="Add scene" aria-label="Add scene" className="grid size-7 place-items-center rounded hover:bg-muted" onClick={addScene}><Plus size={15} /></button></div>{project.scenes.length ? <div className="grid gap-1">{project.scenes.map((item, index) => <button key={item.id} data-active={scene?.id === item.id} onClick={() => setSelectedScene(item.id)} className="flex items-center gap-2 rounded px-2 py-2.5 text-left text-xs transition-colors hover:bg-muted data-[active=true]:bg-secondary data-[active=true]:font-semibold"><span className="font-mono text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 truncate">{item.title}</span><ChevronRight size={13} /></button>)}</div> : <div className="px-2 pb-2 text-xs leading-relaxed text-muted-foreground">Scenes you add will appear here.</div>}<div className="mt-5 border-t border-border pt-4"><div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold"><UsersRound size={14} />Characters</div><div className="px-2 text-xs text-muted-foreground">{new Set(project.scenes.flatMap(item => item.lines.map(line => line.speaker))).size ? [...new Set(project.scenes.flatMap(item => item.lines.map(line => line.speaker)))].join(", ") : "Add dialogue to identify characters."}</div></div></aside>
      <section className="min-w-0">
        {scene ? <><div className="mb-4 flex items-center justify-between gap-3"><div><div className="studio-eyebrow text-muted-foreground">Scene {String(project.scenes.indexOf(scene) + 1).padStart(2, "0")}</div><Input value={scene.title} aria-label="Scene title" onChange={event => updateProject(current => ({ ...current, scenes: current.scenes.map(item => item.id === scene.id ? { ...item, title: event.target.value } : item) }))} className="mt-1 border-0 bg-transparent px-0 font-display text-2xl shadow-none focus-visible:ring-0" /></div><Button variant="ghost" size="icon" title="Delete scene" aria-label="Delete scene" onClick={() => { if (window.confirm(`Delete “${scene.title}”?`)) { updateProject(current => ({ ...current, scenes: current.scenes.filter(item => item.id !== scene.id) })); setSelectedScene(""); } }}><Trash2 size={16} /></Button></div>
          <div className="studio-panel min-h-64 p-4 sm:p-6">{scene.lines.length ? <div className="divide-y divide-border">{scene.lines.map((line, index) => <div key={line.id} className="group flex gap-3 py-4 first:pt-0"><div className="mt-2 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{line.speaker.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold">{line.speaker}</span><span className="text-[0.65rem] text-muted-foreground">Line {index + 1}</span></div><Textarea value={line.text} onChange={event => updateLine(line.id, event.target.value)} className="min-h-16 resize-y border-0 bg-transparent p-0 text-sm leading-7 shadow-none focus-visible:ring-0" aria-label={`Edit ${line.speaker} dialogue`} />{line.audioUrl && <audio controls src={line.audioUrl} className="mt-2 w-full">Audio playback is unavailable.</audio>}</div><Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100" title="Remove line" aria-label="Remove dialogue line" onClick={() => removeLine(line.id)}><Trash2 size={15} /></Button></div>)}</div> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><div className="studio-empty-mark"><FileText size={19} /></div><div className="studio-display mt-4 text-xl">A scene is an open page.</div><p className="mt-1 max-w-xs text-xs text-muted-foreground">Add a line of narration or dialogue to begin.</p></div>}
            <div className="mt-5 border-t border-border pt-4"><div className="mb-2 flex flex-wrap items-center gap-2"><select value={speaker} onChange={event => { setSpeaker(event.target.value); setNewSpeaker(""); }} aria-label="Choose speaker" className="studio-input h-8 w-36 px-2 text-xs"><option>Narrator</option>{[...new Set(project.scenes.flatMap(item => item.lines.map(line => line.speaker)))].filter(name => name !== "Narrator").map(name => <option key={name}>{name}</option>)}<option value="New character">New character…</option></select>{speaker === "New character" && <Input className="h-8 w-36 text-xs" placeholder="Character name" aria-label="New character name" value={newSpeaker} onChange={event => setNewSpeaker(event.target.value)} />}</div><div className="flex items-end gap-2"><Textarea value={newLineText} onChange={event => setNewLineText(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) addLine(); }} placeholder="Write a line for this scene…" className="min-h-14 resize-y" /><Button className="shrink-0" disabled={!newLineText.trim() || (speaker === "New character" && !newSpeaker.trim())} onClick={addLine}><Plus />Add line</Button></div></div>
          </div></> : <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-border text-center"><div className="studio-display text-2xl">A new scene begins.</div><Button className="mt-4" onClick={addScene}><Plus />Add first scene</Button></div>}
      </section>
      <aside className="studio-panel h-fit p-4"><div className="studio-eyebrow text-muted-foreground">Cast and voices</div><h3 className="studio-display mt-2 text-xl">Meet the cast.</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your characters appear here as you add dialogue. Assign voice performances in the Casting Room.</p><div className="my-4 border-t border-border" /><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary"><Mic size={15} /></div><div><div className="text-xs font-semibold">Narrator</div><div className="mt-1 text-[0.68rem] text-muted-foreground">Voice not assigned</div></div></div><Button variant="outline" className="mt-4 w-full" onClick={() => navigate({ to: "/projects/$id/casting", params: { id: project.id } })}>Open casting room <ChevronRight /></Button><div className="mt-5 border-t border-border pt-4"><div className="flex items-center gap-2 text-xs font-semibold"><WandSparkles size={14} className="text-accent" />Screenplay intelligence</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Automatic scene and character extraction becomes available when Groq is connected in Settings.</p><Button variant="ghost" className="mt-2 h-auto p-0 text-xs" onClick={() => navigate({ to: "/settings" })}>Review integrations <ChevronRight /></Button></div></aside>
    </div>
  </div>;
}

function CastingPage({ projectId, projects, setProjects }: { projectId: string; projects: StudioProject[]; setProjects: React.Dispatch<React.SetStateAction<StudioProject[]>> }) {
  const project = projects.find(item => item.id === projectId);
  const characters = project ? [...new Set(project.scenes.flatMap(scene => scene.lines.map(line => line.speaker)))].filter(Boolean) : [];
  const [playing, setPlaying] = useState("");
  const [busy, setBusy] = useState("");
  const [previewLine, setPreviewLine] = useState("Hello, this is a voice preview for your story.");
  const generateSpeech = useServerFn(generateKathaSpeech);
  const audioRef = useRef<HTMLAudioElement>(null);
  const assignments = project?.voiceAssignments ?? {};
  const setVoice = (character: string, voice: string) => {
    setProjects(items => items.map(item => item.id === projectId ? { ...item, updatedAt: new Date().toISOString(), voiceAssignments: { ...(item.voiceAssignments ?? {}), [character]: voice } } : item));
    toast.success(`${voice} assigned to ${character}.`);
  };
  const lockVoice = (character: string) => setProjects(items => items.map(item => item.id === projectId ? { ...item, lockedVoices: item.lockedVoices?.includes(character) ? item.lockedVoices.filter(name => name !== character) : [...(item.lockedVoices ?? []), character] } : item));
  const audition = async (voice: string, text = previewLine, language = project?.language ?? "te-IN") => {
    const supportedLanguage = language as "te-IN" | "hi-IN" | "en-IN" | "ta-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "pa-IN" | "gu-IN" | "hi-en";
    setBusy(voice);
    try {
      const result = await generateSpeech({ data: { text, voice, language: supportedLanguage, speed: 1 } });
      if (!result.ok) { toast.error(result.message); return; }
      const blob = base64ToAudioBlob(result.audioBase64, result.mimeType);
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
      const url = URL.createObjectURL(blob);
      const savedId = await saveAudioAsset(blob, `${voice}-preview.wav`);
      const audio = new Audio(url);
      audio.onended = () => { setPlaying(""); URL.revokeObjectURL(url); void deleteAudioAsset(savedId); };
      audioRef.current = audio; setPlaying(voice ?? "");
      await audio.play();
    } catch { toast.error("Voice audio could not be played."); setPlaying(""); }
    finally { setBusy(""); }
  };
  const generateDialogue = async () => {
    if (!project) return;
    const pending = project.scenes.flatMap(scene => scene.lines.filter(line => !line.audioAssetId).map(line => ({ sceneId: scene.id, lineId: line.id, line, voice: line.voice ?? assignments[line.speaker] })));
    if (!pending.length) { toast.info("All dialogue lines already have saved audio."); return; }
    if (pending.some(item => !item.voice)) { toast.error("Assign a catalogue voice to every character before generating dialogue."); return; }
    for (const item of pending) {
      const voice = item.voice;
      if (!voice) continue;
      setBusy(item.lineId);
      try {
        const result = await generateSpeech({ data: { text: item.line.text, voice, language: project.language as "te-IN" | "hi-IN" | "en-IN" | "ta-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "pa-IN" | "gu-IN" | "hi-en", speed: item.line.speed ?? 1 } });
        if (!result.ok) { toast.error(`${item.line.speaker}: ${result.message}`); break; }
        const blob = base64ToAudioBlob(result.audioBase64, result.mimeType);
        const audioAssetId = await saveAudioAsset(blob, `${item.lineId}.wav`);
        setProjects(items => items.map(current => current.id === projectId ? { ...current, updatedAt: new Date().toISOString(), scenes: current.scenes.map(scene => scene.id === item.sceneId ? { ...scene, lines: scene.lines.map(line => line.id === item.lineId ? { ...line, voice, audioAssetId, audioUrl: URL.createObjectURL(blob) } : line) } : scene) } : current));
      } catch { toast.error(`${item.line.speaker}: audio could not be saved in this browser.`); break; }
    }
    setBusy("");
  };
  return <div className="studio-page max-w-6xl"><PageHeading eyebrow="Casting room" title="Find the voice." subtitle={`${project?.title ?? "Production"} · Choose a performance for every character.`} action={<Link to="/settings" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><Settings2 size={15} />Gnani setup</Link>} />
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><div className="studio-eyebrow text-muted-foreground">Preview line</div><Textarea value={previewLine} onChange={event => setPreviewLine(event.target.value)} className="mt-2 min-h-16 max-w-2xl" placeholder="Type a line to preview…" /></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Headphones size={15} />Voice audition requires Gnani connection</div></div>
    <audio ref={audioRef} className="sr-only" />
    <div className="mb-7 flex flex-wrap gap-2"><span className="rounded border border-border bg-card px-3 py-2 text-xs">{LANGUAGES.find(([code]) => code === project?.language)?.[1] ?? "Telugu"}</span><span className="rounded border border-border bg-card px-3 py-2 text-xs text-muted-foreground">Timbre v2.5 · 42 documented voices</span></div>
    {characters.length ? <div className="grid gap-4 md:grid-cols-2">{characters.map((character, index) => { const preferred = TIMBRE_V25_VOICES.filter(voice => voice.language === project?.language); const options = preferred.length ? preferred : TIMBRE_V25_VOICES; const assigned = assignments[character]; const assignedVoice = TIMBRE_V25_VOICES.find(voice => voice.name === assigned); const assignedLines = project?.scenes.flatMap(scene => scene.lines).filter(line => line.speaker === character).length ?? 0; return <article key={character} className="studio-panel p-5"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{character.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{character}</div><div className="mt-1 text-xs text-muted-foreground">{character.toLowerCase() === "narrator" ? "Narrator" : `Character ${String(index).padStart(2, "0")}`} · {assignedLines} dialogue lines</div></div><Button variant="ghost" size="icon" title={project?.lockedVoices?.includes(character) ? "Unlock voice assignment" : "Lock voice assignment"} aria-label={project?.lockedVoices?.includes(character) ? `Unlock ${character} voice` : `Lock ${character} voice`} onClick={() => lockVoice(character)}><ShieldCheck size={16} /></Button></div><label className="mt-5 block"><span className="studio-overline mb-2 block">Voice assignment</span><select disabled={project?.lockedVoices?.includes(character)} value={assigned ?? ""} onChange={event => setVoice(character, event.target.value)} className="studio-input h-10 px-3 text-sm"><option value="">Choose a voice</option>{assigned && !options.some(voice => voice.name === assigned) && assignedVoice && <option value={assigned}>{assigned} · {assignedVoice.languageName}</option>}{options.map(voice => <option key={voice.name} value={voice.name}>{voice.name} · {voice.persona}</option>)}</select></label><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-2 rounded-full ${assigned ? "bg-accent" : "bg-border"}`} />{assigned ? `${assigned} · ${assignedVoice?.languageName ?? "assigned"}` : "No voice assigned"}</span><Button variant="ghost" size="sm" disabled={!assigned || !!busy} onClick={() => void audition(assigned ?? "", undefined, assignedVoice?.language ?? project?.language)}>{busy === assigned ? <LoaderCircle className="animate-spin" /> : playing === assigned ? <Pause size={14} /> : <Play size={14} />}Preview</Button></div></article>; })}</div> : <div className="border border-dashed border-border py-16 text-center"><div className="studio-empty-mark mx-auto"><UsersRound size={19} /></div><div className="studio-display mt-4 text-2xl">A cast emerges from dialogue.</div><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Add dialogue lines to the screenplay first. Characters are listed from your scenes.</p><Link to="/projects/$id/storyboard" params={{ id: projectId }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Return to screenplay <ChevronRight size={16} /></Link></div>}
    <div className="mt-8 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-xs leading-relaxed text-muted-foreground">Voice choices come from Gnani's documented Timbre v2.5 catalogue. Samples use your selected preview line and may require account access.</p><Button variant="outline" disabled={!!busy} onClick={() => void generateDialogue()}><AudioLines />{busy ? "Generating sequentially…" : "Generate missing dialogue audio"}</Button></div>
  </div>;
}

function StudioPage({ projectId, projects, setProjects }: { projectId?: string; projects: StudioProject[]; setProjects: React.Dispatch<React.SetStateAction<StudioProject[]>> }) {
  const navigate = useNavigate();
  const project = projects.find(item => item.id === projectId) ?? projects[0];
  const lines = project?.scenes.flatMap(scene => scene.lines) ?? [];
  const [selectedLine, setSelectedLine] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [exporting, setExporting] = useState(false);
  const speechFn = useServerFn(generateKathaSpeech);
  const line = lines[selectedLine];
  const [duration, setDuration] = useState(0);
  if (!project) return <div className="studio-page"><PageHeading eyebrow="Audio studio" title="Shape the sound." subtitle="Arrange, audition and refine every performance." /><div className="flex min-h-[19rem] flex-col items-center justify-center border border-dashed border-border text-center"><div className="studio-empty-mark"><AudioWaveform size={21} /></div><div className="studio-display mt-5 text-2xl">Your timeline is ready when you are.</div><p className="mt-2 max-w-sm text-sm text-muted-foreground">Create a story, add scenes and assign a voice to begin your production.</p><Button className="mt-5" onClick={() => navigate({ to: "/create" })}><Plus />Create a story</Button></div></div>;
  const currentSrc = line?.audioUrl || project.audioUrl;
  const updateLine = (changes: Omit<Partial<StudioLine>, "audioAssetId" | "audioUrl"> & { audioAssetId?: string | null; audioUrl?: string | null }) => {
    if (!line) return;
    setProjects(items => items.map(item => item.id === project.id ? { ...item, updatedAt: new Date().toISOString(), scenes: item.scenes.map(scene => ({ ...scene, lines: scene.lines.map(current => {
      if (current.id !== line.id) return current;
      const { audioAssetId: nextAssetId, audioUrl: nextUrl, ...editable } = changes;
      const next: StudioLine = { ...current, ...editable };
      if (nextAssetId === null) delete next.audioAssetId;
      else if (typeof nextAssetId === "string") next.audioAssetId = nextAssetId;
      if (nextUrl === null) delete next.audioUrl;
      else if (typeof nextUrl === "string") next.audioUrl = nextUrl;
      return next;
    }) })) } : item));
  };
  const generateLine = async () => {
    if (!line) return;
    const voice = line.voice ?? project.voiceAssignments?.[line.speaker];
    if (!voice) { toast.error("Assign a catalogue voice in Casting before generating this line."); return; }
    setPlaying(false);
    try {
      const result = await speechFn({ data: { text: line.text, voice, language: project.language as "te-IN" | "hi-IN" | "en-IN" | "ta-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "pa-IN" | "gu-IN" | "hi-en", speed: line.speed ?? 1 } });
      if (!result.ok) { toast.error(result.message); return; }
      const blob = base64ToAudioBlob(result.audioBase64, result.mimeType);
      const audioAssetId = await saveAudioAsset(blob, `${line.id}.wav`);
      updateLine({ voice, audioAssetId, audioUrl: URL.createObjectURL(blob) });
      toast.success("The line's real audio was saved locally.");
    } catch { toast.error("The generated audio could not be saved in this browser."); }
  };
  const exportProduction = async () => {
    if (!project.scenes.length || !lines.length) { toast.error("Add screenplay lines before exporting audio."); return; }
    setExporting(true);
    try {
      const context = new AudioContext();
      try {
        const decoded: AudioBuffer[] = [];
        for (const item of lines) {
          if (!item.audioAssetId) throw new Error(`Missing audio for ${item.speaker}: ${item.text.slice(0, 45)}`);
          const asset = await getAudioAsset(item.audioAssetId);
          if (!asset) throw new Error(`Saved audio for ${item.speaker} is missing from this browser.`);
          decoded.push(await context.decodeAudioData(await asset.blob.arrayBuffer()));
        }
        const sampleRate = 48_000;
        const gapSamples = Math.floor(sampleRate * 0.3);
        const totalSamples = decoded.reduce((total, clip) => total + Math.ceil(clip.duration * sampleRate), 0) + Math.max(0, decoded.length - 1) * gapSamples;
        const mixed = new Float32Array(totalSamples);
        let writeAt = 0;
        for (const clip of decoded) {
          const samples = clip.getChannelData(0);
          const outputLength = Math.ceil(samples.length * sampleRate / clip.sampleRate);
          for (let index = 0; index < outputLength; index += 1) {
            const sourceIndex = index * clip.sampleRate / sampleRate;
            const lower = Math.floor(sourceIndex);
            const upper = Math.min(samples.length - 1, lower + 1);
            const mix = sourceIndex - lower;
            mixed[writeAt + index] = (samples[lower] ?? 0) * (1 - mix) + (samples[upper] ?? 0) * mix;
          }
          writeAt += outputLength + gapSamples;
        }
        const file = encodePcmWav(mixed, sampleRate);
        const assetId = await saveAudioAsset(file, `${project.id}-production.wav`);
        const url = URL.createObjectURL(file);
        setProjects(items => items.map(item => item.id === project.id ? { ...item, audioAssetId: assetId, audioUrl: url, updatedAt: new Date().toISOString() } : item));
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${project.title || "katha-production"}.wav`; anchor.click();
        toast.success("Production exported as a real WAV audio file.");
      } finally { await context.close(); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Audio export could not be completed."); }
    finally { setExporting(false); }
  };
  const togglePlayback = async () => { if (!currentSrc) { toast.error("This production has no generated audio yet. Connect Gnani to create dialogue voices."); return; } if (!audioRef.current) return; if (playing) { audioRef.current.pause(); setPlaying(false); } else { try { await audioRef.current.play(); setPlaying(true); } catch { toast.error("This audio could not be played here."); } } };
  return <div className="flex min-h-[calc(100vh-4.5rem)] flex-col">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-8"><div className="min-w-0"><div className="studio-eyebrow text-muted-foreground">Audio studio · {LANGUAGES.find(([code]) => code === project.language)?.[1]}</div><div className="studio-display mt-1 truncate text-2xl">{project.title}</div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><span className="size-2 rounded-full bg-accent" />Saved locally</span><Button variant="outline" size="sm" onClick={() => navigate({ to: "/projects/$id/storyboard", params: { id: project.id } })}><FileText />Screenplay</Button><Button size="sm" onClick={() => { if (project.audioUrl) { const anchor = document.createElement("a"); anchor.href = project.audioUrl; anchor.download = `${project.title || "production"}.webm`; anchor.click(); } else toast.error("No final audio has been generated yet."); }}><ArrowDownToLine />Export</Button></div></div>
    <div className="grid flex-1 lg:grid-cols-[14rem_minmax(0,1fr)_17rem]">
      <aside className="border-b border-border p-4 lg:border-b-0 lg:border-r"><div className="studio-eyebrow mb-4 text-muted-foreground">Scenes</div>{project.scenes.length ? project.scenes.map((scene, index) => <div key={scene.id} className="mb-2"><button className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs font-semibold hover:bg-muted" onClick={() => { const indexOf = lines.findIndex(current => scene.lines.some(item => item.id === current.id)); if (indexOf >= 0) setSelectedLine(indexOf); }}><span>{String(index + 1).padStart(2, "0")} · {scene.title}</span><ChevronDown size={13} /></button><div className="ml-2 border-l border-border pl-2">{scene.lines.map(item => <button key={item.id} onClick={() => setSelectedLine(lines.findIndex(candidate => candidate.id === item.id))} className={`block w-full truncate py-1.5 text-left text-[0.68rem] ${line?.id === item.id ? "font-semibold text-accent" : "text-muted-foreground"}`}>{item.speaker} · {item.text}</button>)}</div></div>) : <p className="text-xs text-muted-foreground">Add scenes and lines in your screenplay.</p>}<div className="mt-6 border-t border-border pt-4"><div className="studio-eyebrow mb-3 text-muted-foreground">Tracks</div><div className="flex items-center gap-2 text-xs"><UsersRound size={14} />Dialogue</div><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Music2 size={14} />Background music</div></div></aside>
      <section className="min-w-0 overflow-hidden p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><div className="studio-eyebrow text-muted-foreground">Timeline</div><div className="mt-1 text-xs text-muted-foreground">{project.scenes.length} scenes · {lines.length} dialogue lines</div></div><Button variant="ghost" size="sm" onClick={() => navigate({ to: "/projects/$id/casting", params: { id: project.id } })}><UsersRound />Casting</Button></div>
      <div className="relative min-h-52 overflow-x-auto border border-border bg-card p-3"><div className="flex min-w-[42rem] flex-col gap-2">{project.scenes.length ? project.scenes.map((scene, sceneIndex) => <div key={scene.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2"><div className="truncate text-[0.65rem] font-semibold text-muted-foreground">{scene.title}</div><div className="grid min-h-12 grid-cols-4 gap-2 border-l-2 border-primary/30 pl-2">{scene.lines.length ? scene.lines.map(item => <button key={item.id} onClick={() => setSelectedLine(lines.findIndex(candidate => candidate.id === item.id))} className={`min-w-0 border px-2 py-2 text-left transition-colors ${line?.id === item.id ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/50"}`}><div className="truncate text-[0.62rem] font-semibold">{item.speaker}</div><div className="mt-1 truncate text-[0.57rem] text-muted-foreground">{item.text}</div><div className="mt-1 text-[0.58rem] text-muted-foreground">{item.audioUrl ? "Saved audio" : "No audio"}</div></button>) : <div className="col-span-4 flex items-center text-[0.65rem] text-muted-foreground">No dialogue in scene {sceneIndex + 1}</div>}</div></div>) : <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">Add scenes to build your timeline.</div>}</div></div>
        <div className="mt-3 flex justify-between font-mono text-[0.65rem] text-muted-foreground"><span>00:00</span><span>{duration ? `${Math.floor(duration / 60).toString().padStart(2, "0")}:${Math.floor(duration % 60).toString().padStart(2, "0")}` : "—:—"}</span><span>END</span></div>
        <div className="mt-6 border-t border-border pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold"><FileAudio2 size={14} />Playback queue</div><div className="divide-y divide-border border-y border-border">{lines.length ? lines.map((item, index) => <button key={item.id} onClick={() => setSelectedLine(index)} className={`flex w-full items-center gap-3 py-3 text-left ${index === selectedLine ? "text-foreground" : "text-muted-foreground"}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[0.6rem] font-mono">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.speaker}</span><span className="mt-1 block truncate text-xs">{item.text}</span></span>{item.audioUrl ? <Play size={14} /> : <span className="text-[0.6rem]">No audio</span>}</button>) : <div className="py-8 text-center text-xs text-muted-foreground">Your dialogue lines will appear here.</div>}</div></div>
      </section>
      <aside className="border-t border-border p-4 lg:border-l lg:border-t-0"><div className="studio-eyebrow text-muted-foreground">Selected line</div>{line ? <><div className="mt-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-semibold">{line.speaker.slice(0, 1).toUpperCase()}</div><div><div className="text-sm font-semibold">{line.speaker}</div><div className="text-xs text-muted-foreground">{line.voice ?? project.voiceAssignments?.[line.speaker] ?? "Voice not assigned"}</div></div></div><div className="my-5 border-t border-border" /><div className="studio-eyebrow text-muted-foreground">Dialogue</div><Textarea value={line.text} onChange={event => updateLine({ text: event.target.value, audioAssetId: null, audioUrl: null })} className="mt-2 min-h-24 text-sm leading-relaxed" aria-label="Edit selected dialogue" />{line.audioUrl && <audio ref={audioRef} src={line.audioUrl} onEnded={() => setPlaying(false)} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} controls className="mt-4 w-full">Audio playback is unavailable.</audio>}<div className="my-5 border-t border-border" /><div className="studio-eyebrow text-muted-foreground">Performance</div><div className="mt-3 flex items-center justify-between gap-2 text-xs"><span>Assigned voice</span><span className="text-muted-foreground">{line.voice ?? project.voiceAssignments?.[line.speaker] ?? "None yet"}</span></div><label className="mt-3 block"><span className="studio-overline mb-2 block">Speed · {line.speed ?? 1}</span><input type="range" min="0.85" max="1.15" step="0.05" value={line.speed ?? 1} onChange={event => updateLine({ speed: Number(event.target.value), audioAssetId: null, audioUrl: null })} className="w-full" aria-label="Dialogue speed" /></label><Button variant="outline" className="mt-3 w-full" onClick={() => navigate({ to: "/projects/$id/casting", params: { id: project.id } })}><AudioLines />Open casting</Button><Button variant="ghost" className="mt-1 w-full" onClick={() => void generateLine()}><WandSparkles />{line.audioAssetId ? "Regenerate this line" : "Generate this line"}</Button></> : <div className="mt-4 text-xs leading-relaxed text-muted-foreground">Select a dialogue clip to inspect its performance and audio.</div>}
        <div className="mt-7 border-t border-border pt-5"><div className="studio-eyebrow text-muted-foreground">Export production</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Combine saved clips in scene order with a short pause between lines.</p><Button variant="outline" className="mt-3 w-full" disabled={exporting} onClick={() => void exportProduction()}>{exporting ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}{exporting ? "Preparing WAV…" : "Export WAV"}</Button></div>
      </aside>
    </div>
    <div className="sticky bottom-0 z-10 flex items-center gap-4 border-t border-border bg-card px-5 py-3 sm:px-8"><Button variant="secondary" size="icon" className="rounded-full" aria-label={playing ? "Pause production" : "Play production"} onClick={togglePlayback}>{playing ? <Pause /> : <Play />}</Button><button onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.pause(); setPlaying(false); } }} title="Stop playback" aria-label="Stop playback" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"><Square size={15} /></button><div className="flex-1"><div className="h-1 overflow-hidden rounded bg-muted"><div className="h-full w-0 bg-accent" /></div></div><span className="font-mono text-xs text-muted-foreground">00:00</span><audio ref={audioRef} src={currentSrc} onEnded={() => setPlaying(false)} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} className="hidden">Audio playback is unavailable.</audio><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Headphones size={15} />{line ? line.speaker : "No clip selected"}</span></div>
  </div>;
}

function VoiceLibrary() {
  const [language, setLanguage] = useState("all");
  const groups: { code: string; language: string; voices: typeof TIMBRE_V25_VOICES }[] = Array.from(new Map<string, { code: string; language: string; voices: typeof TIMBRE_V25_VOICES }>(TIMBRE_V25_VOICES.map(voice => [voice.language, { code: voice.language, language: voice.languageName, voices: TIMBRE_V25_VOICES.filter(item => item.language === voice.language) }])).values());
  const languages: [string, string][] = [["all", "All languages"], ...groups.map(group => [group.code, group.language] as [string, string])];
  return <div className="studio-page"><PageHeading eyebrow="Voice library" title="A voice for every role." subtitle="Browse Gnani's documented Timbre v2.5 voice catalogue by preferred language." />
    <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border">{languages.map(([code, label]) => <button key={code} onClick={() => setLanguage(code)} className="studio-tab whitespace-nowrap px-2" data-active={language === code}>{label}</button>)}</div>
    <div className="grid gap-9">{groups.filter(group => language === "all" || group.code === language).map(group => <section key={group.code}><div className="mb-3 flex items-end justify-between"><div><div className="studio-eyebrow text-accent">{group.code}</div><h2 className="studio-display mt-1 text-2xl">{group.language}</h2></div><span className="text-xs text-muted-foreground">{group.voices.length} voices</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.voices.map(voice => <article key={voice.name} className="studio-panel flex items-center gap-3 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">{voice.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{voice.name}</div><div className="mt-1 text-xs text-muted-foreground">{voice.languageName} · {voice.gender} · {voice.persona}</div></div><VoicePreviewButton voice={voice} /></article>)}</div></section>)}</div>
  </div>;
}

function VoicePreviewButton({ voice }: { voice: KathaVoice }) {
  const speechFn = useServerFn(generateKathaSpeech);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preview = async () => {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return; }
    setBusy(true);
    try {
      const result = await speechFn({ data: { text: getVoicePreviewLine(voice), voice: voice.name, language: voice.language, speed: 1, voicePreview: true } });
      if (!result.ok) { toast.error(result.message); return; }
      const url = URL.createObjectURL(base64ToAudioBlob(result.audioBase64, result.mimeType));
      const audio = new Audio(url);
      audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url); };
      audioRef.current = audio; audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url); }; await audio.play(); setPlaying(true);
    } catch { toast.error("Voice audio could not be played."); }
    finally { setBusy(false); }
  };
  return <Button variant="ghost" size="icon" disabled={busy} title={`Preview ${voice}`} aria-label={`Preview ${voice}`} onClick={() => void preview()}>{busy ? <LoaderCircle className="animate-spin" /> : playing ? <Pause size={15} /> : <Play size={15} />}</Button>;
}

function PublishedPage({ projects }: { projects: StudioProject[] }) {
  const published = projects.filter(project => project.status === "Published");
  return <div className="studio-page"><PageHeading eyebrow="Your releases" title="Published productions" subtitle="Finished audio stories ready to share." />{published.length ? <div className="grid gap-4 md:grid-cols-2">{published.map(project => <article className="studio-panel p-5" key={project.id}><div className="flex items-center gap-3"><div className="grid size-11 place-items-center bg-primary text-primary-foreground"><Music2 size={19} /></div><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{project.title}</h2><p className="text-xs text-muted-foreground">{LANGUAGES.find(([code]) => code === project.language)?.[1]} · {formatDate(project.updatedAt)}</p></div></div><p className="mt-4 text-sm text-muted-foreground">{project.synopsis || project.story}</p><div className="mt-4">{project.audioUrl ? <audio controls src={project.audioUrl} className="w-full">Audio playback is unavailable.</audio> : <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileAudio2 size={15} />No audio file stored</div>}</div></article>)}</div> : <div className="flex min-h-[20rem] flex-col items-center justify-center border border-dashed border-border px-5 text-center"><div className="studio-empty-mark"><Clapperboard size={20} /></div><div className="studio-display mt-5 text-2xl">Your first release is still being made.</div><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">When a production is complete, it will be ready to share here. Drafts stay in My productions.</p><Link to="/projects" className="mt-4 text-sm font-semibold text-primary">View my productions <ChevronRight className="inline" size={16} /></Link></div>}</div>;
}

function SettingsPage() {
  const [status, setStatus] = useState<{ gnaniConfigured: boolean; groqConfigured: boolean; groqModelConfigured: boolean } | null>(null);
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [active, setActive] = useState("services");
  const statusFn = useServerFn(getIntegrationStatus);
  const gnaniTest = useServerFn(testGnaniConnection);
  const groqTest = useServerFn(testGroqConnection);
  useEffect(() => { void statusFn().then(setStatus).catch(() => toast.error("Could not check server integration settings.")); }, [statusFn]);
  const test = async (provider: "Gnani" | "Groq") => {
    setBusy(provider);
    try {
      const result = provider === "Gnani" ? await gnaniTest() : await groqTest();
      setResults(current => ({ ...current, [provider]: result.message }));
      if (result.ok) toast.success(`${provider} connection test passed.`); else toast.error(result.message);
    } catch { setResults(current => ({ ...current, [provider]: "Connection test could not be completed." })); }
    finally { setBusy(""); }
  };
  const integrations = [
    { name: "Gnani" as const, title: "Gnani AI", detail: "Prisma v2.5 transcription · Timbre v2.5 speech", icon: AudioLines, configured: status?.gnaniConfigured ?? false },
    { name: "Groq" as const, title: "Groq", detail: "Screenplay understanding · character and scene extraction", icon: WandSparkles, configured: status?.groqConfigured ?? false },
  ];
  const settingTabs: [string, string][] = [["services", "Integrations"], ["workspace", "Workspace"]];
  return <div className="studio-page max-w-5xl"><PageHeading eyebrow="Workspace setup" title="Make the studio yours." subtitle="Test server-side provider connections and manage this browser's local workspace." />
    <div className="mb-7 flex gap-6 border-b border-border">{settingTabs.map(([key, label]) => <button key={key} className="studio-tab" data-active={active === key} onClick={() => setActive(key)}>{label}</button>)}</div>
    {active === "services" ? <><div className="mb-5 flex items-start gap-3 border border-border bg-secondary/70 p-4"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" /><p className="text-xs leading-relaxed text-muted-foreground">Provider keys stay private on the server. Run real connection tests here before using transcription, speech, or screenplay generation.</p></div>
      <section className="divide-y divide-border border-y border-border">{integrations.map(({ name, title, detail, icon: Icon, configured }) => <div key={name} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center border border-border bg-card"><Icon size={19} className="text-accent" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{title}</h2><span className="inline-flex items-center gap-1.5 text-[0.68rem] text-muted-foreground"><span className={`size-1.5 rounded-full ${configured ? "bg-accent" : "bg-muted-foreground/50"}`} />{configured ? "Server setting present · not tested" : "Missing server setting"}</span></div><p className="mt-1 text-xs text-muted-foreground">{detail}</p>{results[name] && <p role="status" className="mt-2 text-xs text-muted-foreground">{results[name]}</p>}</div><Button variant="outline" className="shrink-0" disabled={busy !== ""} onClick={() => void test(name)}>{busy === name ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}{busy === name ? "Testing…" : "Test connection"}</Button></div>)}</section>
      <div className="mt-8"><div className="studio-eyebrow text-muted-foreground">Private server settings</div><div className="mt-3 grid gap-4 md:grid-cols-2"><div className="studio-soft-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Mic size={16} className="text-accent" />Gnani AI</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Set GNANI_API_KEY on the server. Prisma v2.5 accepts audio clips up to 30 seconds. Recorded audio is converted to WAV before transcription.</p></div><div className="studio-soft-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold"><WandSparkles size={16} className="text-accent" />Groq</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Set GROQ_API_KEY and GROQ_MODEL on the server. The model is checked before screenplay extraction.</p></div></div></div>
    </> : <div className="studio-panel p-5"><div className="studio-eyebrow text-muted-foreground">Local workspace</div><h2 className="studio-display mt-2 text-2xl">This browser, for now.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Project details are stored in this browser. Recordings and generated clips are in IndexedDB and do not sync across devices.</p><div className="mt-5 border-t border-border pt-4"><div className="flex items-center gap-2 text-xs"><ShieldCheck size={15} className="text-accent" />Audio is sent only when you request transcription or speech generation.</div></div></div>}
  </div>;
}

export function KathaWorkspace({ page, projectId = "" }: { page: string; projectId?: string }) {
  const [projects, setProjects, hydrated] = useProjects();
  const currentPage = NAV.find(item => item.page === page)?.page ?? page;
  const content = !hydrated ? <div className="grid min-h-[70vh] place-items-center text-sm text-muted-foreground"><LoaderCircle size={20} className="animate-spin" /></div> : (() => {
    switch (page) {
      case "projects": return <ProjectsPage projects={projects} setProjects={setProjects} />;
      case "create": return <CreatePage setProjects={setProjects} />;
      case "storyboard": return <StoryboardPage projectId={projectId} projects={projects} setProjects={setProjects} />;
      case "casting": return <CastingPage projectId={projectId} projects={projects} setProjects={setProjects} />;
      case "studio": return <StudioPage projectId={projectId} projects={projects} setProjects={setProjects} />;
      case "voice-library": return <VoiceLibrary />;
      case "published": return <PublishedPage projects={projects} />;
      case "settings": return <SettingsPage />;
      default: return <Dashboard projects={projects} />;
    }
  })();
  return <AppFrame active={currentPage}>{content}</AppFrame>;
}