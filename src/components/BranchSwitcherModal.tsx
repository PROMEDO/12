/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ChevronLeft, Copy, GitBranch, Sparkles, Store, X } from 'lucide-react';
import { Category, MenuItem, Restaurant } from '../types';
import {
  OwnedMenuSummary,
  copyTextReliable,
  getCollection,
  getSlugForRestaurantId,
} from '../utils/storage';
import { getDashboardTabPath } from '../utils/router';
import { DASH_EASE, dashModalMotion } from '../utils/dashboardMotion';

interface BranchSwitcherModalProps {
  isOpen: boolean;
  isStartupPrompt?: boolean;
  mainRid: string;
  activeRid: string;
  mainRest: Restaurant;
  branchesList: Restaurant[];
  ownedMenus?: OwnedMenuSummary[];
  isStore: boolean;
  onSelectBranch: (targetRid: string) => void;
  onSelectMenu?: (targetRid: string, targetSlug?: string) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const BranchSwitcherModal: React.FC<BranchSwitcherModalProps> = ({
  isOpen,
  isStartupPrompt = false,
  mainRid,
  activeRid,
  mainRest,
  branchesList,
  ownedMenus = [],
  isStore,
  onSelectBranch,
  onSelectMenu,
  onClose,
  showToast,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const allCats = getCollection<Category>('cats');
  const allItems = getCollection<MenuItem>('items');

  const allBranches: Array<{ rest: Restaurant; isMain: boolean }> = [
    { rest: mainRest, isMain: true },
    ...branchesList.map((b) => ({ rest: b, isMain: false })),
  ];
  const familyIds = new Set(allBranches.map((entry) => entry.rest.id));
  const otherOwnedMenus = ownedMenus.filter((m) => m.id && !familyIds.has(m.id));

  const handleCopyDashboardLink = async (
    e: React.MouseEvent,
    targetRid: string,
    label: string,
    fallbackSlug?: string
  ) => {
    e.stopPropagation();
    const targetSlug = getSlugForRestaurantId(targetRid) || fallbackSlug;
    const isInCurrentFamily = familyIds.has(targetRid);
    const path = getDashboardTabPath(
      'home',
      isInCurrentFamily && targetRid !== mainRid ? targetRid : undefined,
      targetSlug
    );
    const fullUrl = `${window.location.origin}${path}`;
    const ok = await copyTextReliable(fullUrl);
    if (ok) {
      setCopiedId(targetRid);
      showToast(`تم نسخ رابط لوحة تحكم "${label}" ✓`);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === targetRid ? null : cur));
      }, 2000);
    } else {
      showToast('تعذر نسخ الرابط، يرجى النسخ يدوياً');
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="mp-modal-backdrop"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mp-branch-modal-title"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25, ease: DASH_EASE }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(2, 6, 23, 0.68)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            {...dashModalMotion(prefersReducedMotion)}
            style={{
              width: 'min(480px, 100%)',
              maxHeight: '86dvh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '22px',
              background: 'var(--surface, #0f172a)',
              border: '1px solid color-mix(in srgb, var(--line) 85%, transparent)',
              boxShadow: '0 28px 64px rgba(0, 0, 0, 0.48)',
              overflow: 'hidden',
              color: 'var(--ink)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '18px 18px 14px',
                borderBottom: '1px solid var(--line)',
                background: 'color-mix(in srgb, var(--panel, var(--surface)) 72%, transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '13px',
                    background: 'color-mix(in srgb, var(--brand) 16%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--brand) 32%, transparent)',
                    color: 'var(--brand-ink, var(--brand))',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <GitBranch size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3
                    id="mp-branch-modal-title"
                    style={{ margin: 0, fontSize: '16.5px', fontWeight: 900, color: 'var(--ink)' }}
                  >
                    {isStartupPrompt ? 'اختر الفرع للتعديل' : 'تبديل الفرع النشط'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {isStartupPrompt
                      ? 'حدد الفرع الذي تريد فتح لوحة التحكم وإدارة إعداداته ومنتجاته الآن'
                      : 'لكل فرع رابط لوحة تحكم مستقل تماماً — اختر الفرع للانتقال إليه'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  border: '1px solid var(--line)',
                  background: 'color-mix(in srgb, var(--surface) 75%, transparent)',
                  color: 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Branch List */}
            <div
              style={{
                padding: '14px 16px 16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {allBranches.map(({ rest: b, isMain }) => {
                const isActive = b.id === activeRid;
                const branchLabel = isMain ? mainRest.n : b.branchName || b.n;
                const catsCount = allCats.filter((c) => c.rid === b.id).length;
                const itemsCount = allItems.filter((i) => i.rid === b.id).length;
                const isCopied = copiedId === b.id;

                return (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectBranch(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBranch(b.id);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '13px 14px',
                      borderRadius: '15px',
                      border: isActive
                        ? '1.5px solid var(--brand)'
                        : '1px solid color-mix(in srgb, var(--line) 85%, transparent)',
                      background: isActive
                        ? 'color-mix(in srgb, var(--brand) 10%, var(--surface))'
                        : 'color-mix(in srgb, var(--panel, var(--surface)) 78%, transparent)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      textAlign: 'start',
                      transition: 'border-color 0.16s ease, background 0.16s ease, transform 0.16s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '11px',
                          background: isActive
                            ? 'var(--brand)'
                            : 'color-mix(in srgb, var(--brand) 12%, transparent)',
                          color: isActive ? '#ffffff' : 'var(--brand-ink, var(--brand))',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isMain ? <Sparkles size={17} /> : <GitBranch size={17} />}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {branchLabel}
                          </span>

                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '7px',
                              background: isMain
                                ? 'color-mix(in srgb, var(--brand) 15%, transparent)'
                                : 'color-mix(in srgb, var(--line) 55%, transparent)',
                              color: isMain ? 'var(--brand-ink, var(--brand))' : 'var(--muted)',
                            }}
                          >
                            {isMain ? 'الرئيسي' : 'فرع'}
                          </span>

                          {isActive && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '7px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>الحالي</span>
                            </span>
                          )}
                        </div>

                        <div
                          className="tabular-nums"
                          style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}
                        >
                          {catsCount} أقسام · {itemsCount} {isStore ? 'منتج' : 'صنف'}
                          {b.slug ? ` · /${b.slug}/dashboard` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => void handleCopyDashboardLink(e, b.id, branchLabel, b.slug)}
                        title="نسخ رابط لوحة تحكم هذا الفرع"
                        aria-label={`نسخ رابط لوحة ${branchLabel}`}
                        style={{
                          height: '32px',
                          padding: '0 9px',
                          borderRadius: '9px',
                          border: '1px solid var(--line)',
                          background: isCopied
                            ? 'rgba(16, 185, 129, 0.14)'
                            : 'color-mix(in srgb, var(--surface) 82%, transparent)',
                          color: isCopied ? '#10b981' : 'var(--muted)',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'تم' : 'رابط اللوحة'}</span>
                      </button>

                      <ChevronLeft size={16} style={{ color: isActive ? 'var(--brand)' : 'var(--muted)' }} />
                    </div>
                  </div>
                );
              })}

              {otherOwnedMenus.length > 0 && (
                <>
                  <div
                    style={{
                      marginTop: '6px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--line)',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Store size={13} />
                    <span>مشاريع ومنيوهات أخرى تملكها (دخول مباشر بدون تسجيل جديد)</span>
                  </div>

                  {otherOwnedMenus.map((menu) => {
                    const isCopied = copiedId === menu.id;
                    const menuLabel = menu.branchName ? `${menu.name} (${menu.branchName})` : menu.name;
                    return (
                      <div
                        key={menu.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (onSelectMenu) {
                            onSelectMenu(menu.id, menu.slug);
                          } else {
                            window.location.href = getDashboardTabPath('home', undefined, menu.slug);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (onSelectMenu) {
                              onSelectMenu(menu.id, menu.slug);
                            } else {
                              window.location.href = getDashboardTabPath('home', undefined, menu.slug);
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '13px 14px',
                          borderRadius: '15px',
                          border: '1px solid color-mix(in srgb, var(--line) 85%, transparent)',
                          background: 'color-mix(in srgb, var(--panel, var(--surface)) 78%, transparent)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          textAlign: 'start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '11px',
                              background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
                              color: 'var(--brand-ink, var(--brand))',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {menu.logo ? (
                              <img src={menu.logo} alt={menuLabel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Store size={17} />
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 800,
                                color: 'var(--ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {menuLabel}
                            </div>
                            <div className="tabular-nums" style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}>
                              /{menu.slug}/dashboard/home
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => void handleCopyDashboardLink(e, menu.id, menuLabel, menu.slug)}
                            title="نسخ رابط لوحة التحكم"
                            style={{
                              height: '32px',
                              padding: '0 9px',
                              borderRadius: '9px',
                              border: '1px solid var(--line)',
                              background: isCopied
                                ? 'rgba(16, 185, 129, 0.14)'
                                : 'color-mix(in srgb, var(--surface) 82%, transparent)',
                              color: isCopied ? '#10b981' : 'var(--muted)',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'تم' : 'رابط اللوحة'}</span>
                          </button>

                          <ChevronLeft size={16} style={{ color: 'var(--muted)' }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
