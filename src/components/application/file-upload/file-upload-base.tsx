"use client";

/**
 * Untitled UI's file upload: the drop zone, and the file underneath it.
 *
 * Vendored through the MCP as `file-upload-base` and cut down rather than kept
 * whole, which R-STRUCT-001 asks for: only what is imported stays.
 *
 * The kit's list item came back, rewritten. A drop zone on its own answers a
 * file with nothing: the import dialog put a spinner beside it and the file you
 * had chosen was named nowhere, so "what is it busy with" had no answer on
 * screen. The kit's own answer to that is a row per file, which is the right
 * shape, so the row is here, with the file's name, its size and what is
 * happening to it, and a way to take it back off.
 *
 * Rewritten, not copied, because the kit's version is a progress bar and both
 * of its dependencies are for things this app does not do. There is no percent
 * to show: reading a CSV is one await, not a transfer, so the row spins while
 * it reads and says so. `motion` animated a list that is never more than one
 * row long, and `@untitledui/file-icons` drew a badge per file type, the same
 * package R-UI-002 declines for shipping 60 KB of icons. Neither is here.
 *
 * One change inside the drop zone, listed here because R-STRUCT-001 owns
 * these files rather than leaving them untouched: the label around the upload
 * button now draws the kit's focus ring when the hidden input has keyboard
 * focus. Without it, tabbing to the drop zone showed nothing at all — the
 * input is `sr-only` and the kit marked it `peer` without ever reading that.
 */
import { useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle, File02, Trash01, UploadCloud02, XCircle } from "@untitledui/icons";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";

/**
 * Returns a human-readable file size.
 * @param bytes - The size of the file in bytes.
 * @returns A string representing the file size in a human-readable format.
 */
export const getReadableFileSize = (bytes: number) => {
    if (bytes === 0) return "0 KB";

    const suffixes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return Math.floor(bytes / Math.pow(1024, i)) + " " + suffixes[i];
};

interface FileUploadDropZoneProps {
    /** The class name of the drop zone. */
    className?: string;
    /**
     * A hint text explaining what files can be dropped.
     */
    hint?: string;
    /**
     * Disables dropping or uploading files.
     */
    isDisabled?: boolean;
    /**
     * Specifies the types of files that the server accepts.
     * Examples: "image/*", ".pdf,image/*", "image/*,video/mpeg,application/pdf"
     */
    accept?: string;
    /**
     * Allows multiple file uploads.
     */
    allowsMultiple?: boolean;
    /**
     * Maximum file size in bytes.
     */
    maxSize?: number;
    /**
     * Callback function that is called with the list of dropped files
     * when files are dropped on the drop zone.
     */
    onDropFiles?: (files: FileList) => void;
    /**
     * Callback function that is called with the list of unaccepted files
     * when files are dropped on the drop zone.
     */
    onDropUnacceptedFiles?: (files: FileList) => void;
    /**
     * Callback function that is called with the list of files that exceed
     * the size limit when files are dropped on the drop zone.
     */
    onSizeLimitExceed?: (files: FileList) => void;
}

