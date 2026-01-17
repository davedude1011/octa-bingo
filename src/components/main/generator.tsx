import { useRef, useState, forwardRef } from "react"
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp, X, Grid, MousePointer2, Copy, Download, RotateCcw } from "lucide-react";
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

function ItemInput({ items, set_item, insert_item, remove_item }: { 
    items: item_t[], 
    set_item: (item: req_item_t) => void, 
    insert_item: (item: item_t) => void,
    remove_item: (index: number) => void
}) {
    const items_ref = useRef<HTMLDivElement>(null);

    return (
        <div
            className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-2"
            ref={items_ref}
        >
            {items.map((item, idx) => (
                <div key={item.index} className="flex flex-row gap-2 items-center">
                    <div className="w-8 text-center text-xs opacity-40 font-mono shrink-0">
                        {idx + 1}.
                    </div>

                    <Input
                        id="name-input"
                        placeholder="Item name..."
                        value={item.name}
                        className="h-9"
                        onChange={(e) => set_item({ ...item, name: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            insert_item({ index: item.index + 1, name: "", count: 1, difficulty: 1 });
                            setTimeout(() => {
                                const inputs = items_ref.current?.querySelectorAll("input#name-input");
                                (inputs?.[idx + 1] as HTMLInputElement)?.focus();
                            }, 0);
                        }}
                    />
                    
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className="aspect-square w-9 border border-input rounded-md shrink-0 transition-transform active:scale-95"
                                style={{ backgroundColor: difficulty_colors[item.difficulty-1] }}
                            />
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-3">
                            <CirclePicker
                                width="180px"
                                colors={difficulty_colors}
                                onChange={(color) => set_item({ ...item, difficulty: (difficulty_colors.indexOf(color.hex) + 1) as 1 | 2 | 3 | 4 | 5 | undefined })}
                            />
                        </PopoverContent>
                    </Popover>

                    <div className="flex flex-row text-sm justify-center w-6 font-mono shrink-0">
                        {item.count}
                    </div>

                    <div className="flex flex-col gap-0 shrink-0">
                        <Button
                            variant="outline"
                            className="h-[18px] w-8 p-0 rounded-b-none border-b-0"
                            onClick={() => set_item({ ...item, count: item.count + 1 })}
                        >
                            <ChevronUp size={10} />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-[18px] w-8 p-0 rounded-t-none border-t-0"
                            onClick={() => set_item({ ...item, count: Math.max(1, item.count - 1) })}
                        >
                            <ChevronDown size={10} />
                        </Button>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => remove_item(item.index)}
                    >
                        <X size={14} />
                    </Button>
                </div>
            ))}
        </div>
    )
}

