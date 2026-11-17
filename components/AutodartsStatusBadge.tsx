// components/AutodartsStatusBadge.tsx
'use client';

import { useState } from 'react';
import { useAutodarts } from '@/lib/hooks/useAutodarts';

export function AutodartsStatusBadge() {
  const { isConnected, lastThrow, lastEventTime, simulateThrow, simulateTakeout } = useAutodarts();
  const [isOpen, setIsOpen] = useState(false);
  const [testSegment, setTestSegment] = useState('T20');
  const [copied, setCopied] = useState(false);

  const endpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/autodarts/throw` : '/api/autodarts/throw';

  const samplePython = `# autodarts_pylkoors_bridge.py
import requests
import json
import time

PYLKOORS_URL = "${endpointUrl}"

def send_dart(segment, dart_index=1):
    payload = {
        "segment": segment,
        "dartIndex": dart_index,
        "timestamp": int(time.time() * 1000)
    }
    try:
        r = requests.post(PYLKOORS_URL, json=payload, timeout=2)
        print(f"Sent {segment}: {r.status_code}")
    except Exception as e:
        print(f"Error: {e}")

# Example: simulate 3 darts & takeout
send_dart("T20", 1)
send_dart("T20", 2)
send_dart("T20", 3)
requests.post(PYLKOORS_URL, json={"type": "TAKEOUT"})
`;

  const copyScript = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(samplePython);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 text-xs transition-all shadow-md group"
        title="Autodarts Raspberry Pi Bridge Status"
      >
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected ? 'bg-emerald-500' : 'bg-rose-500/80'
            }`}
          ></span>
        </span>
        <span className="font-bold text-[11px] text-slate-300 group-hover:text-cyan-400 transition-colors uppercase tracking-wider">
          Autodarts {isConnected ? 'Live' : 'Bridge'}
        </span>
        {lastThrow && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
            {lastThrow.raw}
          </span>
        )}
      </button>

      {/* Modal / Flyout Guide & Diagnostics */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border-2 border-cyan-500/30 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Raspberry Pi Autodarts Bridge
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct Webhook / HTTP Event Pipeline (<span className="text-cyan-400">&lt;50ms latency</span>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Connection Status Box */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/50 border border-white/5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      isConnected ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-white uppercase">
                      {isConnected ? 'Client Connected & Listening' : 'Waiting for Raspberry Pi Events'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {lastEventTime
                        ? `Last event received: ${new Date(lastEventTime).toLocaleTimeString()}`
                        : 'No throws recorded this session'}
                    </p>
                  </div>
                </div>
                {lastThrow && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Last Dart</span>
                    <span className="text-xl font-black text-cyan-400">{lastThrow.raw}</span>
                  </div>
                )}
              </div>

              {/* Target Webhook Endpoint */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Raspberry Pi POST Webhook Target
                </label>
                <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-white/10 font-mono text-xs text-cyan-300 select-all">
                  <span className="flex-1 truncate">{endpointUrl}</span>
                </div>
              </div>

              {/* Quick Interactive Throw Simulator */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2">
                  ⚡ Throw Pipeline Test Bench
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {['T20', 'T19', 'D16', 'BULL', '25', 'S20', 'MISS'].map((seg) => (
                    <button
                      key={seg}
                      onClick={() => simulateThrow(seg, 1)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-400 hover:text-cyan-300 text-xs font-mono font-bold text-slate-300 transition-all active:scale-95"
                    >
                      {seg}
                    </button>
                  ))}
                  <button
                    onClick={() => simulateTakeout()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all active:scale-95 ml-auto"
                  >
                    ↺ Next Turn / Takeout
                  </button>
                </div>
              </div>

              {/* Raspberry Pi Script Accordion */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Raspberry Pi Python Listener Script
                  </span>
                  <button
                    onClick={copyScript}
                    className="text-[10px] font-bold text-cyan-400 hover:underline uppercase"
                  >
                    {copied ? '✓ Copied!' : 'Copy Script'}
                  </button>
                </div>
                <pre className="bg-black/90 p-3 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
                  {samplePython}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