export const FileUploadDropZone = ({
    className,
    hint,
    isDisabled,
    accept,
    allowsMultiple = true,
    maxSize,
    onDropFiles,
    onDropUnacceptedFiles,
    onSizeLimitExceed,
}: FileUploadDropZoneProps) => {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isInvalid, setIsInvalid] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const isFileTypeAccepted = (file: File): boolean => {
        if (!accept) return true;

        // Split the accept string into individual types
        const acceptedTypes = accept.split(",").map((type) => type.trim());

        return acceptedTypes.some((acceptedType) => {
            // Handle file extensions (e.g., .pdf, .doc)
            if (acceptedType.startsWith(".")) {
                const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
                return extension === acceptedType.toLowerCase();
            }

            // Handle wildcards (e.g., image/*)
            if (acceptedType.endsWith("/*")) {
                const typePrefix = acceptedType.split("/")[0];
                return file.type.startsWith(`${typePrefix}/`);
            }

            // Handle exact MIME types (e.g., application/pdf)
            return file.type === acceptedType;
        });
    };

    const handleDragIn = (event: React.DragEvent<HTMLDivElement>) => {
        if (isDisabled) return;

        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragOut = (event: React.DragEvent<HTMLDivElement>) => {
        if (isDisabled) return;

        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);
    };

    const processFiles = (files: File[]): void => {
        // Reset the invalid state when processing files.
        setIsInvalid(false);

        const acceptedFiles: File[] = [];
        const unacceptedFiles: File[] = [];
        const oversizedFiles: File[] = [];

        // If multiple files are not allowed, only process the first file
        const filesToProcess = allowsMultiple ? files : files.slice(0, 1);

        filesToProcess.forEach((file) => {
            // Check file size first
            if (maxSize && file.size > maxSize) {
                oversizedFiles.push(file);
                return;
            }

            // Then check file type
            if (isFileTypeAccepted(file)) {
                acceptedFiles.push(file);
            } else {
                unacceptedFiles.push(file);
            }
        });

        // Handle oversized files
        if (oversizedFiles.length > 0 && typeof onSizeLimitExceed === "function") {
            const dataTransfer = new DataTransfer();
            oversizedFiles.forEach((file) => dataTransfer.items.add(file));

            setIsInvalid(true);
            onSizeLimitExceed(dataTransfer.files);
        }

        // Handle accepted files
        if (acceptedFiles.length > 0 && typeof onDropFiles === "function") {
            const dataTransfer = new DataTransfer();
            acceptedFiles.forEach((file) => dataTransfer.items.add(file));
            onDropFiles(dataTransfer.files);
        }

        // Handle unaccepted files
        if (unacceptedFiles.length > 0 && typeof onDropUnacceptedFiles === "function") {
            const unacceptedDataTransfer = new DataTransfer();
            unacceptedFiles.forEach((file) => unacceptedDataTransfer.items.add(file));

            setIsInvalid(true);
            onDropUnacceptedFiles(unacceptedDataTransfer.files);
        }

        // Clear the input value to ensure the same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        if (isDisabled) return;

        handleDragOut(event);
        processFiles(Array.from(event.dataTransfer.files));
    };

    const handleInputFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(event.target.files || []));
    };

    return (
        <div
            data-dropzone
            onDragOver={handleDragIn}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragEnd={handleDragOut}
            onDrop={handleDrop}
            className={cx(
                "relative flex flex-col items-center gap-3 rounded-xl bg-primary px-6 py-4 text-tertiary ring-1 ring-secondary transition duration-100 ease-linear ring-inset",
                isDraggingOver && "ring-2 ring-brand",
                isDisabled && "cursor-not-allowed bg-secondary",
                className,
            )}
        >
            <FeaturedIcon icon={UploadCloud02} color="gray" theme="modern" size="md" className={cx(isDisabled && "opacity-50")} />

            <div className="flex flex-col gap-1 text-center">
                <div className="flex justify-center gap-1 text-center">
                    <input
                        ref={inputRef}
                        id={id}
                        type="file"
                        className="peer sr-only"
                        disabled={isDisabled}
                        accept={accept}
                        multiple={allowsMultiple}
                        onChange={handleInputFileChange}
                    />
                    {/*
                     * The focus ring, added here. The input is `sr-only` — right,
                     * because that keeps it in the tab order and lets a label and a
                     * real button stand in for the browser's own control — but the
                     * kit marks it `peer` and then never reads that, so reaching the
                     * drop zone by keyboard moved focus somewhere invisible. The
                     * ring is the same one every button in the kit draws
                     * (button-styles.ts), on the label, because the label is what
                     * you can see.
                     */}
                    <label
                        htmlFor={id}
                        className="flex cursor-pointer rounded-md outline-focus-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                    >
                        {/*
                         * tabIndex -1, and no onClick. The label already
                         * forwards a click to the input above, so this button was
                         * a second tab stop that opened the same picker — and a
                         * screen reader named the upload control twice. The input
                         * is the control; this is what you see of it.
                         */}
                        <Button color="link-color" size="md" isDisabled={isDisabled} tabIndex={-1}>
                            Click to upload <span className="md:hidden">and attach files</span>
                        </Button>
                    </label>
                    <span className="text-sm max-md:hidden">or drag and drop</span>
                </div>
                <p className={cx("text-xs transition duration-100 ease-linear", isInvalid && "text-error-primary")}>
                    {hint || "SVG, PNG, JPG or GIF (max. 800x400px)"}
                </p>
            </div>
        </div>
    );
};

