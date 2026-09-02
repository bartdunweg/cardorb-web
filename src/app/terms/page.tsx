import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/legal-page";

/**
 * Terms of use. Three things Apple's standard EULA does not say and this product needs said out
 * loud: a price is a market observation and not advice, Cardorb is not affiliated with The Pokémon
 * Company, and a free service has to be able to change or stop.
 */
const UPDATED = { iso: "2026-09-02", human: "2 September 2026" };

export const metadata: Metadata = {
    title: "Terms of use",
    description: "The terms you use Cardorb under: what it is, what is promised, and what is not.",
    alternates: { canonical: "/terms" },
};

export default function TermsPage() {
    return (
        <LegalPage title="Terms of use" updated={UPDATED}>
            <p>
                These are the terms you use Cardorb under: the website at cardorb.com and the Cardorb app for iPhone and iPad. They are short on purpose. How
                your data is handled is a separate document: the <Link href="/privacy">privacy policy</Link>.
            </p>

            <h2>Who you are agreeing with</h2>
            <p>
                Cardorb is operated by BADU Ventures B.V., Voorhaven 27C, 3025 HC Rotterdam, the Netherlands, registered with the Dutch Chamber of Commerce
                under KVK number 76480801. In these terms, &ldquo;we&rdquo; means that company and &ldquo;you&rdquo; means whoever is using Cardorb. By creating
                an account or using the service, you accept these terms. If you do not, do not use it.
            </p>

            <h2>What Cardorb is</h2>
            <p>
                A tool for keeping a record of a Pokémon card collection: what you own, what you still want, and, in the iOS app, what it is worth on the open
                market. It is free. There is no paid tier, no card limit, and nothing to cancel.
            </p>

            <h2>Prices are information, not advice</h2>
            <p>
                This is the part worth reading twice. The prices shown in the iOS app come from Cardmarket and describe what cards have been selling for. They
                are an observation of a market, not a valuation of your cards, not an offer, and not financial or investment advice. A collection total is
                arithmetic over those numbers, and it inherits every one of their limitations: a card&rsquo;s condition, its edition, and what someone will
                actually pay for it on a given day are not in it.
            </p>
            <p>
                <strong>Do not buy, sell, insure or make any other financial decision on the strength of a number you read here.</strong> Get the card in front
                of someone who values cards for a living.
            </p>

            <h2>Your account</h2>
            <ul>
                <li>An account is for one person. Keep your password to yourself; anything done through your account is treated as done by you.</li>
                <li>You must be 16 or older, or have a parent or guardian involved if you are not.</li>
                <li>
                    Tell us at <a href="mailto:hello@bartdunweg.com">hello@bartdunweg.com</a> if you think someone else is using your account.
                </li>
            </ul>

            <h2>Your collection is yours</h2>
            <p>
                Everything you put into Cardorb, your cards, your notes, your purchase prices, your profile, stays yours. You give us permission to store it and
                show it back to you, and to show the parts you have chosen to make public, and nothing beyond that. We do not sell it, we do not use it to train
                anything, and we do not show it to anyone you have not shown it to yourself.
            </p>
            <p>
                Switching your collection to public is you choosing to publish it. Prices, purchase details and notes are never included in a public collection,
                but the cards themselves become readable by anyone with the link, and by search engines.
            </p>

            <h2>What you may not do</h2>
            <ul>
                <li>Use somebody else&rsquo;s account, or try to reach data that is not yours.</li>
                <li>Attack, overload or probe the service, or work around the limits that keep it running for everyone else.</li>
                <li>
                    Bulk-download the catalogue or other people&rsquo;s public collections by automated means. The public pages and endpoints are there to be
                    used at a reasonable rate; a scraper is not that.
                </li>
                <li>
                    Put anything unlawful, abusive or infringing into a field other people can see: a display name, a username, a note on a public collection.
                </li>
            </ul>

            <h2>Pokémon is not ours, and we are not theirs</h2>
            <p>
                Cardorb is an independent tool. It is not affiliated with, endorsed by, sponsored by or connected to The Pokémon Company, Nintendo, Game Freak
                or Creatures Inc. in any way. &ldquo;Pokémon&rdquo;, the card names, the set names and the card artwork are the property of their respective
                owners, and are shown here to identify the cards you own, the way a catalogue identifies what is in it.
            </p>
            <p>
                Card and set data comes from pokemontcg.io and TCGdex, and prices from Cardmarket. We depend on them, we do not control them, and we cannot
                promise that what they say is complete or correct.
            </p>

            <h2>It is free, and it comes as it is</h2>
            <p>
                Cardorb is provided as it stands, without warranty of any kind. We do not promise it will be available, that it will be free of faults, that a
                card will match, that a price will be right, or that it will keep working the way it does today. Features can change or be removed.
            </p>
            <p>
                We may change or discontinue the service. If we ever shut it down, we will give you reasonable notice and a way to get your collection out
                first, unless something outside our control makes that impossible.
            </p>
            <p>Keep your own copy of anything you would mind losing. There is no export yet, so for now your collection lives here and nowhere else.</p>

            <h2>Ending it</h2>
            <p>
                You can delete your account at any time in the iOS app&rsquo;s Settings, or by writing to{" "}
                <a href="mailto:hello@bartdunweg.com">hello@bartdunweg.com</a>. It takes your profile and your entire collection with it, immediately and
                permanently. We may suspend or close an account that breaks these terms, and will say why unless we are not allowed to.
            </p>

            <h2>Liability</h2>
            <p>
                To the fullest extent the law allows, we are not liable for indirect or consequential loss, for lost or corrupted data, or for any decision you
                make on the strength of information shown in Cardorb, prices above all. Nothing here limits liability for intent or gross negligence, for death
                or personal injury, or any other liability that cannot be limited under Dutch law. If you are a consumer, your mandatory statutory rights are
                unaffected by anything in this document.
            </p>

            <h2>If you got the app from the App Store</h2>
            <p>
                These terms are between you and us. Apple is not a party to them and has no responsibility for Cardorb: support, maintenance, faults and any
                claim about the app are ours, not theirs. Apple and its subsidiaries may enforce these terms against you as a third-party beneficiary. You also
                agree that you are not in a country subject to a U.S. embargo and are not on a U.S. prohibited-parties list, which is Apple&rsquo;s requirement
                rather than ours.
            </p>

            <h2>Changes to these terms</h2>
            <p>
                If these terms change in a way that matters, you will be told before the change takes effect. The date at the top of this page always reflects
                the version you are reading, and continuing to use Cardorb after a change means accepting it.
            </p>

            <h2>Which law, and which court</h2>
            <p>
                Dutch law applies, and disputes go to the competent court in Rotterdam, the Netherlands. If you are a consumer resident elsewhere in the EU,
                this does not deprive you of the protection of your own country&rsquo;s mandatory rules or of your right to bring a claim there.
            </p>

            <h2>Contact</h2>
            <p>
                Anything at all: <a href="mailto:hello@bartdunweg.com">hello@bartdunweg.com</a>.
            </p>

            <p>
                <Link href="/privacy">Privacy policy</Link> · <Link href="/">Back to Cardorb</Link>
            </p>
        </LegalPage>
    );
}
