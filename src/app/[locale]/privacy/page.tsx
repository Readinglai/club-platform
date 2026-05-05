import { setRequestLocale } from "next-intl/server";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="max-w-3xl mx-auto px-4 py-20 sm:py-28 flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wide" style={{ color: PRIMARY }}>
            Privacy Policy
          </h1>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: SECONDARY }} />
          <p className="text-sm text-gray-500">ROCSAUT &mdash; Last updated: May 4, 2026</p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">

          <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              Introduction
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              ROCSAUT (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the ROCSAUT mobile application
              and website. This Privacy Policy explains how we collect, use, and protect your personal
              information when you use our services.
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              Information We Collect
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              When you create an account or sign in with Google, we collect the following information:
            </p>
            <ul className="flex flex-col gap-2 mt-1">
              {[
                { label: "Email address", desc: "used to identify your account and send club notifications" },
                { label: "Full name", desc: "displayed on your member profile within the club" },
                { label: "Profile photo", desc: "your Google account avatar, shown on your profile" },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SECONDARY }} />
                  <span><span className="font-medium" style={{ color: PRIMARY }}>{label}</span> &mdash; {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              How We Use Your Information
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              Your information is used solely for internal club management purposes, including:
            </p>
            <ul className="flex flex-col gap-2 mt-1">
              {[
                "Authenticating your identity when you sign in",
                "Displaying your profile to other club members",
                "Sending club announcements and event notifications",
                "Managing membership roles and permissions",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SECONDARY }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              Data Sharing
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              We do <span className="font-semibold" style={{ color: PRIMARY }}>not</span> sell, trade, or share your
              personal information with any third parties. Your data is accessible only to club administrators
              and is used exclusively for internal club operations.
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              Data Retention
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              We retain your account information for as long as your membership is active. If you wish to
              have your data removed, please contact us at the email address below and we will delete your
              account within 30 days.
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              Contact Us
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              If you have any questions or concerns about this Privacy Policy, please contact us:
            </p>
            <a
              href="mailto:flyincloud2001@gmail.com"
              className="text-sm font-medium hover:underline"
              style={{ color: PRIMARY }}
            >
              flyincloud2001@gmail.com
            </a>
          </section>

        </div>
      </div>
    </main>
  );
}