/**
 * Where a chosen file has got to: being read, read, waiting on an answer, or
 * refused. `attention` is the one that is not a failure: the file arrived and
 * was parsed, something about it still has to be settled, so it is drawn in
 * the warning colour and does not put an error ring around the row.
 */
export type FileUploadStatus = "busy" | "ready" | "attention" | "failed";

export interface FileUploadListItemProps {
    /** The file's name, as the person chose it. */
    name: string;
    /** The file's size in bytes, where it is known. */
    size?: number;
    status: FileUploadStatus;
    /** What is happening to it, in words: "Reading…", "Ready", "Could not be read". */
    statusLabel: string;
    /** Takes the file back off. Without one, no button is drawn. */
    onRemove?: () => void;
    /** What that button says, for the tooltip and for a screen reader. */
    removeLabel?: string;
    className?: string;
}

/**
 * One chosen file, with what is happening to it.
 *
 * The status is drawn and written both: an icon beside a word, never a colour
 * on its own, because "failed" as a red ring is not readable to everybody
 * (R-A11Y-001). While it is busy the row is a live region, so the spinner is
 * heard as well as seen.
 */
export const FileUploadListItem = ({ name, size, status, statusLabel, onRemove, removeLabel = "Remove", className }: FileUploadListItemProps) => (
    <li
        className={cx(
            "flex items-start gap-3 rounded-xl bg-primary p-4 ring-1 ring-secondary ring-inset",
            status === "failed" && "ring-2 ring-error",
            className,
        )}
    >
        <FeaturedIcon
            icon={File02}
            color={status === "failed" ? "error" : status === "attention" ? "warning" : "gray"}
            theme="modern"
            size="md"
            className="shrink-0"
        />

        <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-medium text-secondary">{name}</p>
            <div className="mt-0.5 flex items-center gap-2" aria-live={status === "busy" ? "polite" : undefined}>
                {size === undefined ? null : (
                    <>
                        <p className="text-sm whitespace-nowrap text-tertiary">{getReadableFileSize(size)}</p>
                        <hr className="h-3 w-px rounded-full border-none bg-border-primary" />
                    </>
                )}
                <div className="flex min-w-0 items-center gap-1.5">
                    {status === "busy" ? <LoadingIndicator size="sm" className="shrink-0 [&_svg]:size-4" /> : null}
                    {status === "ready" ? <CheckCircle aria-hidden="true" className="size-4 shrink-0 stroke-[2.5px] text-fg-success-primary" /> : null}
                    {status === "attention" ? <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-fg-warning-primary" /> : null}
                    {status === "failed" ? <XCircle aria-hidden="true" className="size-4 shrink-0 text-fg-error-primary" /> : null}
                    {/*
                     * `attention` says its piece in the ordinary text colour, not
                     * in yellow: the warning token is yellow-600, which measures
                     * 2.94:1 on this row's white and misses AA for text by a
                     * distance no weight makes up. The icon beside it carries the
                     * colour, the words carry the meaning, and the words are the
                     * ones that have to be readable (R-A11Y-001).
                     */}
                    <p className={cx("truncate text-sm font-medium", status === "failed" ? "text-error-primary" : "text-tertiary")}>{statusLabel}</p>
                </div>
            </div>
        </div>

        {onRemove ? (
            <ButtonUtility color="tertiary" size="xs" icon={Trash01} tooltip={removeLabel} className="-mt-1 -mr-1 shrink-0" onClick={onRemove} />
        ) : null}
    </li>
);

/** The list the rows sit in. One file here, but a list is what a row belongs to. */
export const FileUploadList = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <ul className={cx("flex flex-col gap-3", className)}>{children}</ul>
);
