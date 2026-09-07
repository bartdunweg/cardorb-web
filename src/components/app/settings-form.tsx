"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Code01, File02, Lock01, Monitor04, Moon01, Sun, UploadCloud01, User01 } from "@untitledui/icons";
import { Button as AriaButton, Heading as AriaHeading } from "react-aria-components";
import { checkUsername, removeAvatar, updateEmail, updatePassword, updateProfile, uploadAvatar } from "@/app/(app)/dashboard/settings/actions";
import { signOut } from "@/app/(auth)/actions";
import { ImportDialog } from "@/components/app/import-dialog";
import { SettingsGroup, SettingsLinkRow, SettingsRow } from "@/components/app/settings-rows";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import type { Profile } from "@/lib/profile";
import { isTheme } from "@/lib/theme-script";
import { useTheme } from "@/providers/theme";

type Msg = { type: "ok" | "err"; text: string } | null;

/** What the theme row says it currently is, without opening it. */
const THEME_LABELS: Record<string, string> = { light: "Light", dark: "Dark", system: "System" };

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** The public page's address as a person would type it: the site's origin without its scheme. */
function publicUrl(username: string): string {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cardorb.com";
    return `${site.replace(/^https?:\/\//, "")}/user/${username}`;
}

function StatusText({ msg }: { msg: Msg }) {
    if (!msg) return null;
    // <output> carries the status role natively; an error is an alert so it interrupts.
    // Either arrives rather than snapping in under the buttons; the roles are untouched by the fade.
    if (msg.type === "ok") return <output className="arrive text-sm text-success-primary">{msg.text}</output>;
    return (
        <p role="alert" className="arrive text-sm text-error-primary">
            {msg.text}
        </p>
    );
}

// `heading` replaces the Settings title: the You page puts the account there instead.
export function SettingsForm({ profile, email, heading }: { profile: Profile; email: string | null; heading?: ReactNode }) {
    const [displayName, setDisplayName] = useState(profile.display_name ?? "");
    const [username, setUsername] = useState(profile.username);
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
    const [isPublic, setIsPublic] = useState(profile.is_public);
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

        const res = await uploadAvatar(image);
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
        const res = await removeAvatar();
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
    // both until it resolves after hydration — no mount flag, no mismatch.
    const currentTheme = theme ?? "system";

    const saveProfile = async () => {
        setSavingProfile(true);
        setProfileMsg(null);
        const res = await updateProfile({ display_name: displayName, username, is_public: isPublic, wishlist_public: profile.wishlist_public });
        // The address goes to Supabase, not the API, and lands only once the mail it sends is answered.
        const newEmail = emailValue.trim().toLowerCase();
        const changed = newEmail !== (email ?? "").toLowerCase();
        const mail = res.ok && changed ? await updateEmail(newEmail) : null;
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
        const res = await updatePassword(pwCurrent, pw);
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
        <div className="flex max-w-2xl flex-col gap-6">
            {heading ?? (
                <div className="flex flex-col gap-1">
                    <h1 className="text-display-xs font-semibold text-primary">Settings</h1>
                    <p className="text-md text-tertiary">Manage your account and preferences.</p>
                </div>
            )}

            {/* Who you are, before anything you can change about it. */}
            <div className="flex items-center gap-4 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary ring-inset">
                <Avatar src={avatarUrl || undefined} alt={displayName || username} size="lg" />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-md font-semibold text-primary">{displayName || username || "Your profile"}</span>
                    <span className="truncate text-sm text-tertiary">{email}</span>
                </div>
            </div>

            <SettingsGroup title="Account">
                <SettingsRow
                    icon={User01}
                    label="Manage profile"
                    content={() => (
                        <div className="flex flex-col gap-5 p-5">
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                Manage profile
                            </AriaHeading>
                            <p className="text-sm text-tertiary">This is how you appear in Cardorb.</p>
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
                            <Toggle
                                label="Public collection"
                                // With the toggle on, the address people can open, so it can be read and copied from here.
                                // The saved name, not the field: an address only exists once the name is claimed.
                                hint={
                                    isPublic && profile.username
                                        ? `Anyone can view your collection at ${publicUrl(profile.username)}.`
                                        : "When on, anyone can view your collection."
                                }
                                isSelected={isPublic}
                                onChange={setIsPublic}
                                // The kit's toggle is as wide as its words; the address has to wrap on a phone.
                                className="w-full"
                            />
                            {isPublic && profile.username ? (
                                <Button href={`/user/${profile.username}`} color="secondary" size="sm" className="self-start">
                                    View your public page
                                </Button>
                            ) : null}
                            <StatusText msg={profileMsg} />
                            <div>
                                <Button onClick={saveProfile} isLoading={savingProfile}>
                                    Save changes
                                </Button>
                            </div>
                        </div>
                    )}
                />
                <SettingsRow
                    icon={Lock01}
                    label="Password"
                    content={() => (
                        <div className="flex flex-col gap-5 p-5">
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                Password
                            </AriaHeading>
                            <p className="text-sm text-tertiary">Set a new password for your account.</p>
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
                            <div>
                                <Button onClick={savePassword} isLoading={savingPw}>
                                    Update password
                                </Button>
                            </div>
                        </div>
                    )}
                />
            </SettingsGroup>

            <SettingsGroup title="Preferences">
                <SettingsRow
                    icon={Sun}
                    label="Theme"
                    value={THEME_LABELS[currentTheme] ?? null}
                    content={() => (
                        <div className="flex flex-col gap-5 p-5">
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                Theme
                            </AriaHeading>
                            <p className="text-sm text-tertiary">Choose how Cardorb looks.</p>
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
                    )}
                />
            </SettingsGroup>

            <SettingsGroup title="Collection">
                {/* Already a dialog of its own, so it is the trigger rather than the content. */}
                <ImportDialog>
                    <AriaButton className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2">
                        <UploadCloud01 aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />
                        <span className="flex-1 truncate text-md text-primary">Import a CSV file</span>
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
                    </AriaButton>
                </ImportDialog>
            </SettingsGroup>

            <SettingsGroup title="Support">
                <SettingsLinkRow icon={Code01} label="API reference" href="/docs/api" />
                <SettingsLinkRow icon={File02} label="Terms" href="/terms" />
            </SettingsGroup>

            <form action={signOut}>
                <Button type="submit" color="secondary-destructive" className="w-full sm:w-auto">
                    Sign out
                </Button>
            </form>
        </div>
    );
}
