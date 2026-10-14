"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const ticketTypes = [
  {
    id: "LITE",
    en: "Tier 1 — Lite",
    zh: "Tier 1 — 基本票",
    enSubtitle: "2 drinks",
    zhSubtitle: "2 杯酒",
    price: 25,
  },
  {
    id: "STANDARD",
    en: "Tier 2 — Standard",
    zh: "Tier 2 — 標準票",
    enSubtitle: "4 drinks",
    zhSubtitle: "4 杯酒",
    price: 40,
  },
  {
    id: "UNLIMITED",
    en: "Tier 3 — Unlimited",
    zh: "Tier 3 — 無限暢飲",
    enSubtitle: "Unlimited drinks + 1 photo booth picture",
    zhSubtitle: "酒無限暢飲＋拍貼照一張",
    price: 45,
  },
];

// Stripe rejects checkout if any metadata value is over 500 characters
// (name, email, phone, member ID and card name are all sent as metadata).
const MAX_LENGTH = {
  name: 100,
  email: 254,
  phone: 25,
  memberId: 50,
  cardName: 100,
};

const activities = [
  {
    emoji: "🧩",
    enTitle: "Halloween Human Bingo",
    zhTitle: "Halloween Human Bingo",
    enDescription:
      "Meet new people and find someone who matches each square on your Bingo card!",
    zhDescription: "找到符合 Bingo 格子條件的人，完成挑戰、認識新朋友！",
  },
  {
    emoji: "🀄",
    enTitle: "Mahjong",
    zhTitle: "麻將 Mahjong",
    enDescription: "Gather around for a game of Mahjong.",
    zhDescription: "一起打麻將！",
  },
  {
    emoji: "🃏",
    enTitle: "Card Games",
    zhTitle: "撲克牌",
    enDescription: "Enjoy card games with friends.",
    zhDescription: "和朋友一起玩牌！",
  },
  {
    emoji: "🎃",
    enTitle: "Big Pumpkin Carving",
    zhTitle: "大南瓜雕刻",
    enDescription: "Get creative and carve a Halloween pumpkin!",
    zhDescription: "一起雕刻大南瓜，發揮創意！",
  },
  {
    emoji: "🍬",
    enTitle: "Guess the Candy Corn in the Jar",
    zhTitle: "猜糖果數量",
    enDescription: "Guess how many candies are in the jar.",
    zhDescription: "猜猜罐子裡有多少顆糖果！",
  },
  {
    emoji: "🏆",
    enTitle: "Halloween Costume Contest",
    zhTitle: "萬聖節服裝比賽",
    enDescription: "Vote for the best costume to win a special prize!",
    zhDescription: "大家投票選出最佳造型，贏取特別獎品！",
  },
];

