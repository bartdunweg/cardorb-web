"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Code01, Download01, File02, Lock01, Monitor04, Moon01, Sun, UploadCloud01 } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { Button as AriaButton } from "react-aria-components";
import { checkUsername, removeAvatar, updateEmail, updatePassword, updateProfile, uploadAvatar } from "@/app/(app)/dashboard/settings/actions";
import { signOut } from "@/app/(auth)/actions";
import { FormError } from "@/components/app/form-error";
import { PricesPublicRow } from "@/components/app/prices-public-row";
import { PublicProfileRow, publicUrl } from "@/components/app/public-profile-row";
import { SettingsGroup, SettingsLinkRow, SettingsRow, SettingsTriggerRow, SheetHeader } from "@/components/app/settings-rows";
import { SheetDialog } from "@/components/app/sheet-dialog";
import { notify } from "@/components/app/toast";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import type { Profile } from "@/lib/profile";
import { isTheme } from "@/lib/theme-script";
import { orFailed } from "@/lib/write-outcome";
import { useTheme } from "@/providers/theme";

// The import form is opened rarely and brings the CSV reading with it: its code loads apart, the row still drawn on the server.
// While it loads on a client navigation, a blank of the row's height (py-3.5 around a 24 px line) holds its place.
const ImportDialog = dynamic(() => import("@/components/app/import-dialog").then((m) => m.ImportDialog), {
    loading: () => <div aria-hidden="true" className="h-13" />,
});

type Msg = { type: "ok" | "err"; text: string } | null;

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function StatusText({ msg }: { msg: Msg }) {
    if (!msg) return null;
    // <output> carries the status role natively; an error is an alert so it interrupts.
    // Either arrives rather than snapping in under the buttons; the roles are untouched by the fade.
    if (msg.type === "ok") return <output className="arrive text-sm text-success-primary">{msg.text}</output>;
    return <FormError error={msg.text} arrive />;
}

// `heading` replaces the Settings title: the You page puts the account there instead.
/**
 * The sheet's own draft of Public profile. It mounts when the sheet opens, seeded from what is
 * saved, and goes with the sheet. The Toggle used to write the page's `isPublic` itself, so Cancel,
 * Escape or a tap outside left the row on the page, and its address line, saying what the server
 * never got; flipping the row back then wrote a no-op the person read as "turned it off".
 */
