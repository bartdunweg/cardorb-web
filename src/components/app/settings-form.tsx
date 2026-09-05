"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Monitor04, Moon01, Sun } from "@untitledui/icons";
import { removeAvatar, updatePassword, updateProfile, uploadAvatar } from "@/app/(app)/dashboard/settings/actions";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import type { Profile } from "@/lib/profile";
import { isTheme } from "@/lib/theme-script";
import { useTheme } from "@/providers/theme";

type Msg = { type: "ok" | "err"; text: string } | null;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-4 rounded-xl bg-primary p-5 shadow-lift-xs ring-1 ring-primary ring-inset">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-md font-semibold text-primary">{title}</h2>
                {description ? <p className="text-sm text-tertiary">{description}</p> : null}
            </div>
            {children}
        </section>
    );
}

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function StatusText({ msg }: { msg: Msg }) {
    if (!msg) return null;
    // <output> carries the status role natively; an error is an alert so it interrupts.
    if (msg.type === "ok") return <output className="text-sm text-success-primary">{msg.text}</output>;
    return (
        <p role="alert" className="text-sm text-error-primary">
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
    const [wishlistPublic, setWishlistPublic] = useState(profile.wishlist_public);
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
        const res = await updateProfile({ display_name: displayName, username, is_public: isPublic, wishlist_public: wishlistPublic });
        setSavingProfile(false);
        setProfileMsg(res.ok ? { type: "ok", text: "Saved." } : { type: "err", text: res.error });
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

            <Section title="Profile" description="This is how you appear in Cardorb.">
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
                <Input label="Username" value={username} onChange={setUsername} hint="Lowercase letters, numbers and hyphens." />
                <Toggle label="Public collection" hint="When on, anyone can view your collection." isSelected={isPublic} onChange={setIsPublic} />
                {isPublic ? (
                    <Toggle
                        label="Public wishlist"
                        hint="Show the cards you are looking for on your page too."
                        isSelected={wishlistPublic}
                        onChange={setWishlistPublic}
                    />
                ) : null}
                {isPublic && username ? (
                    <Button href={`/user/${username}`} color="link-color" size="sm" className="self-start">
                        View your public page
                    </Button>
                ) : null}
                <StatusText msg={profileMsg} />
                <div>
                    <Button onClick={saveProfile} isLoading={savingProfile}>
                        Save changes
                    </Button>
                </div>
            </Section>

            <Section title="Appearance" description="Choose how Cardorb looks.">
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
            </Section>

            <Section title="Password" description="Set a new password for your account.">
                <Input
                    label="Current password"
                    type="password"
                    value={pwCurrent}
                    onChange={setPwCurrent}
                    placeholder="••••••••"
                    autoComplete="current-password"
                />
                <Input label="New password" type="password" value={pw} onChange={setPw} placeholder="••••••••" autoComplete="new-password" />
                <Input label="Confirm new password" type="password" value={pw2} onChange={setPw2} placeholder="••••••••" autoComplete="new-password" />
                <StatusText msg={pwMsg} />
                <div>
                    <Button onClick={savePassword} isLoading={savingPw}>
                        Update password
                    </Button>
                </div>
            </Section>

            <Section title="Account">
                <Input label="Email" value={email ?? ""} isDisabled />
                <form action={signOut}>
                    <Button type="submit" color="secondary-destructive">
                        Sign out
                    </Button>
                </form>
            </Section>
        </div>
    );
}
