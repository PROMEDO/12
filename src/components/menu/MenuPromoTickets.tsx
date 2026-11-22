/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import type { OrderType, RestaurantAddons } from '../../types';
import type { ActiveMenuDiscount } from '../../data/addonsCatalog';
import { formatNumber } from '../../utils/storage';

export interface MenuPromoTicketItem {
  id: string;
  kind: 'discount' | 'free_delivery' | 'loyalty';
  eyebrow: string;
  title: string;
  footer: string;
  isUnlocked?: boolean;
  modalTitle: string;
  minOrderText?: string;
  maxDiscountText?: string;
  rewardNote?: string;
  pointsPerThousand?: number;
  loyaltyBalance?: number;
  currency?: string;
}

export interface BuildMenuPromoTicketsInput {
  addons: RestaurantAddons;
  activeMenuDiscount: ActiveMenuDiscount;
  orderType: OrderType;
  currency: string;
  formatMoney: (amt: number) => string;
  firstOrderPct?: number;
  pickupPct?: number;
  freeDeliveryEnabled?: boolean;
  freeDeliveryMin?: number;
  qualifiesFreeDelivery?: boolean;
  spinFreeDelivery?: boolean;
  minOrderEnabled?: boolean;
  minOrderAmount?: number;
  loyaltyBalance?: number;
}