export default function Fall2026EventPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentSuccess = searchParams.get("payment") === "success";

  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [cardName, setCardName] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  // The field the checkout button just sent the user to (briefly outlined).
  const [missingField, setMissingField] = useState<string | null>(null);
  const missingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = ticketTypes.find((ticket) => ticket.id === selectedTicket);
  const discount = isMember && isVerified ? 5 : 0;
  const total = selected ? Math.max(0, selected.price - discount) : 0;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validPhone = /^[+()\d\s.-]{7,25}$/.test(phone.trim());

  const withinLimits =
    name.trim().length <= MAX_LENGTH.name &&
    email.trim().length <= MAX_LENGTH.email &&
    phone.trim().length <= MAX_LENGTH.phone &&
    memberId.trim().length <= MAX_LENGTH.memberId &&
    cardName.trim().length <= MAX_LENGTH.cardName;

  const canContinue = Boolean(
    selectedTicket &&
      withinLimits &&
      name.trim() &&
      validEmail &&
      validPhone &&
      waiverAccepted &&
      (!isMember || isVerified)
  );

  const t = {
    switchLanguage: isZh ? "English" : "繁體中文",
    intro: isZh
      ? "一年一度的 Halloween Condo Party 來啦！🎃"
      : "The annual Halloween Condo Party is here! 🎃",
    introText: isZh
      ? "快揪朋友一起來感受萬聖節氛圍，順便慶祝考完 midterm，一起度過一個最酷的 Halloween 吧！👻🕸️✨"
      : "Grab your friends, celebrate finishing midterms, and join us for a night full of Halloween vibes, games, drinks, and new friends!",
    activitiesIntro: isZh
      ? "今年我們準備了超多 Halloween 活動，讓大家邊玩邊認識新朋友！🎉"
      : "We’ve prepared tons of Halloween activities for you to enjoy throughout the night!",
    activities: isZh ? "🎃 萬聖節活動" : "🎃 Halloween Activities",
    costumeNote: isZh
      ? "當天將由參加者一起進行投票，最佳造型勝出者可以獲得特別獎品！"
      : "Attendees will vote on the night — the best costume wins a special prize!",
    time: isZh ? "時間" : "Time",
    location: isZh ? "地點" : "Location",
    dressCode: "Dress Code",
    costume: isZh ? "萬聖節服裝" : "Halloween Costume",
    tickets: isZh ? "💰 票價" : "💰 Ticket Tiers",
    member: isZh ? "ROCSAUT 會員" : "ROCSAUT Member",
    regular: isZh ? "一般票價" : "Regular",
    memberDiscount: isZh
      ? "驗證 ROCSAUT 會員身分即可享每張 $5 折扣。"
      : "Verify your ROCSAUT membership to receive $5 off your ticket.",
    oneMemberTicket: isZh
      ? "⚠️ 每位 ROCSAUT 會員限購一張會員優惠票。"
      : "⚠️ Each ROCSAUT member may purchase only one ticket at the member-discounted price.",
    upgrade: isZh
      ? "⬆️ 當天覺得喝不夠？現場可以加價升級 Tier！"
      : "⬆️ Want more drinks? You can upgrade your ticket tier at the door!",
    noRefund: isZh
      ? "報名完成後恕不退費。"
      : "All ticket sales are final. No refunds.",
    limited: isZh ? "名額有限，額滿為止。" : "Spots are limited and available while supplies last.",
    cleaningFee: isZh
      ? "嘔吐落地或造成廁所馬桶堵塞，將收取 $200 清潔費。"
      : "A $200 cleaning fee will apply for vomiting on the floor or clogging toilets.",
    chooseTicket: isZh ? "1. 選擇票種" : "1. Choose your ticket",
    chooseTicketHelp: isZh
      ? "請選擇你想購買的票種。"
      : "Choose the ticket option you would like to purchase.",
    personalInfo: isZh ? "2. 個人資料" : "2. Your information",
    personalInfoHelp: isZh
      ? "請填寫與你的活動門票相關的資料。"
      : "Enter the information that will be associated with your ticket.",
    fullName: isZh ? "姓名" : "Full Name",
    email: isZh ? "電子郵件" : "Email",
    phone: isZh ? "電話號碼" : "Phone Number",
    memberSection: isZh ? "3. 會員驗證" : "3. Membership",
    notMember: isZh
      ? "還不是會員？立即在這裡註冊"
      : "Not a member? Sign up here",
    memberCheckbox: isZh
      ? "我是 ROCSAUT 會員"
      : "I am a ROCSAUT member",
    memberHelp: isZh
      ? "請輸入 Member ID 及會員卡上的姓名，以驗證會員票價。"
      : "Enter your Member ID and the name on your member card to verify the member price.",
    memberId: "Member ID",
    cardName: isZh ? "會員卡上的姓名" : "Name on Member Card",
    verify: isZh ? "驗證會員資格" : "Verify Membership",
    verifying: isZh ? "驗證中…" : "Verifying…",
    verified: isZh ? "會員驗證成功" : "Membership verified",
    verifiedHelp: isZh
      ? "已套用會員票價。"
      : "Your member price has been applied.",
    agreement: isZh ? "4. 報名須知與確認" : "4. Policies and confirmation",
    waiverConfirm: isZh
      ? "我已閱讀並同意活動條款及相關規定。"
      : "I have read and agree to the event waiver and policies.",
    viewWaiver: isZh ? "閱讀活動條款" : "Read event waiver",
    summary: isZh ? "訂單摘要" : "Order Summary",
    chooseFirst: isZh ? "請先選擇票種" : "Please select a ticket",
    subtotal: isZh ? "票價" : "Ticket price",
    discountLabel: isZh ? "會員折扣" : "Member discount",
    total: isZh ? "總計" : "Total",
    continue: isZh ? "前往付款" : "Continue to Payment",
    processing: isZh ? "處理中…" : "Processing…",
    completeFields: isZh
      ? "請完成所有欄位、會員驗證及必要確認。"
      : "Complete all fields, membership verification, and required confirmations.",
    paymentNote: isZh
      ? "點擊後將前往 Stripe 安全付款頁面。"
      : "You will be redirected to Stripe’s secure checkout page.",
    successTitle: isZh ? "付款完成！🎃" : "Payment successful! 🎃",
    successText: isZh
      ? "感謝報名 Halloween Condo Party！請留意電子郵件中的門票資訊。"
      : "Thanks for signing up for the Halloween Condo Party! Check your email for your ticket details.",
    spamNote: isZh
      ? "如果沒有收到確認信，請檢查垃圾郵件或促銷郵件資料夾。"
      : "If you don’t see the confirmation email, check your Spam or Junk folder.",
    backToEvent: isZh ? "返回活動頁面" : "Back to Event Page",
  };

  const switchLanguage = () => {
    const targetLocale = isZh ? "en" : "zh";
    const query = searchParams.toString();
    const destination = query ? `${pathname}?${query}` : pathname;
    router.replace(destination, { locale: targetLocale });
  };

  const handleMemberToggle = (checked: boolean) => {
    setIsMember(checked);
    setIsVerified(false);
    setMemberId("");
    setCardName("");
    setVerificationMessage("");
    setVerificationError("");
  };

  const handleVerify = async () => {
    setVerificationMessage("");
    setVerificationError("");

    if (!memberId.trim() || !cardName.trim()) {
      setVerificationError(
        isZh
          ? "請輸入 Member ID 和會員卡上的姓名。"
          : "Please enter your Member ID and the name on your member card."
      );
      setIsVerified(false);
      return;
    }

    setVerifying(true);
    setIsVerified(false);

    try {
      const response = await fetch("/api/event/member-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: memberId.trim(),
          cardName: cardName.trim(),
        }),
      });

      const data = await response.json();


      if (!response.ok || !data.verified) {
        setIsVerified(false);

        const alreadyUsedMessage =
          "This Member ID has already used member pricing for this event. Each member may purchase only one discounted ticket.";

        setVerificationError(
          isZh && data.message === alreadyUsedMessage
            ? "此會員編號已使用過本次活動的會員優惠。每位會員限購一張會員優惠票。"
            : data.message ||
                (isZh
                  ? "會員驗證失敗，請確認資料後再試。"
                  : "Membership verification failed. Please check your details and try again.")
        );

        return;
      }


      setIsVerified(true);
      setVerificationMessage(t.verifiedHelp);
    } catch (error) {
      console.error("Member verification error:", error);
      setIsVerified(false);
      setVerificationError(
        isZh
          ? "目前無法驗證，請稍後再試。"
          : "Unable to verify right now. Please try again later."
      );
    } finally {
      setVerifying(false);
    }
  };

  // First thing still missing, in page order (element ids).
  const firstIncompleteField = (): string | null => {
    if (!selectedTicket) return "ticket-tier-LITE";
    if (!name.trim() || name.trim().length > MAX_LENGTH.name) return "ticket-name";
    if (!validEmail || email.trim().length > MAX_LENGTH.email) return "ticket-email";
    if (!validPhone || phone.trim().length > MAX_LENGTH.phone) return "ticket-phone";
    if (isMember && !isVerified) {
      if (!memberId.trim() || memberId.trim().length > MAX_LENGTH.memberId) return "member-id";
      if (!cardName.trim() || cardName.trim().length > MAX_LENGTH.cardName) return "member-card-name";
      return "member-verify";
    }
    if (!waiverAccepted) return "waiver-accept";
    return null;
  };

  const goToFirstIncomplete = () => {
    const id = firstIncompleteField();
    const el = id ? document.getElementById(id) : null;
    if (!id || !el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });

    setMissingField(id);
    if (missingTimerRef.current) clearTimeout(missingTimerRef.current);
    missingTimerRef.current = setTimeout(() => setMissingField(null), 2500);
  };

  // Red outline on whatever the checkout button pointed the user to.
  const missingClass = (id: string) =>
    missingField === id ? " ring-2 ring-red-500 ring-offset-2" : "";

  const handleCheckout = async () => {
    setCheckoutError("");

    if (!canContinue || !selectedTicket) {
      setCheckoutError(t.completeFields);
      goToFirstIncomplete();
      return;
    }

    setCheckingOut(true);

    try {
      const response = await fetch("/api/event/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          tier: selectedTicket,
          isMember,
          memberId: isMember ? memberId.trim() : null,
          cardName: isMember ? cardName.trim() : null,
          waiverAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCheckoutError(
          data.message ||
            (isZh
              ? "無法建立付款，請稍後再試。"
              : "Unable to start checkout. Please try again.")
        );
        return;
      }

      if (!data.checkoutUrl) {
        setCheckoutError(
          isZh
            ? "未收到付款連結，請聯絡活動主辦方。"
            : "No checkout URL was returned. Please contact the event organizers."
        );
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutError(
        isZh
          ? "目前無法建立付款，請稍後再試。"
          : "Unable to start checkout. Please try again later."
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#1a2744] outline-none focus:border-[#1a2744] focus:ring-2 focus:ring-[#1a2744]/10";

  if (paymentSuccess) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] px-4 py-16">

        <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mb-5 text-5xl">🎃</div>
          <h1 className="text-3xl font-bold text-[#1a2744]">
            {t.successTitle}
          </h1>
          <p className="mt-4 leading-7 text-gray-600">{t.successText}</p>
          <div className="mt-6 rounded-2xl bg-[#faf8f3] p-4 text-sm leading-6 text-[#1a2744]">
            {t.spamNote}
          </div>
          <button
            type="button"
            onClick={() => router.replace("/event/fall-2026")}
            className="mt-8 rounded-xl bg-[#1a2744] px-6 py-3 font-semibold text-white transition hover:bg-[#26395e]"
          >
            {t.backToEvent}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1a2744]">

      <section className="bg-[#1a2744] px-5 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#c9b99a]">
            ROCSAUT Events
          </p>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-[#c9b99a] sm:text-5xl">
            {isZh
              ? "2026 ROCSAUT 萬聖節派對"
              : "2026 ROCSAUT Halloween Party"}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/85 sm:text-lg">
            {t.intro}
          </p>
          <p className="mt-3 max-w-3xl leading-7 text-white/75">
            {t.introText}
          </p>

          <div className="mt-8 grid gap-4 border-t border-white/15 pt-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[#c9b99a]">{t.time}</p>
              <p className="mt-1 font-semibold">Oct 23, 2026</p>
              <p>7:30 PM – 11:30 PM</p>
            </div>
            <div>
              <p className="text-[#c9b99a]">{t.location}</p>
              <p className="mt-1 font-semibold">38 Grenville St., 2F</p>
            </div>
            <div>
              <p className="text-[#c9b99a]">{t.dressCode}</p>
              <p className="mt-1 font-semibold">👻 {t.costume} 👻</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <h2 className="text-lg font-bold">{t.chooseTicket}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {t.chooseTicketHelp}
              </p>

              <div className="mt-5 space-y-3">
                {ticketTypes.map((ticket) => {
                  const isSelected = selectedTicket === ticket.id;
                  const memberPrice = ticket.price - 5;

                  return (
                    <button
                      key={ticket.id}
                      id={`ticket-tier-${ticket.id}`}
                      type="button"
                      onClick={() => setSelectedTicket(ticket.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#1a2744] bg-[#f7f5f0] ring-1 ring-[#1a2744]"
                          : "border-gray-200 bg-white hover:border-gray-400"
                      }${missingClass("ticket-tier-LITE")}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-[#1a2744]"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="h-2.5 w-2.5 rounded-full bg-[#1a2744]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold">
                            {isZh ? ticket.zh : ticket.en}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {isZh ? ticket.zhSubtitle : ticket.enSubtitle}
                          </p>
                          <div className="mt-3 space-y-1 text-sm">
                            <p>
                              <span className="text-gray-500">
                                {t.member}:
                              </span>{" "}
                              <span className="font-semibold">
                                ${memberPrice}
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-500">
                                {t.regular}:
                              </span>{" "}
                              <span className="font-semibold">
                                ${ticket.price}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-sm font-medium">{t.upgrade}</p>
            </section>

            <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold">{t.activities}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {t.activitiesIntro}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {activities.map((activity) => (
                  <div
                    key={activity.enTitle}
                    className="flex gap-4 rounded-xl border border-gray-100 bg-[#fcfbf9] p-4"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {activity.emoji}
                    </span>
                    <div>
                      <h3 className="font-semibold">
                        {isZh ? activity.zhTitle : activity.enTitle}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {isZh
                          ? activity.zhDescription
                          : activity.enDescription}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-xl bg-[#faf8f3] p-4 text-sm leading-6">
                🌟 {t.costumeNote}
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <h2 className="text-lg font-bold">{t.personalInfo}</h2>
              <p className="mt-2 text-sm text-gray-500">{t.personalInfoHelp}</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="ticket-name" className="mb-2 block text-sm font-medium">
                    {t.fullName}
                  </label>
                  <input
                    id="ticket-name"
                    autoComplete="name"
                    maxLength={MAX_LENGTH.name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isZh ? "請輸入姓名" : "Your full name"}
                    className={inputClass + missingClass("ticket-name")}
                  />
                </div>

                <div>
                  <label htmlFor="ticket-email" className="mb-2 block text-sm font-medium">
                    {t.email}
                  </label>
                  <input
                    id="ticket-email"
                    type="email"
                    autoComplete="email"
                    maxLength={MAX_LENGTH.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass + missingClass("ticket-email")}
                  />
                  {email && !validEmail && (
                    <p className="mt-1 text-xs text-red-600">
                      {isZh
                        ? "請輸入有效的電子郵件地址。"
                        : "Please enter a valid email address."}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="ticket-phone" className="mb-2 block text-sm font-medium">
                    {t.phone}
                  </label>
                  <input
                    id="ticket-phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={MAX_LENGTH.phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={isZh ? "請輸入電話號碼" : "Your phone number"}
                    className={inputClass + missingClass("ticket-phone")}
                  />
                  {phone && !validPhone && (
                    <p className="mt-1 text-xs text-red-600">
                      {isZh
                        ? "請輸入有效的電話號碼。"
                        : "Please enter a valid phone number."}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <h2 className="text-lg font-bold">{t.memberSection}</h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {t.memberDiscount}
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-[#1a2744]">
                {t.oneMemberTicket}
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {isZh
                  ? "還不是會員？現在註冊，之後的活動也能享有會員優惠！"
                  : "Not a member? Sign up to enjoy member discounts at future events!"}{" "}
                <a
                  href="https://forms.gle/z9eU3aVh2rMCeX858"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#1a2744] underline underline-offset-4 hover:text-[#26395e]"
                >
                  {isZh ? "立即註冊" : "Sign up here"}
                </a>
              </p>

              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={(e) => handleMemberToggle(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#1a2744]"
                />
                <span className="text-sm font-medium">{t.memberCheckbox}</span>
              </label>

              {isMember && (
                <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                  <p className="text-sm leading-6 text-gray-500">{t.memberHelp}</p>

                  {!isVerified ? (
                    <>
                      <div>
                        <label htmlFor="member-id" className="mb-2 block text-sm font-medium">
                          {t.memberId}
                        </label>
                        <input
                          id="member-id"
                          maxLength={MAX_LENGTH.memberId}
                          value={memberId}
                          onChange={(e) => {
                            setMemberId(e.target.value);
                            setVerificationError("");
                            setVerificationMessage("");
                          }}
                          placeholder="OTSA-2026-XXXX"
                          className={inputClass + missingClass("member-id")}
                        />
                      </div>

                      <div>
                        <label htmlFor="member-card-name" className="mb-2 block text-sm font-medium">
                          {t.cardName}
                        </label>
                        <input
                          id="member-card-name"
                          maxLength={MAX_LENGTH.cardName}
                          value={cardName}
                          onChange={(e) => {
                            setCardName(e.target.value);
                            setVerificationError("");
                            setVerificationMessage("");
                          }}
                          placeholder={isZh ? "會員卡上的姓名" : "Name on your member card"}
                          className={inputClass + missingClass("member-card-name")}
                        />
                      </div>

                      <button
                        id="member-verify"
                        type="button"
                        onClick={handleVerify}
                        disabled={verifying}
                        className={`rounded-xl bg-[#1a2744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#26395e] disabled:cursor-not-allowed disabled:opacity-50${missingClass("member-verify")}`}
                      >
                        {verifying ? t.verifying : t.verify}
                      </button>

                      {verificationError && (
                        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                          {verificationError}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <p className="font-semibold text-green-800">✓ {t.verified}</p>
                      <p className="mt-1 text-sm text-green-700">
                        {verificationMessage || t.verifiedHelp}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <h2 className="text-lg font-bold">{t.agreement}</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowWaiver(true)}
                    className="text-sm font-semibold text-[#1a2744] underline underline-offset-4"
                  >
                    {t.viewWaiver}
                  </button>

                  <label className="mt-3 flex cursor-pointer items-start gap-3">
                    <input
                      id="waiver-accept"
                      type="checkbox"
                      checked={waiverAccepted}
                      onChange={(e) => setWaiverAccepted(e.target.checked)}
                      className={`mt-1 h-4 w-4 accent-[#1a2744]${missingClass("waiver-accept")}`}
                    />
                    <span className="text-sm leading-6">{t.waiverConfirm}</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-[#faf8f3] p-4 text-sm leading-6">
                <p className="font-semibold">
                  {isZh ? "重要報名須知" : "Important information"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
                  <li>{t.noRefund}</li>
                  <li>{t.limited}</li>
                  <li>{t.cleaningFee}</li>
                </ul>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="border-b border-gray-100 pb-4 text-lg font-bold">
                {t.summary}
              </h2>

              {!selected ? (
                <p className="py-6 text-sm text-gray-400">{t.chooseFirst}</p>
              ) : (
                <div className="space-y-4 py-5 text-sm">
                  <div>
                    <p className="font-semibold">
                      {isZh ? selected.zh : selected.en}
                    </p>
                    <p className="mt-1 text-gray-500">
                      {isZh ? selected.zhSubtitle : selected.enSubtitle}
                    </p>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">{t.subtotal}</span>
                    <span>${selected.price.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between gap-4 text-green-700">
                      <span>{t.discountLabel}</span>
                      <span>−${discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-gray-100 pt-4 text-base font-bold">
                    <span>{t.total}</span>
                    <span>${total.toFixed(2)} CAD</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkingOut}
                aria-disabled={!canContinue}
                className={`w-full rounded-xl bg-[#1a2744] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#26395e] disabled:cursor-not-allowed disabled:opacity-40${canContinue ? "" : " opacity-40"}`}
              >
                {checkingOut ? t.processing : t.continue}
              </button>

              {checkoutError && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">
                  {checkoutError}
                </p>
              )}

              {!canContinue && !checkoutError && (
                <p className="mt-4 text-xs leading-5 text-gray-500">
                  {t.completeFields}
                </p>
              )}

              <p className="mt-4 text-center text-xs leading-5 text-gray-400">
                {t.paymentNote}
              </p>
            </section>
          </aside>
        </div>
      </div>

      {showWaiver && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowWaiver(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waiver-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="waiver-title" className="text-xl font-bold">
              {isZh ? "活動條款與報名須知" : "Event Waiver and Policies"}
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-gray-600">
              <section>
                <h3 className="font-semibold text-[#1a2744]">
                  {isZh ? "1. 年齡規定" : "1. Age Requirement"}
                </h3>
                <p>
                  {isZh
                    ? "參加者必須年滿 19 歲，並在活動需要時出示有效身分證明。"
                    : "All attendees must be at least 19 years old and present valid identification when requested."}
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-[#1a2744]">
                  {isZh ? "2. 參與活動與個人責任" : "2. Participation and Personal Responsibility"}
                </h3>
                <p>
                  {isZh
                    ? "參加者應自行評估是否適合參加各項活動，並遵守主辦方及場地工作人員的合理指示。"
                    : "Attendees are responsible for deciding whether to participate in activities and must follow reasonable instructions from organizers and venue staff."}
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-[#1a2744]">
                  {isZh ? "3. 酒精飲品" : "3. Alcohol"}
                </h3>
                <p>
                  {isZh
                    ? "請理性飲酒，不得向未滿法定飲酒年齡者提供酒精飲品。主辦方可拒絕向疑似未達法定年齡或明顯醉酒者提供酒精飲品。"
                    : "Please drink responsibly. Alcohol must not be provided to anyone below the legal drinking age. Organizers may refuse alcohol service where legally required or when an attendee appears intoxicated."}
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-[#1a2744]">
                  {isZh ? "4. 場地與清潔" : "4. Venue and Cleaning"}
                </h3>
                <p>
                  {isZh
                    ? "請愛惜場地並保持環境整潔。因嘔吐落地或造成廁所馬桶堵塞而產生的清潔費為 $200。"
                    : "Please respect the venue and keep it clean. A $200 cleaning fee applies for vomiting on the floor or clogging toilets."}
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-[#1a2744]">
                  {isZh ? "5. 退款規定" : "5. Refund Policy"}
                </h3>
                <p>{t.noRefund}</p>
              </section>

              <section>
                <h3 className="font-semibold text-[#1a2744]">
                  {isZh ? "6. 活動規則" : "6. Event Rules"}
                </h3>
                <p>
                  {isZh
                    ? "如有不安全、違法、騷擾他人或破壞場地的行為，主辦方可要求相關參加者停止行為或離開場地。"
                    : "Organizers may ask attendees to stop unsafe, unlawful, harassing, or damaging behavior, or to leave the venue where appropriate."}
                </p>
              </section>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowWaiver(false)}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-[#1a2744]"
              >
                {isZh ? "關閉" : "Close"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWaiverAccepted(true);
                  setShowWaiver(false);
                }}
                className="rounded-xl bg-[#1a2744] px-5 py-3 text-sm font-semibold text-white"
              >
                {isZh ? "我已閱讀並同意" : "I have read and agree"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}