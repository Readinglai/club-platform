"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ImageUpload from "@/components/admin/ImageUpload";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface UserProfile {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  major: string | null;
  rocsautYear: number | null;
  instagram: string | null;
  linkedin: string | null;
}

interface ProfileFormProps {
  user: UserProfile;
  locale: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("profile");

  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [major, setMajor] = useState(user.major ?? "");
  const [rocsautYear, setRocsautYear] = useState<string>(
    user.rocsautYear != null ? String(user.rocsautYear) : ""
  );
  const [instagram, setInstagram] = useState(user.instagram ?? "");
  const [linkedin, setLinkedin] = useState(user.linkedin ?? "");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaveState("saving");
    setErrorMsg("");

    const body: Record<string, unknown> = {
      name,
      image,
      bio,
      major,
      instagram,
      linkedin,
    };

    const yearNum = parseInt(rocsautYear, 10);
    body.rocsautYear = rocsautYear === "" ? 0 : isNaN(yearNum) ? 0 : yearNum;

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 3000);
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? t("saveError"));
        setSaveState("error");
      }
    } catch {
      setErrorMsg(t("saveError"));
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Basic info */}
      <Card title={t("sectionBasic")}>
        <Field label={t("image")}>
          <ImageUpload
            value={image}
            onChange={setImage}
            uploadEndpoint="/api/upload"
            previewClassName="h-24 w-24 object-cover rounded-full"
            hint={t("imageHint")}
          />
        </Field>
        <Field label={t("name")}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
            required
          />
        </Field>
      </Card>

      {/* About */}
      <Card title={t("sectionAbout")}>
        <Field label={t("bio")}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-y"
            style={{ borderColor: "#d1d5db" }}
            placeholder={t("bioPlaceholder")}
          />
        </Field>
        <Field label={t("major")}>
          <input
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
            placeholder={t("majorPlaceholder")}
          />
        </Field>
        <Field label={t("rocsautYear")}>
          <input
            type="number"
            min={1}
            max={10}
            value={rocsautYear}
            onChange={(e) => setRocsautYear(e.target.value)}
            className="w-32 px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
            placeholder="1"
          />
        </Field>
      </Card>

      {/* Social */}
      <Card title={t("sectionSocial")}>
        <Field label="Instagram">
          <input
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
            placeholder="https://instagram.com/yourhandle"
          />
        </Field>
        <Field label="LinkedIn">
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </Field>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving" || !name.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {saveState === "saving" ? t("saving") : t("save")}
        </button>

        {saveState === "saved" && (
          <span className="text-sm font-medium" style={{ color: "#059669" }}>
            ✓ {t("saved")}
          </span>
        )}
        {saveState === "error" && (
          <span className="text-sm text-red-500">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm flex flex-col gap-5" style={{ border: "1px solid #e5e7eb" }}>
      <h2 className="text-base font-semibold" style={{ color: PRIMARY }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