export function buildMenuPromoTickets({
  addons,
  activeMenuDiscount,
  orderType,
  currency,
  formatMoney,
  firstOrderPct = 0,
  pickupPct = 0,
  freeDeliveryEnabled = false,
  freeDeliveryMin = 0,
  qualifiesFreeDelivery = false,
  spinFreeDelivery = false,
  minOrderEnabled = false,
  minOrderAmount = 0,
  loyaltyBalance = 0,
}: BuildMenuPromoTicketsInput): MenuPromoTicketItem[] {
  const tickets: MenuPromoTicketItem[] = [];
  const resolveMinOrderText = (addonMin = 0) => {
    const effectiveMin = addonMin > 0 ? addonMin : minOrderEnabled && minOrderAmount > 0 ? minOrderAmount : 0;
    return effectiveMin > 0 ? formatMoney(effectiveMin) : 'لا يوجد حد أدنى';
  };

  if (addons.loyaltyPoints?.enabled) {
    const pts = Math.max(1, Number(addons.loyaltyPoints.pointsPerThousand) || 1);
    const customNote = (addons.loyaltyPoints.rewardNote || '').trim();
    tickets.push({
      id: 'promo-loyalty',
      kind: 'loyalty',
      eyebrow: 'على كل الطلبات',
      title: 'إكسب نقاط',
      footer: 'يُطبق تلقائياً',
      modalTitle: 'إكسب نقاط',
      rewardNote: customNote || 'اجمع نقاط مع كل طلب واستبدلها بوجبات مجانية',
      pointsPerThousand: pts,
      loyaltyBalance,
      currency,
    });
  }

  if (activeMenuDiscount.active && activeMenuDiscount.value > 0) {
    const isFixed = activeMenuDiscount.type === 'fixed';
    const discountLabel = isFixed
      ? `خصم ${formatMoney(activeMenuDiscount.value)}`
      : `خصم ${formatNumber(activeMenuDiscount.value)}٪`;
    const eyebrow =
      activeMenuDiscount.sourceType === 'happyHour'
        ? 'ساعة السعادة'
        : activeMenuDiscount.sourceType === 'countdown'
        ? addons.countdownTimer?.title?.trim() || 'على طلبك القادم'
        : 'على طلبك القادم';
    const maxCap = Math.max(0, Number(activeMenuDiscount.maxDiscountAmount || 0));
    const minReq = Math.max(0, Number(activeMenuDiscount.minOrderAmount || 0));

    tickets.push({
      id: 'promo-active-discount',
      kind: 'discount',
      eyebrow,
      title: discountLabel,
      footer: 'يُطبق تلقائياً',
      modalTitle:
        maxCap > 0 && !isFixed
          ? `خصم ${formatNumber(activeMenuDiscount.value)}٪ لغاية ${formatMoney(maxCap)}`
          : isFixed
          ? `خصم ${formatMoney(activeMenuDiscount.value)} على طلبك`
          : `خصم ${formatNumber(activeMenuDiscount.value)}٪ على طلبك`,
      minOrderText: resolveMinOrderText(minReq),
      maxDiscountText: maxCap > 0 ? formatMoney(maxCap) : 'لا يوجد حد أقصى',
    });
  }

  if (firstOrderPct > 0 && addons.firstOrderDiscount?.enabled) {
    const minReq = Math.max(0, Number(addons.firstOrderDiscount.minOrderAmount || 0));
    const maxCap = Math.max(0, Number(addons.firstOrderDiscount.maxDiscountAmount || 0));
    tickets.push({
      id: 'promo-first-order',
      kind: 'discount',
      eyebrow: 'على طلبك الأول',
      title: `خصم ${formatNumber(firstOrderPct)}٪`,
      footer: 'يُطبق تلقائياً',
      modalTitle:
        maxCap > 0
          ? `خصم ${formatNumber(firstOrderPct)}٪ لغاية ${formatMoney(maxCap)}`
          : `خصم ${formatNumber(firstOrderPct)}٪ على طلبك الأول`,
      minOrderText: resolveMinOrderText(minReq),
      maxDiscountText: maxCap > 0 ? formatMoney(maxCap) : 'لا يوجد حد أقصى',
    });
  }

  if (pickupPct > 0 && addons.pickupInstantDiscount?.enabled && orderType === 'pickup') {
    const minReq = Math.max(0, Number(addons.pickupInstantDiscount.minOrderAmount || 0));
    const maxCap = Math.max(0, Number(addons.pickupInstantDiscount.maxDiscountAmount || 0));
    tickets.push({
      id: 'promo-pickup-discount',
      kind: 'discount',
      eyebrow: 'عند الاستلام الذاتي',
      title: `خصم ${formatNumber(pickupPct)}٪`,
      footer: 'يُطبق تلقائياً',
      modalTitle:
        maxCap > 0
          ? `خصم ${formatNumber(pickupPct)}٪ لغاية ${formatMoney(maxCap)}`
          : `خصم ${formatNumber(pickupPct)}٪ عند الاستلام الذاتي`,
      minOrderText: resolveMinOrderText(minReq),
      maxDiscountText: maxCap > 0 ? formatMoney(maxCap) : 'لا يوجد حد أقصى',
    });
  }

  if ((freeDeliveryEnabled || spinFreeDelivery) && orderType === 'delivery') {
    const hasMin = freeDeliveryMin > 0 && !spinFreeDelivery;
    const maxCap = Math.max(0, Number(addons.freeDeliveryProgress?.maxDiscountAmount || 0));
    tickets.push({
      id: 'promo-free-delivery',
      kind: 'free_delivery',
      eyebrow: hasMin ? `عند الطلب بـ ${formatMoney(freeDeliveryMin)}` : 'على طلبك القادم',
      title: 'توصيل مجاني',
      footer: qualifiesFreeDelivery ? 'مُفعّل لطلبك ✓' : 'يُطبق تلقائياً',
      isUnlocked: qualifiesFreeDelivery,
      modalTitle:
        maxCap > 0 ? `توصيل مجاني لغاية ${formatMoney(maxCap)}` : 'توصيل مجاني',
      minOrderText: hasMin ? formatMoney(freeDeliveryMin) : 'لا يوجد حد أدنى',
      maxDiscountText: maxCap > 0 ? formatMoney(maxCap) : 'لا يوجد حد أقصى',
    });
  }

  return tickets;
}

const SCALLOP_SEAL_PATH =
  'M14 1.2L16.7 3.1L19.9 2.4L21.3 5.4L24.5 6.3L24.4 9.6L26.8 11.9L25.2 14.8L26.2 18L23.4 19.7L22.8 23L19.5 23.3L17.4 25.9L14.3 24.6L11.2 26L9.1 23.4L5.8 23.1L5.2 19.8L2.4 18.1L3.4 14.9L1.8 12L4.2 9.7L4.1 6.4L7.3 5.5L8.7 2.5L11.9 3.2L14 1.2Z';

