/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Ban, CalendarOff, Clock, EyeOff, PowerOff, X } from 'lucide-react';
import type { ManualPauseBehavior, ManualPauseDurationPreset } from '../types';
import { computePauseUntil, formatEpochTime12 } from '../utils/availability';
import { dashModalMotion } from '../utils/dashboardMotion';

export interface PauseModalTarget {
  kind: 'category' | 'item';
  id: string;
  name: string;
}

interface PauseVisibilityModalProps {
  target: PauseModalTarget | null;
  isStore?: boolean;
  onClose: () => void;
  onConfirm: (preset: ManualPauseDurationPreset, behavior: ManualPauseBehavior) => void;
}

const DURATION_OPTIONS: Array<{
  preset: ManualPauseDurationPreset;
  label: string;
  hint: string;
}> = [
  { preset: '1h', label: 'لمدة ساعة', hint: 'ساعة واحدة من الآن' },
  { preset: '2h', label: 'لمدة ساعتين', hint: 'ساعتان من الآن' },
  { preset: 'end_of_day', label: 'لنهاية اليوم', hint: 'حتى الساعة 11:59 م' },
  { preset: 'end_of_week', label: 'لنهاية الأسبوع', hint: 'حتى نهاية يوم الجمعة' },
  { preset: 'permanent', label: 'إطفاء كامل', hint: 'يبقى متوقفاً حتى إعادة تشغيله يدوياً' },
];

export const PauseVisibilityModal: React.FC<PauseVisibilityModalProps> = ({
  target,
  isStore = false,
  onClose,
  onConfirm,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [preset, setPreset] = useState<ManualPauseDurationPreset>('1h');
  const [behavior, setBehavior] = useState<ManualPauseBehavior>('badge');

  useEffect(() => {
    if (!target) return;
    setPreset('1h');
    setBehavior('badge');
  }, [target?.id, target?.kind]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const targetNoun =
    target.kind === 'category' ? 'القسم' : isStore ? 'المنتج' : 'العنصر';

  const now = new Date();
  const previewUntil = computePauseUntil(preset, now);
  const previewTimeLabel = previewUntil ? formatEpochTime12(previewUntil) : '';

  const modalNode = (
    <div
      onClick={onClose}
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 99999,
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`إطفاء ${targetNoun}: ${target.name}`}
        onClick={(e) => e.stopPropagation()}
        {...dashModalMotion(prefersReducedMotion)}
        style={{
          width: 'min(480px, 100%)',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--line) 80%, transparent)',
          color: 'var(--ink)',
          borderRadius: '20px',
          padding: '20px 20px 22px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.48)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'rgba(245, 158, 11, 0.14)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <PowerOff size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16.5px',
                  fontWeight: 900,
                  color: 'var(--ink)',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}
              >
                {`إطفاء ${targetNoun}: ${target.name}`}
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: 'var(--muted)',
                  lineHeight: 1.4,
                }}
              >
                حدد مدة الإطفاء وطريقة ظهوره للزبائن
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '9px',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Duration Section */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '9px',
            }}
          >
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={14} />
              <span>مدة الإطفاء</span>
            </span>
            {previewTimeLabel && (preset === '1h' || preset === '2h') && (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--brand-ink, #34D399)',
                }}
              >
                يعود تلقائياً الساعة {previewTimeLabel}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = preset === opt.preset;
              const isFull = opt.preset === 'permanent';
              return (
                <button
                  key={opt.preset}
                  type="button"
                  onClick={() => setPreset(opt.preset)}
                  style={{
                    gridColumn: isFull ? '1 / -1' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    gap: '2px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: isSelected
                      ? '1.5px solid var(--brand)'
                      : '1px solid var(--line)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--brand) 14%, var(--bg))'
                      : 'var(--bg)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    textAlign: 'start',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isSelected ? 'var(--brand-ink, #34D399)' : 'var(--ink)',
                      }}
                    >
                      {opt.label}
                    </span>
                    {isFull && <CalendarOff size={14} style={{ color: 'var(--muted)' }} />}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.35 }}>
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer Visibility Behavior Section */}
        <div style={{ marginBottom: '18px' }}>
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 800,
              color: 'var(--muted)',
              marginBottom: '9px',
            }}
          >
            طريقة الظهور للزبائن
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {[
              {
                key: 'badge' as const,
                title: 'ظهور علامة "غير متوفر"',
                desc: `يبقى ${targetNoun} ظاهراً في المنيو مع علامة غير متوفر حالياً ولا يمكن طلبه`,
                icon: <Ban size={16} />,
              },
              {
                key: 'hide' as const,
                title: 'إخفاء بشكل كامل من الزبائن',
                desc: `يختفي ${targetNoun} نهائياً من واجهة الزبائن طوال مدة الإطفاء`,
                icon: <EyeOff size={16} />,
              },
            ].map((opt) => {
              const active = behavior === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setBehavior(opt.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'start',
                    padding: '11px 12px',
                    borderRadius: '12px',
                    border: active ? '1.5px solid var(--brand)' : '1px solid var(--line)',
                    background: active
                      ? 'color-mix(in srgb, var(--brand) 12%, var(--bg))'
                      : 'var(--bg)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '17px',
                      height: '17px',
                      borderRadius: '50%',
                      border: active ? '5px solid var(--brand)' : '1.5px solid var(--muted)',
                      background: active ? '#fff' : 'transparent',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        lineHeight: 1.3,
                        color: active ? 'var(--brand-ink, #34D399)' : 'var(--ink)',
                      }}
                    >
                      {opt.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--muted)',
                        marginTop: '2px',
                        lineHeight: 1.4,
                      }}
                    >
                      {opt.desc}
                    </div>
                  </div>
                  <span
                    style={{
                      color: active ? 'var(--brand-ink, #34D399)' : 'var(--muted)',
                      flexShrink: 0,
                      display: 'inline-flex',
                    }}
                  >
                    {opt.icon}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{
              minWidth: '90px',
              height: '42px',
              borderRadius: '11px',
              background: 'var(--bg)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              fontWeight: 700,
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => onConfirm(preset, behavior)}
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '11px',
              fontSize: '14px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <PowerOff size={15} />
            <span>تأكيد الإطفاء</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
