"use client";

import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const ticketTypes = [
  {
    id: "REGULAR",
    title: "Regular",
    subtitle: "2 drink tickets",
    price: 30,
  },
  {
    id: "UNLIMITED",
    title: "Unlimited",
    subtitle: "Unlimited alcohol + cocktails + 1 photobooth photo",
    price: 40,
  },
];

export default function Fall2026EventPage() {
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

  const [verifying, setVerifying] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          cardName,
        }),
      });

      const data = await response.json();

      if (data.verified) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        alert(data.message);
      }
    } catch (error) {
      console.error("Member verification error:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckout = async () => {
    if (!canContinue || !selectedTicket) {
      return;
    }

    try {
      const response = await fetch("/api/event/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        alert(data.message);
        return;
      }

      console.log("Checkout data:", data);

      alert("Checkout information received successfully.");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again later.");
    }
  };

  const discount = isVerified && isMember ? 5 : 0;

  const total = selected
    ? Math.max(0, selected.price - discount)
    : 0;

  const canContinue =
    selectedTicket &&
    name.trim() &&
    email.trim() &&
    phone.trim() &&
    ageConfirmed &&
    waiverAccepted &&
    (!isMember || isVerified);

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#f9f7f4" }}
    >
      {/* Hero */}
      <section
        className="px-4 py-14 sm:py-20"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-sm uppercase tracking-widest mb-3"
            style={{ color: `${SECONDARY}aa` }}
          >
            ROCSAUT Events
          </p>

          <h1
            className="text-3xl sm:text-4xl font-bold leading-tight"
            style={{ color: SECONDARY }}
          >
            2026 ROCSAUT Halloween Party
          </h1>

          <div
            className="mt-5 space-y-1 text-sm sm:text-base"
            style={{ color: "#ffffffcc" }}
          >
            <p>October 23, 2026 · 7:30 PM – 11:30 PM</p>
            <p>38 Grenville St. 2F</p>
            <p>Halloween Costume 🎃</p>
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">

            {/* Ticket Type */}
            <section
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: PRIMARY }}
              >
                1. Choose your ticket
              </h2>

              <p className="text-sm text-gray-500 mt-1 mb-5">
                Choose the ticket option you would like to purchase.
              </p>

              <div className="space-y-3">
                {ticketTypes.map((ticket) => {
                  const isSelected = selectedTicket === ticket.id;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicket(ticket.id)}
                      className="w-full text-left rounded-xl p-4 transition-all"
                      style={{
                        border: `1px solid ${
                          isSelected ? SECONDARY : "#e5e7eb"
                        }`,
                        backgroundColor: isSelected
                          ? "#faf8f3"
                          : "#ffffff",
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">

                        <div className="flex items-center gap-4">

                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              border: `2px solid ${
                                isSelected
                                  ? SECONDARY
                                  : "#d1d5db"
                              }`,
                            }}
                          >
                            {isSelected && (
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: SECONDARY,
                                }}
                              />
                            )}
                          </div>

                          <div>
                            <p
                              className="font-semibold text-sm"
                              style={{ color: PRIMARY }}
                            >
                              {ticket.title}
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              {ticket.subtitle}
                            </p>
                          </div>

                        </div>

                        <span
                          className="font-semibold text-sm whitespace-nowrap"
                          style={{ color: PRIMARY }}
                        >
                          ${ticket.price}
                        </span>

                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Personal Information */}
            <section
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: PRIMARY }}
              >
                2. Your information
              </h2>

              <p className="text-sm text-gray-500 mt-1 mb-5">
                Please enter the information that will be associated with
                your ticket.
              </p>

              <div className="space-y-4">

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-2"
                  >
                    Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid #d1d5db",
                      color: PRIMARY,
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-2"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid #d1d5db",
                      color: PRIMARY,
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-2"
                  >
                    Phone
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone number"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid #d1d5db",
                      color: PRIMARY,
                    }}
                  />
                </div>

              </div>
            </section>

            {/* Membership */}
            <section
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: PRIMARY }}
              >
                3. Membership
              </h2>

              <label className="flex items-center gap-3 mt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={handleMemberToggle}
                  className="w-4 h-4"
                />

                <span
                  className="text-sm font-medium"
                  style={{ color: PRIMARY }}
                >
                  I am a ROCSAUT member
                </span>
              </label>

              {isMember && (
                <div className="mt-5 pt-5 border-t border-gray-100">

                  {!isVerified ? (
                    <>
                      <p className="text-sm text-gray-500 mb-4">
                        Enter your Member ID and the name on your member
                        card to receive the member price.
                      </p>

                      <div className="space-y-4">

                        {/* Member ID */}
                        <div>
                          <label
                            htmlFor="memberId"
                            className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-2"
                          >
                            Member ID
                          </label>

                          <input
                            id="memberId"
                            type="text"
                            value={memberId}
                            onChange={(e) =>
                              setMemberId(e.target.value)
                            }
                            placeholder="OTSA-2026-XXXX"
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                            style={{
                              border: "1px solid #d1d5db",
                              color: PRIMARY,
                            }}
                          />
                        </div>

                        {/* Card Name */}
                        <div>
                          <label
                            htmlFor="cardName"
                            className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-2"
                          >
                            Name on Member Card
                          </label>

                          <input
                            id="cardName"
                            type="text"
                            value={cardName}
                            onChange={(e) =>
                              setCardName(e.target.value)
                            }
                            placeholder="Your name"
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                            style={{
                              border: "1px solid #d1d5db",
                              color: PRIMARY,
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleVerify}
                          disabled={verifying}
                          className="px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                          style={{
                            backgroundColor: PRIMARY,
                            color: SECONDARY,
                          }}
                        >
                          {verifying
                            ? "Verifying..."
                            : "Verify Membership"}
                        </button>

                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-3">

                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#16a34a",
                        }}
                      >
                        ✓
                      </div>

                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: PRIMARY }}
                        >
                          Membership verified
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          Your member price has been applied.
                        </p>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </section>

            {/* Agreements */}
            <section
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: PRIMARY }}
              >
                4. Confirm
              </h2>

              <div className="mt-5 space-y-4">

                {/* Age */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) =>
                      setAgeConfirmed(e.target.checked)
                    }
                    className="w-4 h-4 mt-0.5"
                  />

                  <span className="text-sm text-gray-600">
                    I confirm that I am 19 years of age or older.
                  </span>
                </label>

                {/* Waiver */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waiverAccepted}
                    onChange={(e) =>
                      setWaiverAccepted(e.target.checked)
                    }
                    className="w-4 h-4 mt-0.5"
                  />

                  <span className="text-sm text-gray-600">
                    I have read and agree to the waiver and event
                    policies.
                  </span>
                </label>

              </div>

              <div
                className="mt-6 rounded-xl p-4 text-sm"
                style={{
                  backgroundColor: "#faf8f3",
                  color: PRIMARY,
                }}
              >
                <p className="font-semibold mb-2">
                  Important
                </p>

                <ul className="space-y-1 text-gray-600">
                  <li>
                    • Sign Up closes on 10/22 11:59 PM.
                  </li>
                  <li>• No Refunds.</li>
                  <li>• Spots are limited.</li>
                  <li>
                    • $150 cleaning fee will be charged for vomiting
                    on floors and clogging toilets.
                  </li>
                </ul>
              </div>
            </section>

          </div>

          {/* Order Summary */}
          <aside>
            <div
              className="rounded-2xl bg-white p-6 shadow-sm sticky top-20"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h3
                className="text-base font-semibold pb-4 mb-4 border-b"
                style={{
                  color: PRIMARY,
                  borderColor: "#f3f4f6",
                }}
              >
                Order Summary
              </h3>

              {!selected ? (
                <p className="text-sm text-gray-400">
                  Select a ticket to continue.
                </p>
              ) : (
                <div className="space-y-4">

                  <div className="flex justify-between gap-4">
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: PRIMARY }}
                      >
                        {selected.title}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {selected.subtitle}
                      </p>
                    </div>

                    <span
                      className="text-sm font-semibold"
                      style={{ color: PRIMARY }}
                    >
                      ${selected.price.toFixed(2)}
                    </span>
                  </div>

                  {isVerified && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Member price
                      </span>

                      <span className="text-green-600">
                        -${discount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div
                    className="border-t pt-4 flex justify-between"
                    style={{ borderColor: "#f3f4f6" }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: PRIMARY }}
                    >
                      Total
                    </span>

                    <span
                      className="text-xl font-bold"
                      style={{ color: PRIMARY }}
                    >
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!canContinue}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                    style={{
                      backgroundColor: PRIMARY,
                      color: SECONDARY,
                    }}
                  >
                    Continue to Payment
                  </button>

                  {!canContinue && (
                    <p className="text-xs text-gray-400 text-center leading-relaxed">
                      Please complete all required information above
                      before continuing.
                    </p>
                  )}

                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}