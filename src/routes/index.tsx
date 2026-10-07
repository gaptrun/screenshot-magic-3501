import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control de Acceso — Universidad Monteávila" },
      { name: "description", content: "Panel de recepción y seguridad para el control de acceso al campus UMA." },
      { property: "og:title", content: "Control de Acceso — Universidad Monteávila" },
      { property: "og:description", content: "Registro de entradas y salidas para la comunidad UMA y visitantes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
});
