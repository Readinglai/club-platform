"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const ticketTypes = [
  {
    id: "LITE",
    title: "Tier 1 — Lite",
    subtitle: "2 drinks · 2 杯酒",
    price: 25,
  },
  {
    id: "STANDARD",
    title: "Tier 2 — Standard",
    subtitle: "4 drinks · 4 杯酒",
    price: 40,
  },
  {
    id: "UNLIMITED",
    title: "Tier 3 — Unlimited",
    subtitle:
      "Unlimited drinks + 1 photo booth picture · 無限暢飲＋拍貼照一張",
    price: 45,
  },
];

const activities = [
  {
    emoji: "🧩",
    title: "Halloween Human Bingo",
    description: "Meet new people through Bingo!",
    chinese: "玩 Bingo、認識新朋友！",
  },
  {
    emoji: "🀄",
    title: "Mahjong 麻將",
    description: "Gather around for a game of Mahjong.",
    chinese: "一起打麻將！",
  },
  {
    emoji: "🃏",
    title: "Card Games 撲克牌",
    description: "Enjoy card games with friends.",
    chinese: "和朋友一起玩牌！",
  },
  {
    emoji: "🎃",
    title: "Big Pumpkin Carving 大南瓜雕刻",
    description: "Get creative and carve a Halloween pumpkin!",
    chinese: "一起雕刻大南瓜，發揮創意！",
  },
  {
    emoji: "🧻",
    title: "Mummy Game 木乃伊遊戲",
    description: "Team up for a Halloween challenge.",
    chinese: "組隊挑戰木乃伊遊戲！",
  },
  {
    emoji: "🍬",
    title: "Guess the Candy Corn",
    description: "Guess how many candies are in the jar.",
    chinese: "猜猜罐子裡有多少顆糖果！",
  },
  {
    emoji: "🏆",
    title: "Halloween Costume Contest 萬聖節服裝比賽",
    description: "Vote for the best costume to win a special prize!",
    chinese: "大家投票選出最佳造型，贏取特別獎品！",
  },
];

