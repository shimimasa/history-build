// src/components/HandCard.tsx

import React from "react";
import type { Card } from "../logic/cardEffects";
import { renderTypeLabel } from "./shared";

interface HandCardProps {
  card: Card;
  disabled: boolean;
  onPlay: () => void;
  onShowDetail: () => void;
}

const HandCard: React.FC<HandCardProps> = ({
  card,
  disabled,
  onPlay,
  onShowDetail
}) => {
  const isAction = card.type === "character" || card.type === "event";

  return (
    <div className="shrink-0 min-w-[120px] max-w-[160px] border border-slate-600 rounded-md p-2 bg-slate-900/80 flex flex-col justify-between">
      <div>
        <div className="text-xs font-semibold mb-1">{card.name}</div>
        <div className="text-[10px] text-slate-300 mb-1">
          種類: {renderTypeLabel(card.type)}
        </div>
        <div className="text-[10px] text-slate-300 mb-1">
          コスト: 米 {card.cost}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-3">
          {card.text}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          className="text-[10px] text-sky-300 hover:text-sky-100 underline"
          onClick={onShowDetail}
        >
          くわしく
        </button>
        {isAction ? (
          <button
            className="px-2 py-1 rounded bg-emerald-600 text-[10px] disabled:bg-slate-700 disabled:opacity-60"
            onClick={onPlay}
            disabled={disabled}
          >
            つかう
          </button>
        ) : (
          <span className="text-[10px] text-slate-500">
            （自動でつかわれる）
          </span>
        )}
      </div>
    </div>
  );
};

export default HandCard;


