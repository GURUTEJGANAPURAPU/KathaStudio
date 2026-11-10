import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/projects/$id/storyboard")({
  head: () => ({ meta: [
    { title: "Storyboard — Katha Studio" }, { name: "description", content: "Edit scenes and dialogue in your Katha Studio screenplay." },
    { property: "og:title", content: "Storyboard — Katha Studio" }, { property: "og:description", content: "Edit scenes and dialogue in your Katha Studio screenplay." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: StoryboardRoute,
});
function StoryboardRoute() { const { id } = Route.useParams(); return <KathaWorkspace page="storyboard" projectId={id} />; }
