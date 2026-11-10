import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";

export const Route = createFileRoute("/projects/")({
  head: () => ({ meta: [
    { title: "My Productions — Katha Studio" }, { name: "description", content: "Browse your locally saved Katha Studio productions." },
    { property: "og:title", content: "My Productions — Katha Studio" }, { property: "og:description", content: "Browse your locally saved Katha Studio productions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <KathaWorkspace page="projects" />,
});