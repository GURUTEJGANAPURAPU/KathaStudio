import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/projects/$id/studio")({
  head: () => ({ meta: [
    { title: "Project Audio Studio — Katha Studio" }, { name: "description", content: "Play and review this Katha Studio production." },
    { property: "og:title", content: "Project Audio Studio — Katha Studio" }, { property: "og:description", content: "Play and review this Katha Studio production." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ProjectStudioRoute,
});
function ProjectStudioRoute() { const { id } = Route.useParams(); return <KathaWorkspace page="studio" projectId={id} />; }
