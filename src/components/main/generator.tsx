import { useRef, useState } from "react"
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CirclePicker } from 'react-color';
import * as htmlToImage from "html-to-image";

type item_t = {
    index: number,
    name: string,
    count: number,
    difficulty: 1 | 2 | 3 | 4 | 5,
}
type req_item_t = Partial<item_t> & Pick<item_t, "index">

const difficulty_colors = ["#03fc7b", "#d7fc03", "#fca103", "#6200a3", "#c4043a"];

function ItemInput({ items, set_item, insert_item }: { items: item_t[], set_item: (item: req_item_t) => void, insert_item: (item: item_t) => void }) {
    const items_ref = useRef<HTMLDivElement>(null);

    return (
        <div
            className="flex-1 flex flex-col gap-2"
            ref={items_ref}
        >
            {
                items.map(item => (
                    <div
                        key={item.index}
                        className="flex flex-row gap-2 items-center"
                    >
                        <div className="w-12 text-center">
                            {item.index + 1}.
                        </div>

                        <Input
                            id="name-input"

                            value={item.name}
                            onChange={(e) => set_item({ ...item, name: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key != "Enter") return;

                                insert_item({ index: item.index + 1, name: "", count: 1, difficulty: 1 });
                                setTimeout(() => {
                                    if (!items_ref.current) return;
                                    
                                    const new_input = items_ref.current.querySelectorAll("input#name-input")[item.index + 1];
                                    if (!new_input) return;

                                    (new_input as HTMLInputElement).focus();
                                }, 0);
                            }}
                        />
                        
                        <Popover>
                            <PopoverTrigger>
                                <div
                                    className="aspect-square w-[36px] border border-input rounded-md"
                                    style={{
                                        borderColor: difficulty_colors[item.difficulty-1],
                                    }}
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-fit!">
                                <div>
                                    <CirclePicker
                                        className="w-fit!"
                                        colors={difficulty_colors}
                                        // @ts-expect-error
                                        onChange={(color) => set_item({ ...item, difficulty: difficulty_colors.indexOf(color.hex) + 1 })}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>

                        <div className="flex flex-row text-lg justify-center w-12">
                            {"×"}{item.count}
                        </div>

                        <div className="flex flex-col gap-0">
                            <Button
                                variant={"outline"}
                                className="h-4.5 rounded-b-none border-b-0 group text-foreground!"
                                onClick={() => set_item({ ...item, count: item.count + 1 })}
                            >
                                <ChevronUp size={10} className="opacity-50 group-hover:opacity-100" />
                            </Button>
                            <Button
                                variant={"outline"}
                                className="h-4.5 rounded-t-none border-t-0 group text-foreground!"
                                onClick={() => set_item({ ...item, count: item.count - 1 })}
                            >
                                <ChevronDown size={10} className="opacity-50 group-hover:opacity-100" />
                            </Button>
                        </div>
                    </div>
                ))
            }
        </div>
    )
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]; // copy to avoid mutating original
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // random index 0..i
    [result[i], result[j]] = [result[j], result[i]]; // swap
  }
  return result;
}

function eval_board(board: (1 | 2 | 3 | 4 | 5)[]): number {
    const n = Math.sqrt(board.length);
    if (!Number.isInteger(n)) return -Infinity;

    const mean =
        board.reduce((s, v) => s + v, 0) / board.length;

    let score = 0;

    /* ---------- ROW BALANCE ---------- */
    for (let r = 0; r < n; r++) {
        let sum = 0;
        for (let c = 0; c < n; c++) {
            sum += board[r * n + c];
        }
        const rowMean = sum / n;
        score -= Math.abs(rowMean - mean);
    }

    /* ---------- COLUMN BALANCE ---------- */
    for (let c = 0; c < n; c++) {
        let sum = 0;
        for (let r = 0; r < n; r++) {
            sum += board[r * n + c];
        }
        const colMean = sum / n;
        score -= Math.abs(colMean - mean);
    }

    /* ---------- LOCAL CLUSTER PENALTY ---------- */
    for (let i = 0; i < board.length; i++) {
        const v = board[i];
        const r = Math.floor(i / n);
        const c = i % n;

        if (c + 1 < n && board[i + 1] === v) score -= 0.75;
        if (r + 1 < n && board[i + n] === v) score -= 0.75;
    }

    /* ---------- GLOBAL VARIANCE TARGET ---------- */
    const variance =
        board.reduce((s, v) => s + (v - mean) ** 2, 0) / board.length;

    const targetVariance = 1.25;
    score -= Math.abs(variance - targetVariance);

    return score;
}

