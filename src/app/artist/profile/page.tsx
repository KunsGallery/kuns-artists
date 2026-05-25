"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import R2ImageUploadField from "@/components/shared/R2ImageUploadField";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import { buildArtistPublicUrl } from "@/lib/shareCards";
import { normalizeExternalUrl } from "@/lib/url";
import { updateArtistProfile } from "@/lib/firebase/firestore";

type FormState = {
  name: string;
  nameKo: string;
  tagline: string;
  bio: string;
  bioEn: string;
  location: string;
  profileImageUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  cvUrl: string;
  artsyUrl: string;
  websiteUrl: string;
};

const initialForm: FormState = {
  name: "",
  nameKo: "",
  tagline: "",
  bio: "",
  bioEn: "",
  location: "",
  profileImageUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  cvUrl: "",
  artsyUrl: "",
  websiteUrl: "",
};

type BadgeTone = "required" | "recommended" | "optional";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.28em] text-neutral-400">
          {title}
        </p>
        <p className="max-w-2xl text-sm leading-7 text-neutral-600">
          {description}
        </p>
      </div>

      <div className="space-y-5">{children}</div>
    </section>
  );
}

function FieldBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: BadgeTone;
}) {
  const styles = {
    required: "border-[#F37021]/35 bg-[#F37021]/10 text-[#B85D18]",
    recommended: "border-[#d8c8a0] bg-[#f6f0e3] text-[#7a6640]",
    optional: "border-black/8 bg-[#f4f1ea] text-neutral-500",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-[0.18em] ${styles}`}
    >
      {children}
    </span>
  );
}

function FieldLabel({
  label,
  badge,
  badgeTone,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
        {label}
      </span>
      {badge ? <FieldBadge tone={badgeTone ?? "optional"}>{badge}</FieldBadge> : null}
    </div>
  );
}

function InputField({
  label,
  badge,
  badgeTone,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
      />
    </label>
  );
}

function TextareaField({
  label,
  badge,
  badgeTone,
  value,
  rows,
  placeholder,
  onChange,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[1.35rem] border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-8 text-neutral-900 outline-none transition focus:border-black/20"
      />
    </label>
  );
}

function LinkField({
  label,
  badge,
  badgeTone,
  value,
  placeholder,
  onChange,
  description,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  description: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
      />
      <p className="mt-2 text-[12px] leading-6 text-neutral-500">{description}</p>
    </label>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] bg-[#f7f6f2] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-neutral-600">
        {value}
      </p>
    </div>
  );
}

function PreviewLabel({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-black/8 bg-[#fcfbf8] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{value}</p>
    </div>
  );
}

export default function ArtistProfilePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [copyErrorMessage, setCopyErrorMessage] = useState("");
  const { artist, uid, isLoading, errorMessage: accessErrorMessage } =
    useProtectedArtist({
      fallbackErrorMessage: "작가 정보를 불러오는 중 오류가 발생했습니다.",
    });

  useEffect(() => {
    if (!artist) {
      return;
    }

    setForm({
      name: artist.name || "",
      nameKo: artist.nameKo || "",
      tagline: artist.tagline || "",
      bio: artist.bio || "",
      bioEn: artist.bioEn || "",
      location: artist.location || "",
      profileImageUrl: artist.profileImageUrl || "",
      instagramUrl: artist.instagramUrl || "",
      youtubeUrl: artist.youtubeUrl || "",
      cvUrl: artist.cvUrl || "",
      artsyUrl: artist.artsyUrl || "",
      websiteUrl: artist.websiteUrl || "",
    });
  }, [artist]);

  const publicArtistUrl = artist?.slug?.trim()
    ? buildArtistPublicUrl(artist.slug)
    : "";
  const publicArtistUrlDisplay = publicArtistUrl.replace(/^https?:\/\//, "");
  const profileImageUrl = form.profileImageUrl.trim();
  const externalLinkCount = useMemo(() => {
    return [
      form.instagramUrl,
      form.youtubeUrl,
      form.cvUrl,
      form.artsyUrl,
      form.websiteUrl,
    ].filter((value) => Boolean(normalizeExternalUrl(value))).length;
  }, [
    form.artsyUrl,
    form.cvUrl,
    form.instagramUrl,
    form.websiteUrl,
    form.youtubeUrl,
  ]);

  const isPublicPageReady = Boolean(publicArtistUrl);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  async function handleSave() {
    try {
      if (!uid) {
        throw new Error("로그인 정보가 없습니다.");
      }

      setIsSaving(true);
      setSaveMessage("");
      setSaveErrorMessage("");

      await updateArtistProfile(uid, {
        name: form.name,
        nameKo: form.nameKo,
        tagline: form.tagline,
        bio: form.bio,
        bioEn: form.bioEn,
        location: form.location,
        profileImageUrl: form.profileImageUrl,
        instagramUrl: form.instagramUrl,
        youtubeUrl: form.youtubeUrl,
        cvUrl: form.cvUrl,
        artsyUrl: form.artsyUrl,
        websiteUrl: form.websiteUrl,
      });

      setSaveMessage("프로필이 저장되었습니다.");
    } catch {
      setSaveMessage("");
      setSaveErrorMessage(
        "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyPublicLink() {
    if (!publicArtistUrl) {
      setCopyMessage("");
      setCopyErrorMessage("공개 페이지 주소를 준비 중입니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicArtistUrl);
      setCopyMessage("공개 작가 페이지 링크가 복사되었습니다.");
      setCopyErrorMessage("");
    } catch {
      setCopyMessage("");
      setCopyErrorMessage(
        "링크 복사에 실패했습니다. URL을 직접 복사해주세요."
      );
    }
  }

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
            >
              KÜN’S GALLERY
            </Link>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href="/artist/dashboard"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                대시보드로 돌아가기
              </Link>

              {isPublicPageReady ? (
                <Link
                  href={publicArtistUrl}
                  className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
                >
                  공개 페이지 열기
                </Link>
              ) : (
                <span className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#f7f6f2] px-5 text-sm text-neutral-500">
                  공개 페이지 주소를 준비 중입니다.
                </span>
              )}

              <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
                로그아웃
              </LogoutButton>
            </div>
          </header>

          <div className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Profile
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                프로필 관리
              </h1>

              <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                공개 작가 페이지에 표시될 소개, 이미지, 외부 링크를 관리합니다.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-500">
                저장한 내용은 공개 작가 페이지에 반영됩니다.
              </p>
            </div>

            <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                현재 상태
              </p>

              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="공개 페이지 주소"
                  value={
                    isLoading
                      ? "불러오는 중..."
                      : isPublicPageReady
                        ? publicArtistUrlDisplay
                        : "공개 페이지 주소를 준비 중입니다."
                  }
                />

                <SummaryRow
                  label="프로필 이미지"
                  value={profileImageUrl ? "등록됨" : "미등록"}
                />

                <SummaryRow
                  label="외부 링크"
                  value={`${externalLinkCount}개 입력됨`}
                />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionCard
            title="1. Basic Profile"
            description="공개 페이지에 표시될 작가명을 확인합니다."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="작가명"
                badge="필수"
                badgeTone="required"
                value={form.name}
                placeholder="영문 또는 활동명"
                onChange={(value) => handleChange("name", value)}
              />
              <InputField
                label="작가명(한글)"
                badge="필수"
                badgeTone="required"
                value={form.nameKo}
                placeholder="한글 표기"
                onChange={(value) => handleChange("nameKo", value)}
              />
            </div>

            <InputField
              label="한줄 소개"
              badge="권장"
              badgeTone="recommended"
              value={form.tagline}
              placeholder="짧은 한줄 소개"
              onChange={(value) => handleChange("tagline", value)}
            />

            <InputField
              label="활동 지역"
              badge="권장"
              badgeTone="recommended"
              value={form.location}
              placeholder="Seoul, Korea"
              onChange={(value) => handleChange("location", value)}
            />
          </SectionCard>

          <SectionCard
            title="2. Biography"
            description="작가 소개는 공개 작가 페이지의 중심 문장으로 사용됩니다."
          >
            <TextareaField
              label="국문 소개"
              badge="권장"
              badgeTone="recommended"
              value={form.bio}
              rows={10}
              placeholder="작가의 작업 세계, 주요 주제, 매체, 태도 등을 소개해주세요."
              onChange={(value) => handleChange("bio", value)}
            />

            <TextareaField
              label="영문 소개"
              badge="권장"
              badgeTone="recommended"
              value={form.bioEn}
              rows={10}
              placeholder="Introduce the artist’s practice, themes, media, and approach."
              onChange={(value) => handleChange("bioEn", value)}
            />
          </SectionCard>

          <SectionCard
            title="3. Profile Image"
            description="공개 페이지와 공유 카드에 표시될 대표 이미지를 업로드해주세요."
          >
            <R2ImageUploadField
              label="프로필 이미지"
              description="프로필 이미지는 업로드하거나 URL로 직접 입력할 수 있습니다. 저장 버튼을 누르면 공개 페이지에 반영됩니다."
              value={form.profileImageUrl}
              onChange={(value) => handleChange("profileImageUrl", value)}
              target="profile"
              artistSlug={artist?.slug}
              disabled={isSaving || isLoading}
            />
          </SectionCard>

          <SectionCard
            title="4. External Links"
            description="Instagram, Website, CV, Artsy 등 외부 링크를 연결할 수 있습니다."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <LinkField
                label="Instagram"
                badge="선택"
                badgeTone="optional"
                value={form.instagramUrl}
                placeholder="instagram.com/yourname"
                onChange={(value) => handleChange("instagramUrl", value)}
                description="공개 작가 페이지의 Instagram 버튼으로 표시됩니다."
              />
              <LinkField
                label="YouTube"
                badge="선택"
                badgeTone="optional"
                value={form.youtubeUrl}
                placeholder="youtube.com/@yourchannel"
                onChange={(value) => handleChange("youtubeUrl", value)}
                description="공개 작가 페이지의 YouTube 버튼으로 표시됩니다."
              />
              <LinkField
                label="CV"
                badge="선택"
                badgeTone="optional"
                value={form.cvUrl}
                placeholder="your-cv-link"
                onChange={(value) => handleChange("cvUrl", value)}
                description="공개 작가 페이지의 CV 버튼으로 표시됩니다."
              />
              <LinkField
                label="Artsy"
                badge="선택"
                badgeTone="optional"
                value={form.artsyUrl}
                placeholder="artsy.net/artist/..."
                onChange={(value) => handleChange("artsyUrl", value)}
                description="공개 작가 페이지의 Artsy 버튼으로 표시됩니다."
              />
              <LinkField
                label="Website"
                badge="선택"
                badgeTone="optional"
                value={form.websiteUrl}
                placeholder="your-studio-site.com"
                onChange={(value) => handleChange("websiteUrl", value)}
                description="공개 작가 페이지의 Website 버튼으로 표시됩니다."
              />
            </div>

            <p className="text-sm leading-6 text-neutral-500">
              https:// 없이 입력해도 공개 페이지에서는 자동 보정됩니다.
            </p>
          </SectionCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <SectionCard
            title="5. Public Page Preview"
            description="저장 후 공개 작가 페이지에서 보일 기본 정보를 미리 확인합니다."
          >
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-[#f7f6f2]">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="프로필 이미지 미리보기"
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full flex-col justify-between bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,246,242,0.96)),radial-gradient(circle_at_25%_20%,rgba(243,112,33,0.16),transparent_30%)] p-5">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.34em] text-neutral-400">
                        Profile preview
                      </p>
                      <p className="text-sm leading-7 text-neutral-500">
                        대표 이미지를 업로드하면 미리보기가 더 선명해집니다.
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div className="h-16 w-16 rounded-full border border-black/8 bg-white/70" />
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        KÜN’S Gallery
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    작가명
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                    {form.name.trim() || "작가명"}
                  </p>
                </div>

                <p className="text-sm leading-7 text-neutral-600">
                  {form.nameKo.trim() || "한글 표기"}
                </p>

                <p className="text-sm leading-7 text-neutral-500">
                  {form.tagline.trim() ||
                    "공개 페이지에 표시될 짧은 소개를 입력해주세요."}
                </p>

                <PreviewLabel
                  label="활동 지역"
                  value={form.location.trim() || "미입력"}
                />
                <PreviewLabel
                  label="외부 링크"
                  value={`${externalLinkCount}개`}
                />

                <PreviewLabel
                  label="공개 페이지 주소"
                  value={
                    isPublicPageReady
                      ? publicArtistUrlDisplay
                      : "공개 페이지 주소를 준비 중입니다."
                  }
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {isPublicPageReady ? (
                  <Link
                    href={publicArtistUrl}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-black/10 bg-[#f7f6f2] px-5 text-sm text-neutral-900 transition hover:border-black/20"
                  >
                    공개 페이지 열기
                  </Link>
                ) : (
                  <span className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-black/10 bg-[#f7f6f2] px-5 text-sm text-neutral-500">
                    공개 페이지 주소를 준비 중입니다.
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => void handleCopyPublicLink()}
                  disabled={!isPublicPageReady}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
                >
                  링크 복사
                </button>
              </div>

              {copyMessage ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800"
                >
                  {copyMessage}
                </div>
              ) : null}

              {copyErrorMessage ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800"
                >
                  {copyErrorMessage}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="저장"
            description="프로필 저장 버튼을 누르면 수정한 내용이 반영됩니다."
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoading}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
              >
                {isSaving ? "저장 중..." : "프로필 저장"}
              </button>
            </div>

            {saveMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800"
              >
                <p>{saveMessage}</p>
                <p className="mt-2 text-emerald-700">
                  저장한 내용은 공개 작가 페이지에 반영됩니다.
                </p>
              </div>
            ) : null}

            {saveErrorMessage ? (
              <div
                role="alert"
                className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700"
              >
                {saveErrorMessage}
              </div>
            ) : null}
          </SectionCard>

          {accessErrorMessage ? (
            <div
              role="alert"
              className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700"
            >
              {accessErrorMessage}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