export default function Fall2026EventPage() {
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const selected = ticketTypes.find(
    (ticket) => ticket.id === selectedTicket
  );

  const handleMemberToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;

    setIsMember(checked);
    setIsVerified(false);
    setMemberId("");
    setCardName("");
  };

  const handleVerify = async () => {
    if (!memberId.trim() || !cardName.trim()) {
      alert(
        "Please enter your Member ID and the name on your member card."
      );
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch("/api/event/member-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, cardName }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        alert(data.message || "Membership verification failed.");
      }
    } catch (error) {
      console.error("Member verification error:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckout = async () => {
    if (!canContinue || !selectedTicket || checkingOut) return;

    setCheckingOut(true);

    try {
      const response = await fetch("/api/event/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          tier: selectedTicket,
          isMember,
          memberId: isMember ? memberId : null,
          cardName: isMember ? cardName : null,
          ageConfirmed,
          waiverAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to start checkout.");
        return;
      }

      if (!data.checkoutUrl) {
        alert("Unable to start checkout. Please try again.");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setCheckingOut(false);
    }
  };

  const discount = isVerified && isMember ? 5 : 0;
  const total = selected
    ? Math.max(0, selected.price - discount)
    : 0;

  const canContinue = Boolean(
    selectedTicket &&
      name.trim() &&
      email.trim() &&
      phone.trim() &&
      ageConfirmed &&
      waiverAccepted &&
      (!isMember || isVerified)
  );

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm !text-gray-900 placeholder:!text-gray-400 outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744]";

  const sectionClass =
    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8";

  if (paymentSuccess) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4 py-10"
        style={{ backgroundColor: "#f9f7f4" }}
      >
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
              ✓
            </div>

            <h1
              className="text-2xl font-bold sm:text-3xl"
              style={{ color: PRIMARY }}
            >
              Thank you for registering! 🎉
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
              Your payment was successful.
            </p>

            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">
                  📩
                </div>

                <div>
                  <p className="font-bold text-amber-950">
                    Important: Check Your Spam / Junk Folder!
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-amber-900">
                    Your ticket confirmation email will arrive shortly. If you
                    cannot find it in your inbox, please check your{" "}
                    <strong className="font-extrabold">
                      Spam / Junk folder
                    </strong>{" "}
                    as well.
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-amber-900">
                    請留意垃圾郵件匣！如果收件匣沒有收到票券確認信，請記得檢查
                    <strong className="font-extrabold"> Spam / Junk（垃圾郵件）</strong>。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-[#faf8f3] p-4 text-left text-sm">
              <p className="mb-1 font-semibold" style={{ color: PRIMARY }}>
                Ticket delivery
              </p>
              <p className="leading-relaxed text-gray-600">
                Please keep your ticket email and have your ticket ready
                when you arrive at the event.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/event/fall-2026";
              }}
              className="mt-7 w-full rounded-xl py-3 text-sm font-semibold"
              style={{ backgroundColor: PRIMARY, color: SECONDARY }}
            >
              Back to Event Page
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Hero */}
      <section
        className="px-4 py-12 sm:py-16"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-xs uppercase tracking-[0.25em] sm:text-sm"
            style={{ color: SECONDARY }}
          >
            ROCSAUT Events · 2026
          </p>

          <h1
            className="text-3xl font-bold leading-tight sm:text-5xl"
            style={{ color: SECONDARY }}
          >
            🎃 Halloween Condo Party
          </h1>

          <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
            一年一度的 Halloween Condo Party 來啦！
          </h2>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
            Grab your friends, celebrate finishing midterms, and join us
            for a night full of Halloween vibes, games, drinks, and new
            friends!
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
            快揪朋友一起來感受萬聖節氛圍，順便慶祝考完 midterm，
            一起度過一個充滿遊戲、飲料和新朋友的 Halloween！
          </p>

          <div className="mt-7 grid gap-3 text-sm text-white sm:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs text-white/60">DATE & TIME 時間</p>
              <p className="mt-1 font-semibold">
                October 23 · 7:30–11:30 PM
              </p>
              <p className="mt-1 text-white/80">10/23 晚上 7:30–11:30</p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs text-white/60">LOCATION 地點</p>
              <p className="mt-1 font-semibold">38 Grenville St., 2F</p>
              <p className="mt-1 text-white/80">38 Grenville St. 二樓</p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs text-white/60">DRESS CODE 服裝</p>
              <p className="mt-1 font-semibold">Halloween Costume 👻</p>
              <p className="mt-1 text-white/80">萬聖節裝扮</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Activities */}
        <section className={`${sectionClass} mb-8`}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              What&apos;s happening
            </p>
            <h2 className="mt-1 text-2xl font-bold" style={{ color: PRIMARY }}>
              🎃 Halloween Activities
            </h2>
            <p className="mt-1 text-lg font-semibold" style={{ color: PRIMARY }}>
              萬聖節活動
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {activities.map((activity) => (
              <div
                key={activity.title}
                className="rounded-xl border border-gray-100 bg-[#faf8f3] p-3 sm:p-4"
              >
                <p
                  className="text-sm font-semibold leading-5 sm:text-base"
                  style={{ color: PRIMARY }}
                >
                  <span className="mr-1.5">{activity.emoji}</span>
                  {activity.title}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-gray-600 sm:text-sm">
                  {activity.description}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                  {activity.chinese}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {/* Tickets */}
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                1. Choose Your Ticket｜選擇票種
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                ROCSAUT members receive $5 off after membership verification.
                會員完成驗證後可享 $5 折扣。
              </p>

              <div className="mt-5 space-y-3">
                {ticketTypes.map((ticket) => {
                  const isSelected = selectedTicket === ticket.id;
                  const memberPrice = ticket.price - 5;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicket(ticket.id)}
                      aria-pressed={isSelected}
                      className="w-full rounded-xl p-4 text-left transition-colors"
                      style={{
                        border: `1px solid ${
                          isSelected ? SECONDARY : "#e5e7eb"
                        }`,
                        backgroundColor: isSelected ? "#faf8f3" : "#ffffff",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <div
                            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                            style={{
                              border: `2px solid ${
                                isSelected ? SECONDARY : "#d1d5db"
                              }`,
                            }}
                          >
                            {isSelected && (
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: SECONDARY }}
                              />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold" style={{ color: PRIMARY }}>
                              {ticket.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-gray-500">
                              {ticket.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold" style={{ color: PRIMARY }}>
                            ${ticket.price}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Member ${memberPrice}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl bg-[#faf8f3] p-4">
                <p className="font-semibold" style={{ color: PRIMARY }}>
                  ⬆️ Want more drinks?
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  You can upgrade your ticket tier at the door.
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  當天覺得喝不夠？現場可以加價升級 Tier！
                </p>
              </div>
            </section>

            {/* Personal information */}
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                2. Your Information｜個人資料
              </h2>
              <p className="mb-5 mt-1 text-sm text-gray-500">
                Please enter the information associated with your ticket.
                請填寫將與票券綁定的個人資料。
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    Name 姓名
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    Email 電子郵件
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    Phone 電話
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone number"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* Membership */}
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                3. Membership｜會員優惠
              </h2>

              <p className="mt-3 text-sm font-medium" style={{ color: PRIMARY }}>
                ROCSAUT members receive $5 off this event.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                ROCSAUT 會員可享本次活動 $5 折扣。
              </p>

              <p className="mt-3 text-sm text-gray-500">
                Not a member?{" "}
                <a
                  href="https://forms.gle/z9eU3aVh2rMCeX858"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                  style={{ color: PRIMARY }}
                >
                  Sign up here
                </a>{" "}
                for future member pricing.
              </p>

              <label className="mt-5 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={handleMemberToggle}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium" style={{ color: PRIMARY }}>
                  I am a ROCSAUT member｜我是 ROCSAUT 會員
                </span>
              </label>

              {isMember && (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  {!isVerified ? (
                    <>
                      <p className="mb-4 text-sm text-gray-500">
                        Enter your Member ID and the name on your member card.
                        請輸入會員編號及會員卡上的姓名。
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="memberId"
                            className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400"
                          >
                            Member ID
                          </label>
                          <input
                            id="memberId"
                            type="text"
                            value={memberId}
                            onChange={(e) => setMemberId(e.target.value)}
                            placeholder="OTSA-2026-XXXX"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="cardName"
                            className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400"
                          >
                            Name on Member Card
                          </label>
                          <input
                            id="cardName"
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="Your name"
                            className={inputClass}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleVerify}
                          disabled={verifying}
                          className="rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
                          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                        >
                          {verifying ? "Verifying..." : "Verify Membership"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
                          Membership verified｜會員驗證成功
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Your $5 member discount has been applied.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Policies */}
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                4. Confirm & Policies｜確認與報名須知
              </h2>

              <div className="mt-5 space-y-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm leading-6 text-gray-600">
                    I confirm that I am 19 years of age or older.
                    我確認自己已年滿 19 歲。
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={waiverAccepted}
                    onChange={(e) => setWaiverAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm leading-6 text-gray-600">
                    I have read and agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowWaiver(true)}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: PRIMARY }}
                    >
                      waiver and event policies
                    </button>
                    , including the no-refund policy.
                    我已閱讀並同意{" "}
                    <button
                      type="button"
                      onClick={() => setShowWaiver(true)}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: PRIMARY }}
                    >
                      免責聲明及活動規定
                    </button>
                    ，包括不退款政策。
                  </span>
                </label>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-3 font-semibold text-amber-950">
                  ⚠️ Important Information｜重要須知
                </p>
                <ul className="space-y-3 text-sm leading-6 text-amber-950">
                  <li>
                    <strong>Registration deadline:</strong> October 22 at
                    11:59 PM.
                    <br />
                    <strong>報名截止：</strong>10/22 晚上 11:59。
                  </li>
                  <li>
                    <strong>No refunds:</strong> All ticket sales are final.
                    No refunds after registration is completed.
                    <br />
                    <strong>恕不退款：</strong>報名完成後恕不退費。
                  </li>
                  <li>
                    <strong>Limited spots:</strong> Registration closes when
                    capacity is reached.
                    <br />
                    <strong>名額有限：</strong>額滿為止。
                  </li>
                  <li>
                    <strong>$200 cleaning fee:</strong> A $200 cleaning fee
                    will be charged for vomiting on the floor or causing a
                    toilet blockage.
                    <br />
                    <strong>$200 清潔費：</strong>嘔吐落地或造成廁所馬桶堵塞，
                    將收取 $200 清潔費。
                  </li>
                </ul>
              </div>
            </section>
          </div>

          {/* Order Summary */}
          <aside>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h3
                className="mb-4 border-b border-gray-100 pb-4 text-base font-semibold"
                style={{ color: PRIMARY }}
              >
                Order Summary｜訂單摘要
              </h3>

              {!selected ? (
                <p className="text-sm text-gray-400">
                  Select a ticket to continue.
                  <br />
                  請先選擇票種。
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
                        {selected.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-400">
                        {selected.subtitle}
                      </p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: PRIMARY }}>
                      ${selected.price.toFixed(2)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Member discount</span>
                      <span className="text-green-600">-${discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-gray-100 pt-4">
                    <span className="text-sm font-semibold" style={{ color: PRIMARY }}>
                      Total｜總額
                    </span>
                    <span className="text-xl font-bold" style={{ color: PRIMARY }}>
                      ${total.toFixed(2)} CAD
                    </span>
                  </div>

                  <p className="text-xs leading-5 text-gray-500">
                    Member pricing applies only after verification.
                    <br />
                    會員價僅於驗證成功後適用。
                  </p>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!canContinue || checkingOut}
                    className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                  >
                    {checkingOut ? "Processing..." : "Continue to Payment"}
                  </button>

                  {!canContinue && (
                    <p className="text-center text-xs leading-relaxed text-gray-400">
                      Complete all required fields, verify membership if
                      applicable, and accept the policies to continue.
                      <br />
                      請完成必填資料、會員驗證（如適用）並同意相關規定。
                    </p>
                  )}

                  <p className="text-center text-xs font-medium text-red-600">
                    All ticket sales are final. No refunds.
                    <br />
                    報名完成後恕不退款。
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Waiver Modal */}
      {showWaiver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waiver-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2
                id="waiver-title"
                className="text-lg font-semibold"
                style={{ color: PRIMARY }}
              >
                Event Waiver & Policies｜免責聲明及活動規定
              </h2>
              <button
                type="button"
                onClick={() => setShowWaiver(false)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="space-y-7 text-sm leading-6 text-gray-600">
                <section>
                  <p className="mb-2 font-semibold text-gray-900">
                    1. Attendance｜出席規定
                  </p>
                  <p className="mb-3">
                    若在表單交出後因故無法參加本次活動而未事先告知，
                    多倫多大學台灣同學會有權利禁止本人之後活動的參與權。
                  </p>
                  <p>
                    If I am unable to attend the event without notifying
                    ROCSAUT prior to the event day, ROCSAUT may restrict my
                    participation in future events hosted by the club.
                  </p>
                </section>

                <section>
                  <p className="mb-2 font-semibold text-gray-900">
                    2. Health and Safety｜健康與安全
                  </p>
                  <p className="mb-3">
                    本人在此聲明本人健康及體能均良好，可以應付活動，
                    並適宜自行參加，本人將完全負責本人之安全。
                    若本人之身體狀況有疑慮，應於參加活動前告知工作人員。
                  </p>
                  <p>
                    I declare that I am in suitable health to participate
                    and understand that I am responsible for my own safety.
                    If I have concerns about my physical condition, I will
                    inform event staff before participating.
                  </p>
                </section>

                <section>
                  <p className="mb-2 font-semibold text-gray-900">
                    3. Liability｜責任聲明
                  </p>
                  <p className="mb-3">
                    本人了解參與活動可能涉及風險，並同意在法律允許的範圍內，
                    就參與活動所涉及的相關責任依適用法律處理。
                  </p>
                  <p>
                    I understand that participation in the event may involve
                    risks. Any limitation or waiver of liability is subject
                    to applicable law.
                  </p>
                </section>

                <section>
                  <p className="mb-2 font-semibold text-gray-900">
                    4. No Refund Policy｜不退款政策
                  </p>
                  <p className="mb-3 font-semibold text-red-700">
                    報名完成並付款後恕不退款。
                  </p>
                  <p className="mb-3 font-semibold text-red-700">
                    All ticket sales are final. No refunds will be provided
                    after registration and payment are completed.
                  </p>
                  <p>
                    Please review your ticket selection and registration
                    information carefully before completing payment.
                    付款前請確認票種及所有報名資料。
                  </p>
                </section>

                <section>
                  <p className="mb-2 font-semibold text-gray-900">
                    5. Event Rules｜活動規定
                  </p>
                  <p className="mb-3">
                    報名截止時間為 10/22 晚上 11:59，名額有限，額滿為止。
                    嘔吐落地或造成廁所馬桶堵塞將收取 $200 清潔費。
                  </p>
                  <p>
                    Registration closes on October 22 at 11:59 PM, or
                    earlier if capacity is reached. A $200 cleaning fee
                    applies to vomiting on the floor or causing a toilet
                    blockage.
                  </p>
                </section>

                <section>
                  <p className="mb-2 font-semibold text-gray-900">
                    6. Interpretation｜條款解釋
                  </p>
                  <p className="mb-3">
                    多倫多大學台灣同學會保留在適用法律範圍內解釋及執行活動規定的權利。
                  </p>
                  <p>
                    ROCSAUT reserves the right to interpret and enforce event
                    policies to the extent permitted by applicable law.
                  </p>
                </section>
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowWaiver(false)}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium"
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
              >
                Close｜關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}