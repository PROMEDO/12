/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Restaurant } from '../types';
import { buildDefaultAddons } from '../data/addonsCatalog';
import { getCollection, getItem } from './storage';

let sharedBellAudioCtx: AudioContext | null = null;
let pendingBellTone: 'chime' | 'bell' | 'alert' | null = null;
let lastBellTriggeredAt = 0;

function getOrCreateBellAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedBellAudioCtx || sharedBellAudioCtx.state === 'closed') {
    sharedBellAudioCtx = new AudioCtx();
  }
  return sharedBellAudioCtx;
}

function scheduleBellChime(ctx: AudioContext, tone: 'chime' | 'bell' | 'alert') {
  const nowMs = Date.now();
  if (nowMs - lastBellTriggeredAt < 250) return;
  lastBellTriggeredAt = nowMs;

  const baseNow = ctx.currentTime + 0.02;
  const repeatInterval = tone === 'chime' ? 0.95 : tone === 'alert' ? 0.8 : 0.85;
  const repeatCount = 3;

  const baseNotes: Array<{ freq: number; delay: number; duration: number; gain: number; shimmer?: number }> =
    tone === 'bell'
      ? [
          { freq: 987.77, delay: 0, duration: 0.48, gain: 0.11, shimmer: 1975.53 },
          { freq: 1318.51, delay: 0.13, duration: 0.68, gain: 0.125, shimmer: 2637.02 },
        ]
      : tone === 'alert'
      ? [
          { freq: 659.25, delay: 0, duration: 0.28, gain: 0.1, shimmer: 1318.51 },
          { freq: 880, delay: 0.14, duration: 0.42, gain: 0.115, shimmer: 1760 },
        ]
      : [
          { freq: 587.33, delay: 0, duration: 0.34, gain: 0.1 },
          { freq: 783.99, delay: 0.11, duration: 0.4, gain: 0.11 },
          { freq: 1046.5, delay: 0.22, duration: 0.56, gain: 0.105, shimmer: 2093 },
        ];

  for (let rep = 0; rep < repeatCount; rep++) {
    const repOffset = rep * repeatInterval;
    const isFinalRepeat = rep === repeatCount - 1;

    baseNotes.forEach(({ freq, delay, duration, gain: peakGain, shimmer }) => {
      const start = baseNow + repOffset + delay;
      const finalDur = isFinalRepeat ? duration * 1.25 : duration;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = tone === 'alert' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.linearRampToValueAtTime(peakGain, start + 0.014);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + finalDur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + finalDur + 0.03);

      if (shimmer) {
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = 'sine';
        shimmerOsc.frequency.setValueAtTime(shimmer, start);
        shimmerGain.gain.setValueAtTime(0.0001, start);
        shimmerGain.gain.linearRampToValueAtTime(0.02, start + 0.012);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + finalDur * 0.72);
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmerOsc.start(start);
        shimmerOsc.stop(start + finalDur + 0.03);
      }
    });
  }
}

export function unlockBellAudio() {
  try {
    const ctx = getOrCreateBellAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        try {
          const silentBuf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = silentBuf;
          src.connect(ctx.destination);
          src.start(0);
        } catch {
          // ignore silent buffer errors
        }
        if (pendingBellTone && ctx.state === 'running') {
          const queued = pendingBellTone;
          pendingBellTone = null;
          scheduleBellChime(ctx, queued);
        }
      });
    } else if (pendingBellTone && ctx.state === 'running') {
      const queued = pendingBellTone;
      pendingBellTone = null;
      scheduleBellChime(ctx, queued);
    }
  } catch {
    // ignore browser audio restrictions
  }
}

export function playBellTone(tone: 'chime' | 'bell' | 'alert' = 'bell') {
  try {
    const ctx = getOrCreateBellAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      pendingBellTone = tone;
      void ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            pendingBellTone = null;
            scheduleBellChime(ctx, tone);
          }
        })
        .catch(() => {});
      return;
    }
    pendingBellTone = null;
    scheduleBellChime(ctx, tone);
  } catch {
    // ignore audio autoplay restrictions
  }
}

const NOTIFIED_ORDERS_PREFIX = 'mp_notified_orders_v1:';
const MAX_STORED_ORDER_IDS = 400;

export function getNotifiedOrderIds(rid: string): Set<string> {
  if (typeof window === 'undefined' || !rid) return new Set();
  try {
    const raw = window.localStorage.getItem(`${NOTIFIED_ORDERS_PREFIX}${rid}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function markOrdersAsNotified(rid: string, orderIds: string[]): void {
  if (typeof window === 'undefined' || !rid || orderIds.length === 0) return;
  try {
    const existing = Array.from(getNotifiedOrderIds(rid));
    const mergedSet = new Set(existing);
    orderIds.forEach((id) => {
      const clean = String(id || '').trim();
      if (clean) mergedSet.add(clean);
    });
    const list = Array.from(mergedSet).slice(-MAX_STORED_ORDER_IDS);
    window.localStorage.setItem(`${NOTIFIED_ORDERS_PREFIX}${rid}`, JSON.stringify(list));
  } catch {
    // ignore localStorage quota/privacy errors
  }
}

/**
 * Checks pending/new orders for `ownerRid`.
 * Fires bell sound + toast message once per order ID and persists notified IDs in localStorage
 * so page refreshes never replay notifications for already-notified orders.
 */
export function checkAndNotifyPendingOrders(
  ownerRid: string,
  showToast: (msg: string) => void,
  opts?: { isDashboardRoute?: boolean }
): Order[] {
  const rid = String(ownerRid || '').trim();
  if (!rid) return [];

  const allOrders = getCollection<Order>('orders')
    .filter((o) => o.rid === rid)
    .sort((a, b) => (b.at || 0) - (a.at || 0));

  if (allOrders.length === 0) return [];

  const notifiedIds = getNotifiedOrderIds(rid);
  const pendingUnnotified = allOrders.filter(
    (o) => (o.st === 'new' || o.status === 'pending') && !notifiedIds.has(o.id)
  );

  if (pendingUnnotified.length === 0) return [];

  // Mark immediately before alerting so rapid events or refreshes never replay the same notification
  markOrdersAsNotified(
    rid,
    pendingUnnotified.map((o) => o.id)
  );

  const rest = getItem<Restaurant>(`restaurants/${rid}`);
  const addonsState = buildDefaultAddons(rest || undefined);
  const bellAllowed = !addonsState.audioBell?.mutedByUser && addonsState.audioBell?.enabled !== false;

  if (bellAllowed) {
    playBellTone(addonsState.audioBell?.tone || 'bell');
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([160, 80, 160]);
    }
  } catch {
    // ignore unsupported vibration API
  }

  const latest = pendingUnnotified[0];
  const seqVal = latest?.orderSeq || latest?.seq;
  const seqLabel = seqVal ? `#${seqVal}` : `#${String(latest?.id || '').slice(-6).toUpperCase()}`;
  const isFreshLiveArrival = Date.now() - (Number(latest?.at) || 0) < 12000;

  if (opts?.isDashboardRoute && !isFreshLiveArrival) {
    showToast(
      pendingUnnotified.length === 1
        ? `يوجد طلب جديد بانتظار المراجعة (${seqLabel})`
        : `يوجد ${pendingUnnotified.length} طلبات جديدة بانتظار المراجعة`
    );
  } else {
    showToast(
      pendingUnnotified.length === 1
        ? `وصل طلب جديد (${seqLabel})`
        : `وصلت ${pendingUnnotified.length} طلبات جديدة`
    );
  }

  return pendingUnnotified;
}
