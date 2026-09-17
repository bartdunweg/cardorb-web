"use client";

import { AppErrorState } from "@/components/app/app-error-state";

// A dashboard page that threw, shown inside the app layout: the sidebar and tab bar stay, so
// the person can go elsewhere, and Try again repeats this page's reads. The layout's own reads
// (profile, folders) never throw into a boundary: a 401 redirects to /login, anything else draws
// the frame without them, so what shows here is always this page's own failure.
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return <AppErrorState retry={retry} home={{ href: "/dashboard", label: "Go to Home" }} />;
}
