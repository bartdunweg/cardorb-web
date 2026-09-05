"use client";

import { useState } from "react";
import { Check, Share01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

// Share this page: the system share sheet where there is one (a phone), the link on the
// clipboard where there is not, and the button says "Copied" for a moment so the copy is seen.
export function ShareButton({ title }: { title: string }) {
    const [copied, setCopied] = useState(false);

    const share = async () => {
        const url = window.location.href;
        if (typeof navigator.share === "function") {
            try {
                await navigator.share({ title, url });
                return;
            } catch {
                // Dismissed, or no share target: fall through to the clipboard.
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // No clipboard either: the address bar is the fallback, and the button stays as it was.
        }
    };

    return (
        <Button color="secondary" size="md" iconLeading={copied ? Check : Share01} onClick={share} aria-live="polite">
            {copied ? "Copied" : "Share"}
        </Button>
    );
}
