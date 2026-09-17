"use client";

import { AppErrorState } from "@/components/app/app-error-state";

// A public page whose reads threw: most often a public Pokédex binder, whose every-card read is
// handed to the grid unawaited and throws there when the API does not answer. The root boundary
// caught it before, with the app's grey ground; this one keeps the public pages' own ground and
// leads to the site's front page. A name nobody has is not an error: notFound() is called before
// anything streams and the profile's not-found page answers it, with its 404.
export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <main className="flex min-h-dvh flex-col bg-page px-4 py-6">
            <AppErrorState retry={retry} home={{ href: "/", label: "Go to Home" }} />
        </main>
    );
}