const Board = forwardRef<HTMLDivElement, { board: item_t[], width: number, height: number }>(({ board, width, height }, ref) => {
    return (
        <div 
            ref={ref} 
            className="w-full h-full bg-background border shadow-sm overflow-hidden p-4 gap-4"
            style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${width}, 1fr)`,
                gridTemplateRows: `repeat(${height}, 1fr)`,
            }}
        >
            {Array.from({ length: width * height }).map((_, i) => {
                const cell = board[i];
                const hasItem = cell && cell.name !== "-";
                return (
                    <div
                        key={i}
                        className="border rounded-sm flex items-center justify-center text-center p-1 overflow-hidden"
                        style={{
                            borderColor: hasItem ? difficulty_colors[cell.difficulty - 1] : "#e5e7eb",
                            backgroundColor: hasItem ? `${difficulty_colors[cell.difficulty - 1]}15` : "transparent",
                        }}
                    >
                        <span className="text-[min(2vw,1.5vh,14px)] font-medium leading-tight break-words line-clamp-3">
                            {hasItem ? cell.name : ""}
                        </span>
                    </div>
                );
            })}
        </div>
    );
});

export default function BoardGenerator() {
    const [items, set_items] = useState<item_t[]>([{ index: 0, name: "", count: 1, difficulty: 1 }]);
    const [board, set_board] = useState<item_t[]>([]);
    const [manualSize, setManualSize] = useState(false);
    const [customSize, setCustomSize] = useState({ w: 5, h: 5 });
    const board_ref = useRef<HTMLDivElement>(null);

    const autoDim = Math.max(1, Math.trunc(Math.sqrt(items.reduce((sum, item) => sum + item.count, 0))));
    const width = manualSize ? customSize.w : autoDim;
    const height = manualSize ? customSize.h : autoDim;

    const set_item = (item: req_item_t) => {
        set_items(prev => prev.map(i => i.index === item.index ? { ...i, ...item } : i));
    }

    const insert_item = (item: item_t) => {
        set_items(prev => {
            const next = [...prev];
            next.splice(item.index, 0, item);
            return next.map((it, i) => ({ ...it, index: i }));
        });
    }

    const remove_item = (index: number) => {
        if (items.length <= 1) return;
        set_items(prev => prev.filter(i => i.index !== index).map((it, i) => ({ ...it, index: i })));
    }

    const generate_board = () => {
        const totalCells = width * height;
        const difficulty_pool = items.flatMap(item => Array(item.count).fill(item.difficulty));
        while (difficulty_pool.length < totalCells) difficulty_pool.push(1);

        const shuffle = <T,>(arr: T[]): T[] => {
            const res = [...arr];
            for (let i = res.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [res[i], res[j]] = [res[j], res[i]];
            }
            return res;
        };

        const board_diffs = shuffle(difficulty_pool).slice(0, totalCells);
        const temp_items = items.map(it => ({ ...it }));
        
        const final_board = board_diffs.map(diff => {
            const available = temp_items.filter(it => it.difficulty === diff && it.name.trim() !== "" && it.count > 0);
            if (available.length === 0) return { name: "-", difficulty: diff } as item_t;
            
            const pick = available[Math.floor(Math.random() * available.length)];
            pick.count--;
            return { ...pick };
        });

        set_board(final_board);
    };

    const handleExport = async (type: 'png' | 'copy') => {
        if (!board_ref.current) return;
        const config = { pixelRatio: 2, skipFonts: true };
        if (type === 'png') {
            const url = await htmlToImage.toPng(board_ref.current, config);
            const l = document.createElement("a"); l.download = "board.png"; l.href = url; l.click();
        } else {
            const blob = await htmlToImage.toBlob(board_ref.current, config);
            if (blob) navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        }
    };

    return (
        <div className="flex flex-row h-screen w-full gap-0 overflow-hidden bg-background">
            {/* Sidebar */}
            <div className="w-[400px] flex flex-col gap-4 border-r p-6 h-full shrink-0">
                <div className="flex items-center justify-between shrink-0 mb-2">
                    <h2 className="font-bold text-sm uppercase tracking-widest opacity-70">Item Configuration</h2>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-mono uppercase">
                        Pool: {items.reduce((s, i) => s + i.count, 0)}
                    </span>
                </div>

                <ItemInput {...{ items, set_item, insert_item, remove_item }} />

                {/* Controls Area */}
                <div className="shrink-0 flex flex-col gap-3 pt-6 border-t mt-auto">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant={manualSize ? "secondary" : "outline"} 
                            size="sm" 
                            className="flex-1 h-8 text-xs gap-2"
                            onClick={() => setManualSize(!manualSize)}
                        >
                            {manualSize ? <MousePointer2 size={12}/> : <Grid size={12}/>}
                            {manualSize ? "Manual Mode" : "Auto-Square"}
                        </Button>
                    </div>

                    {manualSize && (
                        <div className="flex flex-row items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex-1">
                                <span className="text-[10px] font-bold opacity-40 block mb-1">WIDTH</span>
                                <Input type="number" className="h-8" value={customSize.w} onChange={e => setCustomSize({...customSize, w: Math.max(1, parseInt(e.target.value) || 1)})} />
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] font-bold opacity-40 block mb-1">HEIGHT</span>
                                <Input type="number" className="h-8" value={customSize.h} onChange={e => setCustomSize({...customSize, h: Math.max(1, parseInt(e.target.value) || 1)})} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-5 gap-2 mt-2">
                        <Button onClick={generate_board} className="col-span-4 h-10 font-bold uppercase tracking-tight">Generate Board</Button>
                        <Button onClick={() => {set_board([]); set_items([{ index: 0, name: "", count: 1, difficulty: 1 }])}} variant="outline" className="h-10"><RotateCcw size={16}/></Button>
                    </div>
                    
                    <div className="flex flex-row gap-2">
                        <Button variant="secondary" onClick={() => handleExport('png')} className="flex-1 h-8 text-[10px] gap-2 uppercase font-bold"><Download size={12}/>Save PNG</Button>
                        <Button variant="secondary" onClick={() => handleExport('copy')} className="flex-1 h-8 text-[10px] gap-2 uppercase font-bold"><Copy size={12}/>Copy Image</Button>
                    </div>
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 h-full bg-muted/20 p-8 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full max-w-5xl max-h-5xl flex items-center justify-center">
                    <Board ref={board_ref} {...{ board, width, height }} />
                </div>
            </div>
        </div>
    )
}