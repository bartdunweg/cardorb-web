import { cx } from "@/utils/cx";

/**
 * Why a save or a sign-in did not go through: one sentence under the fields, above the button.
 *
 * `role="alert"` rather than an `<output>`: a failure interrupts, where a result waits to be read.
 * Ours because the kit's HintText belongs to a field and this belongs to the form: a form can
 * fail with every field it holds valid, and the sentence then has nowhere to hang.
 *
 * Nothing when there is no error, so a caller writes `<FormError error={error} />` and not a
 * ternary around the markup.
 */
export function FormError({ error, arrive = false }: { error?: string | null; arrive?: boolean }) {
    if (!error) return null;
    return (
        // `arrive` where the form is already on screen when the message appears (a panel, a dialog):
        // it fades in instead of snapping in under the buttons. The role is untouched by the fade.
        <p role="alert" className={cx("text-sm text-error-primary", arrive && "arrive")}>
            {error}
        </p>
    );
}
