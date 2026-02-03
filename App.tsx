
import React, { useState, useTransition, useMemo } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan, generateImageForDay } from './services/geminiService';
import ItineraryPreview from './components/ItineraryPreview';

/**
 * 模擬 Next.js 的 Page 組件
 * 採用 Dashboard 佈局：左側控制參數，右側顯示結果
 */
const Page: React.FC = () => {
  const [tourType, setTourType] = useState<TourType>(TourType.DOMESTIC);
  const [inputMethod, setInputMethod] = useState<InputMethod>(InputMethod.AUTO);
  const [productName, setProductName] = useState('');
  const [extraContent, setExtraContent] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<TourPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState<string>('');
  
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!productName.trim()) {
      setError('請輸入旅遊商品名稱');
      return;
    }

    setError(null);
    setImageProgress('正在構思行程精華...');
    
    startTransition(async () => {
      try {
        const plan = await generateTourPlan(tourType, productName, extraContent);
        
        setImageProgress('正在生成每一天的行程意境圖...');
        const updatedDays = await Promise.all(plan.days.map(async (day) => {
          try {
            const count = day.imageCount || 1;
            const typeLabel = tourType === TourType.DOMESTIC ? "Taiwan" : "International";
            const dayContext = `${typeLabel} travel, Day ${day.day}: ${day.title}. ${day.description.slice(0, 150)}`;

            const imagePromises = [];
            for (let i = 0; i < count; i++) {
              const variations = ["scenic", "vibe", "detail", "atmosphere"];
              imagePromises.push(generateImageForDay(`${dayContext}, ${variations[i % variations.length]}`));
            }
            const base64Images = await Promise.all(imagePromises);
            return { ...day, customImages: base64Images };
          } catch (e) {
            return day;
          }
        }));

        setGeneratedPlan({ ...plan, days: updatedDays });
        setIsEditing(false); // 生成後預設顯示預覽
      } catch (err: any) {
        setError('生成失敗，請稍後再試。');
      } finally {
        setImageProgress('');
      }
    });
  };

  const handlePrint = () => {
    // 延遲執行確保 DOM 狀態穩定
    requestAnimationFrame(() => {
      window.print();
    });
  };

  const handleDownloadHtml = () => {
    if (!generatedPlan) return;
    const content = document.getElementById('itinerary-preview-container')?.innerHTML;
    if (!content) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedPlan.mainTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans TC', sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .no-print { display: none !important; }
        @media print { 
            body { background-color: white !important; } 
            .container-print { padding: 0 !important; width: 100% !important; max-width: none !important; }
        }
    </style>
</head>
<body>
    <div class="max-w-5xl mx-auto py-10 px-4 container-print">${content}</div>
    <div class="text-center py-10 no-print">
        <button onclick="window.print()" style="background: #059669; color: white; padding: 1rem 3rem; border-radius: 1rem; font-weight: 900; cursor: pointer; border: none; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);">🖨️ 列印/存為 PDF</button>
    </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedPlan.mainTitle}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateDayField = (index: number, field: keyof DayPlan, value: any) => {
    if (!generatedPlan) return;
    const newDays = [...generatedPlan.days];
    newDays[index] = { ...newDays[index], [field]: value };
    setGeneratedPlan({ ...generatedPlan, days: newDays });
  };

  // 渲染側邊控制欄
  const renderSidebar = () => (
    <div className="w-full lg:w-96 bg-white border-r border-slate-200 h-screen overflow-y-auto no-print flex flex-col p-8 space-y-8 sticky top-0 z-20 shadow-2xl lg:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 font-black">E</div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Eagle AI</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Next-Gen Engine</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">行程類別</label>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setTourType(TourType.DOMESTIC)} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${tourType === TourType.DOMESTIC ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>國內版</button>
            <button onClick={() => setTourType(TourType.INTERNATIONAL)} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${tourType === TourType.INTERNATIONAL ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>國外版</button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">輸入模式</label>
          <div className="grid grid-cols-3 gap-2">
            {[InputMethod.AUTO, InputMethod.TEXT, InputMethod.FILE].map(m => (
              <button key={m} onClick={() => setInputMethod(m)} className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${inputMethod === m ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <span className="text-xs font-black uppercase tracking-tighter">{m}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">商品名稱</label>
          <input 
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
            placeholder="例如：日本關西賞楓五日..."
            value={productName}
            onChange={e => setProductName(e.target.value)}
          />
        </div>

        {inputMethod === InputMethod.TEXT && (
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">詳細細節/限制</label>
            <textarea 
              className="w-full h-32 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium resize-none"
              placeholder="輸入特定的航班時間、必選景點或餐廳..."
              value={extraContent}
              onChange={e => setExtraContent(e.target.value)}
            />
          </div>
        )}

        <button 
          onClick={handleGenerate}
          disabled={isPending}
          className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all shadow-xl active:scale-95 ${isPending ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}
        >
          {isPending ? (
            <div className="flex flex-col items-center">
              <span className="animate-pulse text-base">正在構思內容...</span>
              <span className="text-[10px] font-normal opacity-60 mt-1">{imageProgress}</span>
            </div>
          ) : '✨ 生成行程簡表'}
        </button>
      </div>

      <div className="mt-auto pt-8 border-t border-slate-100">
        <p className="text-[9px] text-slate-400 leading-relaxed font-medium">大鷹專屬 AI 行程小助手 V2.1<br/>基於 Next.js 15 & Gemini 2.5 系列開發</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      {renderSidebar()}

      <main className="flex-1 p-4 lg:p-12 overflow-y-auto">
        {!generatedPlan ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-5xl mb-8 animate-bounce">🗺️</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">準備好開始您的企劃了嗎？</h2>
            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">在左側輸入商品名稱，AI 將自動為您產出具備專業視覺效果與流暢動線的行程簡表。</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white shadow-xl sticky top-4 z-30 no-print">
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsEditing(!isEditing)} className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${isEditing ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {isEditing ? '👀 預覽模式' : '🛠️ 編輯模式'}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">已就緒</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={handleDownloadHtml} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-black hover:bg-black transition-all">🌐 下載 HTML</button>
                  <button onClick={handlePrint} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">🖨️ 下載 PDF</button>
               </div>
            </div>

            {isEditing ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                {generatedPlan.days.map((day, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-xl group">
                    <div className="flex flex-col lg:flex-row gap-8">
                       <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-xl">D{day.day}</div>
                             <input className="flex-1 text-2xl font-black border-b-2 border-slate-100 focus:border-blue-500 outline-none py-2 px-1 transition-all" value={day.title} onChange={e => updateDayField(idx, 'title', e.target.value)}/>
                          </div>
                          <textarea className="w-full h-32 p-6 rounded-3xl bg-slate-50 border-none text-base text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none resize-none font-medium leading-relaxed" value={day.description} onChange={e => updateDayField(idx, 'description', e.target.value)}/>
                       </div>
                       <div className="lg:w-72 space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">排版佈局</label>
                          <div className="flex bg-slate-200 p-1 rounded-xl">
                             {(['left', 'right', 'bottom'] as ImagePosition[]).map(pos => (
                               <button key={pos} onClick={() => updateDayField(idx, 'imagePosition', pos)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${day.imagePosition === pos ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{pos.toUpperCase()}</button>
                             ))}
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">圖片數量: {day.imageCount}</label>
                            <input type="range" min="1" max="4" className="w-full accent-blue-600" value={day.imageCount} onChange={e => updateDayField(idx, 'imageCount', parseInt(e.target.value))}/>
                          </div>
                          <div className="pt-2 border-t border-slate-200">
                             <p className="text-[10px] font-bold text-slate-400 mb-2">預覽內容</p>
                             <div className="flex gap-1 flex-wrap">
                                {day.customImages?.map((img, i) => <img key={i} src={img} className="w-8 h-8 rounded-md object-cover"/>)}
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div id="itinerary-preview-container" className="animate-in fade-in duration-1000">
                <ItineraryPreview plan={generatedPlan} type={tourType} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Page;
