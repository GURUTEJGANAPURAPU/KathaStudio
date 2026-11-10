import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/voice-library")({
  head: () => ({ meta: [
    { title: "Voice Library — Katha Studio" }, { name: "description", content: "Explore the documented Timbre v2.5 voice catalogue." },
    { property: "og:title", content: "Voice Library — Katha Studio" }, { property: "og:description", content: "Explore the documented Timbre v2.5 voice catalogue." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <KathaWorkspace page="voice-library" />,
});
