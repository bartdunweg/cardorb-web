import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BinderDialog } from "@/components/app/binder-dialog";
import { PageHeader } from "@/components/app/page-header";
import { SignInInvite } from "@/components/app/sign-in-invite";
import { Button } from "@/components/base/buttons/button";
import { session } from "@/lib/api";
import { getDexBinder } from "@/lib/binders";

// Out of the index: an empty Pokédex in a search result is worse than none.
export const metadata: Metadata = { title: "Pokédex", robots: { index: false } };

// The Pokédex stopped being a fixture: it is a binder like any other now, one you make, edit and
// delete. The address stays for the bookmarks and the links that have it, and leads where the
// Pokédex went. With a Pokédex binder nothing is drawn here: that binder's own page titles itself
// and reads its own setting.
//
// Without one this used to redirect to Binders without a word, so a new account that typed the
// address, or followed an old link, landed on a page it did not ask for with no idea why (error-path
// audit). It lands here instead, on the one thing to do about it.
export default async function PokedexPage() {
    const mine = await session();
    // Before any read of the person's: a visitor gets an invitation where an error or a blank would
    // have been, and the page keeps its title so they still know which page answered.
    // The redirect belongs to somebody with binders. A visitor has none, so there is nowhere to send
    // them and no binder to read: they get the invitation and stay on the address they typed.
    if (!mine)
        return (
            <div className="flex flex-1 flex-col gap-6">
                <PageHeader title="Pokédex" />
                <SignInInvite place="pokedex" />
            </div>
        );

    const binder = await getDexBinder();
    if (binder) redirect(`/dashboard/collections/${binder.id}`);

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader title="Pokédex" />
            <AppEmptyState
                icon="book"
                title="No Pokédex yet"
                description="The Pokédex is a binder shown as one slot per Pokémon. Make a binder and turn on Show as Pokédex."
            >
                <BinderDialog mode="create">
                    <Button>New binder</Button>
                </BinderDialog>
                <Button href="/dashboard/collections" color="secondary">
                    Go to Binders
                </Button>
            </AppEmptyState>
        </div>
    );
}
