import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/legal-page";

/**
 * The privacy policy, at a URL, because that is the only form it can take: App Store Connect asks
 * for a link, and the iOS app points at cardorb.com/privacy. One policy for both surfaces; where
 * the website and the app differ, the sentence says so rather than a second document drifting.
 */
const UPDATED = { iso: "2026-09-02", human: "2 September 2026" };

export const metadata: Metadata = {
    title: "Privacy",
    description: "What Cardorb stores about you, why, who else sees it, and how to get rid of it.",
    alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy policy" updated={UPDATED}>
            <p>
                Cardorb is a tool for keeping track of a Pokémon card collection. This policy explains what it stores, why, who else sees it, and what you can
                do about it. It covers both the website at cardorb.com and the Cardorb app for iPhone and iPad. They are one service, sharing one account and
                one database. Where the two genuinely differ, it says so.
            </p>

            <h2>Who is responsible</h2>
            <p>
                Cardorb is operated by BADU Ventures B.V., Voorhaven 27C, 3025 HC Rotterdam, the Netherlands, registered with the Dutch Chamber of Commerce
                under KVK number 76480801. BADU Ventures B.V. is the data controller for everything described here.
            </p>
            <p>
                For anything in this policy, including a request about your own data, write to <a href="mailto:hello@bartdunweg.com">hello@bartdunweg.com</a>.
            </p>

            <h2>What is collected</h2>

            <h3>Your account</h3>
            <p>
                An email address and a password. The password is never stored by Cardorb in a readable form. Authentication is handled by Supabase, and Cardorb
                only ever sees a session token.
            </p>

            <h3>Your collection</h3>
            <p>
                Every card you add, and what you record about it: quantity, condition, grade, purchase price, purchase date, notes, which collections you have
                sorted it into, whether it is a favourite, and whether it is on your wishlist rather than owned.
            </p>

            <h3>Your profile</h3>
            <p>A username, a display name if you set one, a profile photo if you upload one, and whether you have switched your collection to public.</p>

            <h3>Analytics and crash reports</h3>
            <ul>
                <li>
                    <strong>The website</strong> has no analytics and sets no tracking of any kind. Vercel, which hosts it, keeps ordinary server logs for a
                    short time to run the service.
                </li>
                <li>
                    <strong>The iOS app</strong> has no analytics either. If it crashes or hangs, a diagnostic report is sent to Sentry, an error-tracking
                    service. Those reports carry technical information, such as the kind of crash, the device model, the operating system version and the app
                    version, and deliberately not your email address, your access token, or anything you typed into the app&rsquo;s search.
                </li>
            </ul>

            <h3>Cookies</h3>
            <p>
                One cookie, and it is the one that signs you in: a session token issued by Supabase. Without it you would have to enter your password on every
                page. There are no advertising or tracking cookies here, so there is nothing to consent to and no banner asking you to. Your light-or-dark
                preference is kept in your browser&rsquo;s local storage and never sent to the server.
            </p>

            <h3>What is not collected</h3>
            <p>
                There is no advertising, no tracking across other apps or websites, and nothing is sold or shared for marketing. When you scan a card with the
                camera in the iOS app, the text is recognised on your device; no photograph is uploaded or stored.
            </p>

            <h2>Why, and on what legal basis</h2>
            <p>
                Only to run the service: to sign you in, to store and show your collection, to show a public collection page if you switch that on, and to fix
                crashes. There is no other purpose.
            </p>
            <p>
                Under the GDPR, your account and your collection are processed to perform a contract: you asked for an account, and this is what the account
                does. Crash reports rest on a legitimate interest in the software working.
            </p>

            <h2>Who else sees it</h2>
            <ul>
                <li>
                    <strong>Supabase</strong> hosts the database and handles authentication. The database is hosted in the European Union, in Ireland, and your
                    data is not transferred outside it.
                </li>
                <li>
                    <strong>Vercel</strong> hosts the website.
                </li>
                <li>
                    <strong>Sentry</strong> receives crash reports from the iOS app, and nothing from the website.
                </li>
                <li>
                    <strong>pokemontcg.io</strong> and <strong>TCGdex</strong> supply card and set data, and <strong>Cardmarket</strong> supplies prices in the
                    iOS app. These are asked by Cardorb&rsquo;s own servers, never by your browser or your phone, so they receive nothing identifying you: not
                    your address, not your account, not what you searched for. Opening a &ldquo;Buy on Cardmarket&rdquo; link is an ordinary visit to their
                    website and is governed by their policy, not this one.
                </li>
            </ul>
            <p>
                Nobody else. Your collection is private unless you switch on the public setting yourself, and even a public collection never shows prices,
                purchase details, notes or your email address.
            </p>

            <h2>How long it is kept</h2>
            <p>
                Until you delete it. Deleting your account in the iOS app&rsquo;s Settings removes your profile and your entire collection immediately and
                permanently, in one operation: there is no grace period, no archived copy, and no way to undo it. If you only use the website, write to{" "}
                <a href="mailto:hello@bartdunweg.com">hello@bartdunweg.com</a> and the same happens by hand.
            </p>
            <p>Crash reports are kept by Sentry under its standard retention period for errors, 90 days, and then discarded.</p>

            <h2>Your rights</h2>
            <p>
                If you are in the EU or the UK you can ask for a copy of your data, ask for it to be corrected or deleted, object to it being processed, or
                complain to your national data protection authority. In the Netherlands that is the Autoriteit Persoonsgegevens. For any of these, write to{" "}
                <a href="mailto:hello@bartdunweg.com">hello@bartdunweg.com</a>.
            </p>

            <h2>Children</h2>
            <p>Cardorb is not aimed at children under 16, and an account should not be created by one without a parent&rsquo;s involvement.</p>

            <h2>Changes to this policy</h2>
            <p>
                If this policy changes in a way that matters, you will be told before the change takes effect. The date at the top of this page always reflects
                the version you are reading.
            </p>

            <p>
                <Link href="/terms">Terms of use</Link> · <Link href="/">Back to Cardorb</Link>
            </p>
        </LegalPage>
    );
}
