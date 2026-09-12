import { redirect } from "next/navigation";
import { getDexBinder } from "@/lib/collections";

// The Pokédex stopped being a fixture: it is a binder like any other now, one you make, edit and
// delete. The address stays for the bookmarks and the links that have it, and leads where the
// Pokédex went. Nothing is drawn here: that binder's own page titles itself and reads its own
// setting. Somebody who deleted theirs lands on Binders, where a new one is made.
export default async function PokedexPage() {
    const binder = await getDexBinder();
    redirect(binder ? `/dashboard/collections/${binder.id}` : "/dashboard/collections");
}
