import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/projects/$id/casting")({
  head: () => ({ meta: [
    { title: "Casting Room — Katha Studio" }, { name: "description", content: "Assign Timbre v2.5 voices to your story's characters." },
    { property: "og:title", content: "Casting Room — Katha Studio" }, { property: "og:description", content: "Assign Timbre v2.5 voices to your story's characters." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: CastingRoute,
});
function CastingRoute() { const { id } = Route.useParams(); return <KathaWorkspace page="casting" projectId={id} />; }
