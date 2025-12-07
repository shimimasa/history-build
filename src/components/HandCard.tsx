// src/components/HandCard.tsx

import React from "react";
import type { Card } from "../game/gameState";
import { CardView } from "./CardView";
import { renderTypeLabel } from "./shared"; // 既存のまま（他の場所で使用）

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
  const isAction = card.type === "person" || card.type === "event";

  const baseClass = "hb-hand-card";
  const selectedClass = selected ? " hb-hand-card-selected" : "";
  const disabledClass = disabled
    ? " opacity-60 cursor-not-allowed"
    : " hover:-translate-y-1";

  return (
    <div
      className={baseClass + selectedClass + disabledClass}
      onClick={disabled ? undefined : onSelect}
    >
      {/* カード本体の見た目 */}
      <div className="mb-1">
        <CardView
          card={card}
          variant="hand"
          // 選択状態は highlight で枠カラーを変える
          highlight={selected && !disabled}
          // クリックでの選択は親 div の onClick で処理するため CardView には onClick を渡さない
          disabled={disabled}
        />
      </div>

      {/* 下部の「くわしく」/「つかう」エリア（旧UIを維持） */}
      <div className="mt-1 flex items-center justify-between">
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