function Compute({ items, length, callback }: { items: item_t[], length: number, callback: (table: item_t[]) => void }) {
    const generate_board = () => {
        const difficulty_map = [...items]
            .map(item => Array.from(Array(item.count)).map(_ => item.difficulty))
            .flat();

        const top_10: { board: (1 | 2 | 3 | 4 | 5)[]; score: number }[] = [];

        // Inline helper function
        const insertTopBoard = (board: (1 | 2 | 3 | 4 | 5)[], score: number) => {
            if (top_10.length < 10) {
                top_10.push({ board, score });
                return;
            }

            let minIndex = 0;
            for (let i = 1; i < top_10.length; i++) {
                if (top_10[i].score < top_10[minIndex].score) minIndex = i;
            }

            if (score > top_10[minIndex].score) {
                top_10[minIndex] = { board, score };
            }
        };

        for (let i = 0; i < 100_000; i++) {
            const board = shuffle(difficulty_map).slice(0, length ** 2);
            const score = eval_board(board);

            insertTopBoard(board, score);
        }

        const difficulty_board = top_10[Math.floor(Math.random() * top_10.length)].board;
        let reducing_items = items.map(item => ({ ...item }));

        const board: item_t[] = [];
        for (const difficulty of difficulty_board) {
            const mapped_items = reducing_items.filter(item => item.difficulty == difficulty);
            const item = mapped_items[Math.floor(Math.random() * mapped_items.length)];

            if (item.count > 1) item.count --;
            else reducing_items = reducing_items.filter(i => i.index != item.index);

            board.push(item);
        }
        
        callback(board);
    };

    return (
        <div className="flex flex-row gap-2">
            <Button onClick={generate_board} className="flex-1">
                Generate Board
            </Button>
            <Button onClick={() => callback([])} variant={"secondary"}>
                Reset Board
            </Button>
        </div>
    )
}

import { forwardRef } from "react";

const Board = forwardRef<HTMLDivElement, { board: item_t[], length?: number }>(({ board, length = 1 }, ref) => {
    const size = board && board.length > 0 ? Math.sqrt(board.length) : length;
    const table: item_t[][] = [];

    for (let r = 0; r < size; r++) {
        const row: item_t[] = [];
        for (let c = 0; c < size; c++) {
            const idx = r * size + c;
            row.push(
                board[idx]
                    ? board[idx]
                    : ({ name: "-", difficulty: 1 } as item_t)
            );
        }
        table.push(row);
    }

    return (
        <div ref={ref} className="flex-1 aspect-square flex flex-col gap-2 p-2 bg-background">
            {table.map((row, r) => (
                <div key={r} className="flex flex-row flex-1 gap-2">
                    {row.map((cell, c) => (
                        <div
                            key={c}
                            className="flex-1 aspect-square flex items-center justify-center border rounded-sm text-center p-4"
                            style={{
                                borderColor: `${cell.name !== "-" && difficulty_colors[cell.difficulty - 1]}`,
                            }}
                        >
                            {cell.name}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
});

export default function BoardGenerator() {
    const [items, set_items] = useState<item_t[]>([{ index: 0, name: "", count: 1, difficulty: 1 }]);
    const [board, set_board] = useState<item_t[]>([]);
    const board_ref = useRef<HTMLDivElement>(null);

    const set_item = (item: req_item_t) => {
        set_items(prev => {
            const next = [...prev];
            next[item.index] = { ...next[item.index], ...item };
            return next;
        })
    }

    const insert_item = (item: item_t) => {
        set_items(prev => {
            const next = [...prev];
            const next_left = next.slice(0, item.index);
            const next_right = next.slice(item.index).map(item => ({ ...item, index: item.index + 1 }));
            return [...next_left, item, ...next_right];
        })
    }

    const length = Math.trunc(Math.sqrt(items.reduce((sum, item) => sum + item.count, 0)));

    const exportPNG = async () => {
        const el = board_ref.current;
        if (!el) return;
        
        const dataUrl = await htmlToImage.toPng(el, {
            pixelRatio: 2,
            skipFonts: true,
            style: {
                fontFamily: "'Architects Daughter', system-ui, sans-serif",
            },
        });

        const link = document.createElement("a");
        link.download = "board.png";
        link.href = dataUrl;
        link.click();
    };

    const copyToClipboard = async () => {
        const el = board_ref.current;
        if (!el) return;

        const blob = await htmlToImage.toBlob(el, {
            pixelRatio: 2,
            skipFonts: true,
            style: {
                fontFamily: "'Architects Daughter', system-ui, sans-serif",
            },
        });

        if (!blob) return;

        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
        ]);
    };

    return (
        <div className="flex flex-row gap-12 px-12">
            <div className="flex-1 flex flex-col gap-2">
                <ItemInput {...{ items, set_item, insert_item }} />
                <Compute {...{ items, length }} callback={table => table.length > 0 ? set_board(table) : (() => { set_board(table); set_items([{ index: 0, name: "", count: 1, difficulty: 1 }]) })()} />
                <div className="flex flex-row-reverse gap-2">
                    <Button variant={"secondary"} onClick={copyToClipboard}>
                        Copy to Clipboard
                    </Button>
                    <Button variant={"secondary"} onClick={exportPNG}>
                        Save as File
                    </Button>
                </div>
            </div>
            <Board ref={board_ref} {...{ board, length }} />
        </div>
    )
}