function ScallopedRedPercentBadge() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d={SCALLOP_SEAL_PATH} fill="#E12D39" />
      <circle cx="11.2" cy="11.2" r="1.45" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="16.8" cy="16.8" r="1.45" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M17.2 10.6L10.8 17.4" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ScallopedRedDeliveryBadge() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d={SCALLOP_SEAL_PATH} fill="#E12D39" />
      <circle cx="9.8" cy="17.8" r="2.1" fill="#FFFFFF" />
      <circle cx="18.3" cy="17.8" r="2.1" fill="#FFFFFF" />
      <path
        d="M8.6 16.2H12.2L14.1 11.4H16.6M13.3 13.8H18.2C19 13.8 19.6 14.4 19.8 15.2L20.1 16.5H16.5"
        stroke="#FFFFFF"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8.2" y="12.1" width="3.8" height="2.7" rx="0.8" fill="#FFFFFF" />
    </svg>
  );
}

function MintPlusSealBadge() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M5.4 6.2C7.4 4.1 10.5 3 14 3C20.1 3 25 7.9 25 14C25 20.1 20.1 25 14 25C7.9 25 3 20.1 3 14C3 11.4 3.9 9 5.4 7.1L4.6 5.2L6.8 5.6Z"
        fill="#00B67A"
      />
      <path
        d="M14 9.7V18.3M9.7 14H18.3"
        stroke="#FFFFFF"
        strokeWidth="2.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DiscountTags3DIllustration() {
  return (
    <svg width="96" height="92" viewBox="0 0 96 92" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mpTagBack" x1="34" y1="16" x2="78" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E6F4EF" />
        </linearGradient>
        <linearGradient id="mpTagFront" x1="20" y1="22" x2="62" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2F6" />
        </linearGradient>
        <filter id="mpIllusShadow" x="0" y="0" width="96" height="92" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
      </defs>
      <ellipse cx="48" cy="81" rx="26" ry="5" fill="#0F172A" fillOpacity="0.08" />
      <g filter="url(#mpIllusShadow)">
        <g transform="rotate(-24 50 48)">
          <rect
            x="35"
            y="18"
            width="36"
            height="54"
            rx="9"
            fill="url(#mpTagBack)"
            stroke="#00B67A"
            strokeWidth="2.5"
          />
          <circle cx="53" cy="27" r="3.8" fill="#CBD5E1" />
        </g>
        <g transform="rotate(20 44 48)">
          <rect
            x="24"
            y="19"
            width="37"
            height="55"
            rx="10"
            fill="url(#mpTagFront)"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
          <circle cx="42.5" cy="28.5" r="4.2" fill="#E2E8F0" />
          <circle cx="42.5" cy="28.5" r="2.2" fill="#94A3B8" />
        </g>
      </g>
      <path
        d="M36 22C33 13 38 7 43 9C47.5 10.8 47.5 18 44 23.5"
        stroke="#94A3B8"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M36.5 21.5C34 14 38.5 8.5 42.6 10"
        stroke="#E2E8F0"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <g transform="translate(18 47) scale(1.22)">
        <path
          d={SCALLOP_SEAL_PATH}
          fill="#E12D39"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="11.2" cy="11.2" r="1.45" stroke="#FFFFFF" strokeWidth="1.55" />
        <circle cx="16.8" cy="16.8" r="1.45" stroke="#FFFFFF" strokeWidth="1.55" />
        <path d="M17.2 10.6L10.8 17.4" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function DeliveryScooter3DIllustration() {
  return (
    <svg width="104" height="92" viewBox="0 0 104 92" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mpScootBody" x1="26" y1="26" x2="78" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="mpScootMint" x1="50" y1="36" x2="78" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14D196" />
          <stop offset="100%" stopColor="#009E6B" />
        </linearGradient>
      </defs>
      <ellipse cx="52" cy="80" rx="31" ry="5.5" fill="#0F172A" fillOpacity="0.1" />
      <path
        d="M17 44L14 50H19L16 56"
        stroke="#00B67A"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 41L21.5 46H25.5L23 51"
        stroke="#10B981"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="33" cy="69" r="9.5" fill="#1F2937" />
      <circle cx="33" cy="69" r="4.8" fill="#E2E8F0" />
      <circle cx="71" cy="69" r="9.5" fill="#1F2937" />
      <circle cx="71" cy="69" r="4.8" fill="#E2E8F0" />
      <path
        d="M52 43H70C75 43 79 46.5 80 51.5L82 62C82 65.5 79 68 74 68H57C53 68 50 66 49 62.5L47 52C46.5 46.5 48.5 43 52 43Z"
        fill="url(#mpScootBody)"
        stroke="#CBD5E1"
        strokeWidth="1.2"
      />
      <rect x="52" y="38" width="21" height="7" rx="3.5" fill="url(#mpScootMint)" />
      <path
        d="M28 64C27 52 32 39 39 34L42 22H47L44 37C42.5 46 44 57 48 63H31"
        fill="url(#mpScootBody)"
        stroke="#CBD5E1"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="37" cy="31" r="4.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.4" />
      <path d="M40 21H52" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="53.5" cy="17.5" r="2.6" fill="#CBD5E1" />
      <path d="M48 21L52.5 18.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M35 62H68" stroke="#CBD5E1" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function LoyaltyMedal3DIllustration() {
  return (
    <svg width="96" height="92" viewBox="0 0 96 92" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mpCoinGold" x1="50" y1="22" x2="78" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="mpMedalFace" x1="20" y1="26" x2="54" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>
      <ellipse cx="48" cy="80" rx="28" ry="5" fill="#0F172A" fillOpacity="0.08" />
      <path d="M41 18L44 10" stroke="#00B67A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M49 20L55 13" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="62" cy="68" rx="14" ry="5.5" fill="#B45309" />
      <ellipse cx="62" cy="64.5" rx="14" ry="5.5" fill="url(#mpCoinGold)" />
      <ellipse cx="62" cy="59.5" rx="14" ry="5.5" fill="#B45309" />
      <ellipse cx="62" cy="56" rx="14" ry="5.5" fill="url(#mpCoinGold)" />
      <ellipse cx="62" cy="51" rx="14" ry="5.5" fill="#D97706" />
      <ellipse cx="62" cy="48" rx="14" ry="5.5" fill="#FDE68A" />
      <circle cx="63" cy="36" r="14.5" fill="url(#mpCoinGold)" stroke="#FEF3C7" strokeWidth="1.5" />
      <circle cx="63" cy="36" r="10.5" stroke="#D97706" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M29 53L25 75L35 69L41 75L42 54" fill="#00B67A" />
      <path d="M43 53L44 74L51 68L57 73L52 52" fill="#059669" />
      <circle cx="38" cy="43" r="18.5" fill="url(#mpMedalFace)" stroke="#E2E8F0" strokeWidth="1.6" />
      <circle cx="38" cy="43" r="14.5" stroke="#CBD5E1" strokeWidth="1.1" />
      <path
        d="M38 32.5L40.9 38.4L47.4 39.3L42.7 43.9L43.8 50.4L38 47.3L32.2 50.4L33.3 43.9L28.6 39.3L35.1 38.4L38 32.5Z"
        fill="#00B67A"
      />
    </svg>
  );
}

function LoyaltyCardCornerOrnament() {
  return (
    <svg
      className="mp-promo-loyalty-ornament"
      width="58"
      height="54"
      viewBox="0 0 58 54"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="36" cy="24" r="11" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.2" />
      <ellipse cx="36" cy="41" rx="10" ry="4" fill="#F59E0B" />
      <ellipse cx="36" cy="37" rx="10" ry="4" fill="#FDE68A" />
      <path d="M16 33L14 48L20 44L25 48L24 33" fill="#00B67A" />
      <circle cx="20" cy="27" r="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
      <path
        d="M20 20.5L21.9 24.3L26.1 24.9L23 27.9L23.8 32.1L20 30.1L16.2 32.1L17 27.9L13.9 24.9L18.1 24.3L20 20.5Z"
        fill="#00B67A"
      />
    </svg>
  );
}

interface MenuPromoTicketsProps {
  tickets: MenuPromoTicketItem[];
  isLightSurface?: boolean;
  className?: string;
}

export const MenuPromoTickets: React.FC<MenuPromoTicketsProps> = ({
  tickets,
  isLightSurface = true,
  className = '',
}) => {
  const [activeTicket, setActiveTicket] = useState<MenuPromoTicketItem | null>(null);

  useEffect(() => {
    if (!activeTicket) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTicket(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTicket]);

  if (!tickets || tickets.length === 0) return null;

  const modeClass = isLightSurface ? 'is-light' : 'is-dark';

  return (
    <>
      <div
        className={`mp-promo-strip ${modeClass} ${className}`.trim()}
        aria-label="العروض والمكافآت"
      >
        {tickets.map((tk) => {
          const isLoyalty = tk.kind === 'loyalty';
          return (
            <button
              key={tk.id}
              type="button"
              className={`mp-promo-ticket ${modeClass} ${isLoyalty ? 'is-loyalty' : 'is-coupon'}`}
              onClick={() => setActiveTicket(tk)}
            >
              {isLoyalty && (
                <>
                  <svg
                    className="mp-promo-loyalty-wave"
                    viewBox="0 0 180 42"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M0 16C45 4 95 28 180 10V42H0V16Z" fill="currentColor" />
                  </svg>
                  <LoyaltyCardCornerOrnament />
                </>
              )}

              <span className="mp-promo-ticket-badge">
                {tk.kind === 'loyalty' ? (
                  <MintPlusSealBadge />
                ) : tk.kind === 'free_delivery' ? (
                  <ScallopedRedDeliveryBadge />
                ) : (
                  <ScallopedRedPercentBadge />
                )}
              </span>

              <span className="mp-promo-ticket-eyebrow">{tk.eyebrow}</span>
              <strong className="mp-promo-ticket-title tabular-nums">{tk.title}</strong>

              {!isLoyalty && (
                <>
                  <span className="mp-promo-ticket-divider" aria-hidden="true" />
                  <span
                    className={`mp-promo-ticket-footer ${tk.isUnlocked ? 'is-unlocked' : ''}`}
                  >
                    {tk.footer}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {activeTicket && (
        <div
          className={`mp-promo-sheet-backdrop ${modeClass}`}
          onClick={() => setActiveTicket(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mp-promo-sheet-title"
        >
          <div
            className={`mp-promo-sheet ${modeClass}`}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mp-promo-sheet-handle" aria-hidden="true" />

            <div className="mp-promo-sheet-hero">
              {activeTicket.kind === 'loyalty' ? (
                <LoyaltyMedal3DIllustration />
              ) : activeTicket.kind === 'free_delivery' ? (
                <DeliveryScooter3DIllustration />
              ) : (
                <DiscountTags3DIllustration />
              )}
            </div>

            <h2 id="mp-promo-sheet-title" className="mp-promo-sheet-title tabular-nums">
              {activeTicket.modalTitle}
            </h2>

            {activeTicket.kind === 'loyalty' ? (
              <div className={`mp-promo-sheet-loyalty-box ${modeClass}`}>
                <p className="mp-promo-sheet-loyalty-note">{activeTicket.rewardNote}</p>
                {activeTicket.pointsPerThousand && (
                  <p className="mp-promo-sheet-loyalty-meta tabular-nums">
                    تكسب {formatNumber(activeTicket.pointsPerThousand)} نقطة لكل 1,000{' '}
                    {activeTicket.currency || 'د.ع'}
                    {(activeTicket.loyaltyBalance || 0) > 0
                      ? ` · رصيدك الحالي: ${formatNumber(activeTicket.loyaltyBalance || 0)} نقطة`
                      : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className={`mp-promo-sheet-ticket-box ${modeClass}`}>
                <div className="mp-promo-sheet-ticket-grid">
                  <div className="mp-promo-sheet-ticket-cell">
                    <span className="mp-promo-sheet-cell-label">الحد الأدنى للطلب</span>
                    <strong className="mp-promo-sheet-cell-val tabular-nums">
                      {activeTicket.minOrderText || 'لا يوجد حد أدنى'}
                    </strong>
                  </div>
                  <div className="mp-promo-sheet-ticket-cell">
                    <span className="mp-promo-sheet-cell-label">الحد الأقصى للخصم</span>
                    <strong className="mp-promo-sheet-cell-val tabular-nums">
                      {activeTicket.maxDiscountText || 'لا يوجد حد أقصى'}
                    </strong>
                  </div>
                </div>
                <span className="mp-promo-sheet-ticket-divider" aria-hidden="true" />
                <div
                  className={`mp-promo-sheet-ticket-footer ${
                    activeTicket.isUnlocked ? 'is-unlocked' : ''
                  }`}
                >
                  {activeTicket.footer}
                </div>
              </div>
            )}

            <button
              type="button"
              className="mp-promo-sheet-cta"
              onClick={() => setActiveTicket(null)}
            >
              حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
};
