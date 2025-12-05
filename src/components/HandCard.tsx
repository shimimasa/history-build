// src/components/HandCard.tsx

import React from "react";
import type { Card } from "../logic/cardEffects";
import { renderTypeLabel } from "./shared";

interface HandCardProps {
  card: Card;
  disabled: boolean;
  selected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onShowDetail: () => void;
}

const HandCard: React.FC<HandCardProps> = ({
  card,
  disabled,
  selected,
  onSelect,
  onPlay,
  onShowDetail
}) => {
  const isAction = card.type === "character" || card.type === "event";

  const baseClass = "hb-hand-card";
  const selectedClass = selected ? " hb-hand-card-selected" : "";
  const disabledClass = disabled ? " opacity-60 cursor-not-allowed" : " hover:-translate-y-1";

  return (
    <div
      className={baseClass + selectedClass + disabledClass}
      onClick={disabled ? undefined : onSelect}
    >
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
          onClick={(e) => {
            e.stopPropagation();
            onShowDetail();
          }}
        >
          くわしく
        </button>
        {isAction ? (
          <button
            className="px-2 py-1 rounded bg-emerald-600 text-[10px] disabled:bg-slate-700 disabled:opacity-60"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                onPlay();
              }
            }}
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