function PublicProfileDraft({
    initial,
    username,
    saving,
    msg,
    onSave,
    onCancel,
}: {
    initial: boolean;
    username: string;
    saving: boolean;
    msg: Msg;
    onSave: (publicDraft: boolean) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    return (
        <>
            <Toggle
                label="Public profile"
                // With the toggle on, the address people can open, so it can be read and copied from here.
                // The saved name, not the field: an address only exists once the name is claimed.
                hint={draft && username ? `Anyone can view your collection at ${publicUrl(username)}.` : "When on, anyone can view your collection."}
                isSelected={draft}
                onChange={setDraft}
                // The kit's toggle is as wide as its words; the address has to wrap on a phone.
                className="w-full"
            />
            {draft && username ? (
                <Button href={`/user/${username}`} color="secondary" size="sm" className="self-start">
                    View your public page
                </Button>
            ) : null}
            <StatusText msg={msg} />
            {/* Cancel beside Save, because a sheet on a phone has no page
                beside it to tap and Escape is not a thing anybody sees. */}
            <div className="flex justify-end gap-3">
                <Button color="secondary" onClick={onCancel} isDisabled={saving}>
                    Cancel
                </Button>
                <Button onClick={() => onSave(draft)} isLoading={saving}>
                    Save changes
                </Button>
            </div>
        </>
    );
}

export function SettingsForm({
    profile,
    email,
    heading,
    openProfile = false,
}: {
    profile: Profile;
    email: string | null;
    heading?: ReactNode;
    openProfile?: boolean;
}) {
    const [displayName, setDisplayName] = useState(profile.display_name ?? "");
    const [username, setUsername] = useState(profile.username);
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
    const [isPublic, setIsPublic] = useState(profile.is_public);
    const [pricesPublic, setPricesPublic] = useState(profile.prices_public);
    const [emailValue, setEmailValue] = useState(email ?? "");
    // Whether the name is free, asked a beat after the typing stops. The name it was asked for
    // rides along, so an answer that arrives after another keystroke is ignored rather than shown.
    const [nameCheck, setNameCheck] = useState<{ name: string; available: boolean; reason?: string } | null>(null);
    useEffect(() => {
        const wanted = username.trim().toLowerCase();
        // The stale answer is not cleared here: `nameAnswer` below only shows one that names the
        // text as it stands, so an old answer is invisible without a second render to drop it.
        if (!wanted || wanted === profile.username) return;
        let live = true;
        const timer = setTimeout(async () => {
            const answer = await checkUsername(wanted);
            if (live && answer) setNameCheck({ name: wanted, ...answer });
        }, 400);
        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [username, profile.username]);
    const nameAnswer = nameCheck?.name === username.trim().toLowerCase() ? nameCheck : null;
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<Msg>(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (fileRef.current) fileRef.current.value = "";
        if (!file) return;

        // The type from the browser, not the filename, and a cap that keeps a profile picture a
        // profile picture. The API checks both again and stores the image.
        if (!AVATAR_TYPES[file.type]) {
            setProfileMsg({ type: "err", text: "Use a JPG, PNG or WebP image." });
            return;
        }
        if (file.size > AVATAR_MAX_BYTES) {
            setProfileMsg({ type: "err", text: "Keep the image under 2 MB." });
            return;
        }

        setUploading(true);
        setProfileMsg(null);
        const image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        }).catch(() => null);
        if (!image) {
            setUploading(false);
            setProfileMsg({ type: "err", text: "That file could not be read." });
            return;
        }

        // A call that never answers (no signal, a deploy in between) must not leave the button spinning.
        const res = await orFailed(uploadAvatar(image));
        setUploading(false);
        if (res.ok) {
            setAvatarUrl(res.avatarUrl ?? "");
            setProfileMsg({ type: "ok", text: "Avatar updated." });
        } else {
            setProfileMsg({ type: "err", text: res.error });
        }
    };

    const onRemoveAvatar = async () => {
        setUploading(true);
        setProfileMsg(null);
        const res = await orFailed(removeAvatar());
        setUploading(false);
        if (res.ok) {
            setAvatarUrl("");
            setProfileMsg({ type: "ok", text: "Avatar removed." });
        } else {
            setProfileMsg({ type: "err", text: res.error });
        }
    };

    const [pwCurrent, setPwCurrent] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [savingPw, setSavingPw] = useState(false);
    const [pwMsg, setPwMsg] = useState<Msg>(null);

    const { theme, setTheme } = useTheme();
    // The theme is undefined on the server and first client render alike, so "system" shows on
    // both until it resolves after hydration: no mount flag, no mismatch.
    const currentTheme = theme ?? "system";

    const saveProfile = async (publicDraft: boolean) => {
        setSavingProfile(true);
        setProfileMsg(null);
        const res = await orFailed(updateProfile({ display_name: displayName, username, is_public: publicDraft }));
        // The page's row follows the server, not the sheet's toggle: what was saved is public.
        if (res.ok) {
            setIsPublic(publicDraft);
            // The name as it was saved: the API keeps it lowercase.
            setUsername(username.trim().toLowerCase());
        }
        // The address goes to Supabase, not the API, and lands only once the mail it sends is answered.
        const newEmail = emailValue.trim().toLowerCase();
        const changed = newEmail !== (email ?? "").toLowerCase();
        const mail = res.ok && changed ? await orFailed(updateEmail(newEmail)) : null;
        setSavingProfile(false);
        if (!res.ok) setProfileMsg({ type: "err", text: res.error });
        else if (mail && !mail.ok) setProfileMsg({ type: "err", text: mail.error });
        else if (mail) setProfileMsg({ type: "ok", text: `Saved. Check ${newEmail} for a link to confirm the new address.` });
        else setProfileMsg({ type: "ok", text: "Saved." });
    };

    const savePassword = async () => {
        if (pw !== pw2) {
            setPwMsg({ type: "err", text: "Passwords don't match." });
            return;
        }
        setSavingPw(true);
        setPwMsg(null);
        const res = await orFailed(updatePassword(pwCurrent, pw));
        setSavingPw(false);
        if (res.ok) {
            setPwCurrent("");
            setPw("");
            setPw2("");
            setPwMsg({ type: "ok", text: "Password updated." });
        } else {
            setPwMsg({ type: "err", text: res.error });
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            {heading ?? (
                <div className="flex flex-col gap-1">
                    <h1 className="text-display-xs font-semibold text-primary">Settings</h1>
                    <p className="text-md text-tertiary">Manage your account and preferences.</p>
                </div>
            )}

            {/* Who you are, before anything you can change about it, and the way to change it, on
                the card that shows it. It was a row in the list below, one line under the picture of
                the thing it edits. */}
            <div className="flex items-center gap-4 rounded-xl bg-page p-4 shadow-lift-xs ring-1 ring-primary ring-inset">
                <Avatar src={avatarUrl || undefined} alt={displayName || username} size="lg" />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-md font-semibold text-primary">{displayName || username || "Your profile"}</span>
                    <span className="truncate text-sm text-tertiary">{email}</span>
                </div>
                <SheetDialog
                    className="sm:max-w-md"
                    defaultOpen={openProfile}
                    content={(close) => (
                        <div className="flex flex-col gap-5 p-5">
                            <SheetHeader title="Manage profile" description="This is how you appear in Cardorb." close={close} />
                            <div className="flex items-center gap-4">
                                <Avatar src={avatarUrl || undefined} alt={displayName || username} size="xl" />
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button size="sm" color="secondary" onClick={() => fileRef.current?.click()} isLoading={uploading}>
                                            Upload
                                        </Button>
                                        {avatarUrl ? (
                                            <Button size="sm" color="secondary-destructive" onClick={onRemoveAvatar} isDisabled={uploading}>
                                                Remove
                                            </Button>
                                        ) : null}
                                    </div>
                                    <p className="text-xs text-tertiary">JPG, PNG or WebP.</p>
                                </div>
                                {/* kit-drift: nobody sees this one. It is the hidden file input the Change button
                                    clicks; the kit's FileUpload is a drop zone, which is a different thing. */}
                                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickFile} className="hidden" />
                            </div>
                            <Input label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
                            <Input
                                label="Username"
                                value={username}
                                onChange={setUsername}
                                isInvalid={nameAnswer ? !nameAnswer.available : undefined}
                                hint={
                                    nameAnswer
                                        ? nameAnswer.available
                                            ? `${username.trim().toLowerCase()} is free.`
                                            : nameAnswer.reason
                                        : "Lowercase letters, numbers and hyphens."
                                }
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={emailValue}
                                onChange={setEmailValue}
                                autoComplete="email"
                                hint="A new address takes effect once you confirm it from your inbox."
                            />
                            <PublicProfileDraft
                                initial={isPublic}
                                username={profile.username}
                                saving={savingProfile}
                                msg={profileMsg}
                                onSave={saveProfile}
                                onCancel={close}
                            />
                        </div>
                    )}
                >
                    <Button size="sm" color="secondary" className="ml-auto shrink-0">
                        Manage
                    </Button>
                </SheetDialog>
            </div>

            <SettingsGroup title="Account">
                {/* The one setting that decides who sees the collection, and the address they see
                    it at, on the page rather than behind Manage. It shares `isPublic` with the
                    sheet, so a flip here is what the sheet shows when it opens. */}
                <PublicProfileRow username={profile.username || null} isPublic={isPublic} onChange={setIsPublic} />
                {/* Under it, whether that page prices what it shows: a decision of its own. */}
                <PricesPublicRow isPublic={isPublic} pricesPublic={pricesPublic} onChange={setPricesPublic} />
                <SettingsRow
                    icon={Lock01}
                    label="Password"
                    content={(close) => (
                        <div className="flex flex-col gap-5 p-5">
                            <SheetHeader title="Password" description="Set a new password for your account." close={close} />
                            <Input
                                label="Current password"
                                type="password"
                                value={pwCurrent}
                                onChange={setPwCurrent}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                            <Input label="New password" type="password" value={pw} onChange={setPw} placeholder="••••••••" autoComplete="new-password" />
                            <Input
                                label="Confirm new password"
                                type="password"
                                value={pw2}
                                onChange={setPw2}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <StatusText msg={pwMsg} />
                            <div className="flex justify-end gap-3">
                                <Button color="secondary" onClick={close} isDisabled={savingPw}>
                                    Cancel
                                </Button>
                                <Button onClick={savePassword} isLoading={savingPw}>
                                    Update password
                                </Button>
                            </div>
                        </div>
                    )}
                />
            </SettingsGroup>

            {/* The theme is three buttons and they fit, so they are on the page rather than behind a
                row that opens a sheet to show them. A row that hides one control is a door in front
                of a light switch. */}
            <section className="flex flex-col gap-2">
                <h2 className="px-1 text-sm font-medium text-tertiary">Preferences</h2>
                <div className="flex flex-col gap-3 rounded-xl bg-page p-4 shadow-lift-xs ring-1 ring-primary ring-inset">
                    <span className="text-md text-primary">Theme</span>
                    <ButtonGroup
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([currentTheme])}
                        onSelectionChange={(keys) => {
                            const key = [...keys][0];
                            if (isTheme(key)) setTheme(key);
                        }}
                    >
                        <ButtonGroupItem id="light" iconLeading={Sun}>
                            Light
                        </ButtonGroupItem>
                        <ButtonGroupItem id="dark" iconLeading={Moon01}>
                            Dark
                        </ButtonGroupItem>
                        <ButtonGroupItem id="system" iconLeading={Monitor04}>
                            System
                        </ButtonGroupItem>
                    </ButtonGroup>
                </div>
            </section>

            <SettingsGroup title="Collection">
                {/* Already a dialog of its own, so it is the trigger rather than the content. */}
                <ImportDialog>
                    <SettingsTriggerRow icon={UploadCloud01} label="Import a CSV file" />
                </ImportDialog>
                {/* A file, not a page: the row is a plain link the browser saves, named by the day. */}
                <SettingsLinkRow icon={Download01} label="Export a CSV file" value="Collection and wishlist" href="/dashboard/settings/export" download />
            </SettingsGroup>

            <SettingsGroup title="Support">
                <SettingsLinkRow icon={Code01} label="API reference" href="/docs/api" />
                <SettingsLinkRow icon={File02} label="Terms" href="/terms" />
            </SettingsGroup>

            <form
                action={async () => {
                    // A refused sign-out keeps the session, so it says so rather than staying silent.
                    const result = await signOut().catch(() => ({ error: "Signing out did not go through. Try again." }));
                    if (result) notify.failed(result.error);
                }}
            >
                <Button type="submit" color="secondary-destructive" className="w-full sm:w-auto">
                    Sign out
                </Button>
            </form>
        </div>
    );
}
