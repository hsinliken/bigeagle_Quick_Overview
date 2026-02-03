
import React, { useState, useTransition, useEffect } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan, generateImageForDay } from './services/geminiService';
import ItineraryPreview from './components/ItineraryPreview';

// 宣告 window 上的 aistudio 擴充功能
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // FIX: Add optional modifier to match potential existing declarations and fix modifier conflict.
    aistudio?: AIStudio;
  }
}

const Page: React.FC = () => {
  const [tourType, setTourType] = useState<TourType>(TourType.DOMESTIC);
  const [inputMethod, setInputMethod] = useState<InputMethod>(InputMethod.AUTO);
  const [productName, setProductName] = useState('');
  const [extraContent, setExtraContent] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<TourPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState<string>('');
  const [regeneratingDays, setRegeneratingDays] = useState<Set<number>>(new Set());
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          setHasApiKey(false);
        }
      } else {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
      } catch (e) {
        console.error("Failed to open key selector:", e);
      }
    }
    setHasApiKey(true);
  };

  const handleGenerate = () => {
    if (!productName.trim()) {
      setError('請輸入旅遊商品名稱。');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError(null);
    setImageProgress('正在構思行程精華...');
    
    startTransition(async () => {
      try {
        const plan = await generateTourPlan(tourType, productName, extraContent);
        
        setImageProgress('正在生成行程意境圖...');
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
        setIsEditing(false);
      } catch (err: any) {
        console.error("Generation error:", err);
        const errMsg = err.message || "";
        if (errMsg.includes("Requested entity was not found") || errMsg.includes("API Key must be set") || errMsg.includes("API_KEY is not defined")) {
          setError("API 金鑰失效或未正確設定。");
          setHasApiKey(false);
        } else {
          setError(`生成失敗：${errMsg || '請確認網路連線，稍後再試。'}`);
        }
      } finally {
        setImageProgress('');
      }
    });
  };

  const handleRegenerateDayImages = async (dayIndex: number) => {
    if (!generatedPlan) return;
    const day = generatedPlan.days[dayIndex];
    setRegeneratingDays(prev => new Set(prev).add(day.day));
    
    try {
      const count = day.imageCount || 1;
      const typeLabel = tourType === TourType.DOMESTIC ? "Taiwan" : "International";
      const dayContext = `${typeLabel} travel, Day ${day.day}: ${day.title}. ${day.description.slice(0, 150)}`;
      const imagePromises = [];
      for (let i = 0; i < count; i++) {
        const variations = ["scenic", "vibe", "landscape", "architecture"];
        const randomVariation = variations[Math.floor(Math.random() * variations.length)];
        imagePromises.push(generateImageForDay(`${dayContext}, ${randomVariation}`));
      }
      const base64Images = await Promise.all(imagePromises);
      const newDays = [...generatedPlan.days];
      newDays[dayIndex] = { ...day, customImages: base64Images };
      setGeneratedPlan({ ...generatedPlan, days: newDays });
    } catch (err: any) {
       if (err.message?.includes("Requested entity was not found")) {
         setHasApiKey(false);
       }
    } finally {
      setRegeneratingDays(prev => {
        const next = new Set(prev);
        next.delete(day.day);
        return next;
      });
    }
  };

  const handlePrint = () => {
    if (!generatedPlan) return;
    if (isEditing) {
      setIsEditing(false);
      setTimeout(() => window.print(), 500);
    } else {
      window.print();
    }
  };

  const handleDownloadHtml = () => {
    if (!generatedPlan) return;
    const content = document.getElementById('itinerary-preview-container')?.innerHTML;
    if (!content) return;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><style>body{font-family:'Noto Sans TC',sans-serif;background:#f8fafc}@media print{.no-print{display:none!important}}</style></head><body><div class="max-w-5xl mx-auto py-10 px-4">${content}</div></body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedPlan.mainTitle}.html`;
    link.click();
  };

  if (hasApiKey === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-2xl shadow-blue-500/20">🔑</div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tighter">API 金鑰授權</h1>
        <p className="text-slate-400 max-w-md mb-8 leading-relaxed font-medium">
          系統偵測到未選取 API 金鑰或金鑰已失效。請點擊下方按鈕選取一個有效的 Google AI Studio 付費專案金鑰。
        </p>
        <button 
          onClick={handleOpenKeySelector}
          className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95 mb-6"
        >
          選取 / 重新驗證金鑰
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 text-xs font-bold hover:underline"
        >
          查看 Google API 計費文件說明
        </a>
      </div>
    );
  }

  const renderSidebar = () => (
    <div className="w-full lg:w-96 bg-white border-r border-slate-200 h-screen overflow-y-auto no-print flex flex-col p-8 space-y-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 font-black text-lg tracking-tighter">EA</div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Eagle AI</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Next-Gen Engine</p>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-in fade-in slide-in-from-top-1">
            <div className="flex">
              <div className="ml-3 flex-1">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-500">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">行程類別</label>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setTourType(TourType.DOMESTIC)} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${tourType === TourType.DOMESTIC ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>國內版</button>
            <button onClick={() => setTourType(TourType.INTERNATIONAL)} className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${tourType === TourType.INTERNATIONAL ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>國外版</button>
          </div>
        </div>

        {/* 重新加入的輸入模式選擇區塊 */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">輸入模式</label>
          <div className="grid grid-cols-3 gap-2">
            {[InputMethod.AUTO, InputMethod.TEXT, InputMethod.FILE].map(m => (
              <button 
                key={m} 
                onClick={() => setInputMethod(m)} 
                className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${inputMethod === m ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-50 text-slate-400 hover:border-slate-100'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-tighter">{m}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">商品名稱</label>
          <input 
            className={`w-full px-4 py-3 rounded-xl bg-slate-50 border transition-all font-bold text-slate-800 placeholder:text-slate-300 outline-none ${error && !productName.trim() ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-100 focus:bg-white focus:border-blue-500'}`}
            placeholder="例如：日本關西賞楓五日..."
            value={productName}
            onChange={e => setProductName(e.target.value)}
          />
        </div>

        {/* 只有在 TEXT 模式下才顯示額外填寫區 */}
        {inputMethod === InputMethod.TEXT && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">詳細要求與限制</label>
            <textarea 
              className="w-full h-40 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium resize-none leading-relaxed"
              placeholder="請輸入特定的航班時間、必選景點、餐食限制或其他行程細節..."
              value={extraContent}
              onChange={e => setExtraContent(e.target.value)}
            />
          </div>
        )}

        {inputMethod === InputMethod.FILE && (
          <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
             <div className="text-2xl mb-2">📄</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">即將推出：PDF/圖片解析</p>
             <p className="text-[9px] text-slate-300 font-medium mt-1">目前請先使用「文字輸入」模式</p>
          </div>
        )}

        <button 
          onClick={handleGenerate}
          disabled={isPending}
          className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center ${isPending ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-black'}`}
        >
          {isPending ? (
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="text-base">生成中...</span>
              </span>
              <span className="text-[10px] font-normal opacity-60 mt-1">{imageProgress}</span>
            </div>
          ) : '✨ 生成行程簡表'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {renderSidebar()}
      <main className="flex-1 p-4 lg:p-12 overflow-y-auto">
        {!generatedPlan ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-5xl mb-8 animate-bounce">🗺️</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">準備好開始企劃了嗎？</h2>
            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">選擇輸入模式並提供商品資訊，AI 將為您即時產出專業行程。</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white shadow-xl sticky top-4 z-30 no-print">
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsEditing(!isEditing)} className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${isEditing ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{isEditing ? '👀 預覽模式' : '🛠️ 編輯模式'}</button>
                  <span className="text-[10px] text-emerald-500 font-black tracking-widest uppercase">● 已就緒</span>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={handleDownloadHtml} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-black hover:bg-black">🌐 HTML</button>
                  <button onClick={handlePrint} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 shadow-lg shadow-emerald-100">🖨️ PDF</button>
               </div>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                {generatedPlan.days.map((day, idx) => {
                  const isDayRegenerating = regeneratingDays.has(day.day);
                  return (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                      <div className="flex flex-col lg:flex-row gap-8">
                         <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-xl">D{day.day}</div>
                               <input className="flex-1 text-2xl font-black border-b-2 border-slate-100 focus:border-blue-500 outline-none py-2 px-1" value={day.title} onChange={e => {
                                 const newDays = [...generatedPlan.days];
                                 newDays[idx].title = e.target.value;
                                 setGeneratedPlan({...generatedPlan, days: newDays});
                               }}/>
                            </div>
                            <textarea className="w-full h-32 p-6 rounded-3xl bg-slate-50 border-none text-base text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none resize-none font-medium" value={day.description} onChange={e => {
                               const newDays = [...generatedPlan.days];
                               newDays[idx].description = e.target.value;
                               setGeneratedPlan({...generatedPlan, days: newDays});
                            }}/>
                         </div>
                         <div className="lg:w-72 space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">排版佈局</label>
                            <div className="flex bg-slate-200 p-1 rounded-xl">
                               {(['left', 'right', 'bottom'] as ImagePosition[]).map(pos => (
                                 <button key={pos} onClick={() => {
                                    const newDays = [...generatedPlan.days];
                                    newDays[idx].imagePosition = pos;
                                    setGeneratedPlan({...generatedPlan, days: newDays});
                                 }} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${day.imagePosition === pos ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{pos.toUpperCase()}</button>
                               ))}
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">圖片數量: {day.imageCount}</label>
                              <input type="range" min="1" max="4" className="w-full accent-blue-600 mb-2" value={day.imageCount} onChange={e => {
                                const newDays = [...generatedPlan.days];
                                newDays[idx].imageCount = parseInt(e.target.value);
                                setGeneratedPlan({...generatedPlan, days: newDays});
                              }}/>
                            </div>
                            <button 
                              onClick={() => handleRegenerateDayImages(idx)}
                              disabled={isDayRegenerating}
                              className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDayRegenerating ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                            >
                              {isDayRegenerating ? '🔄 產生中...' : '🔄 重新生成圖片'}
                            </button>
                            <div className="pt-2 border-t border-slate-200 mt-2">
                               <p className="text-[10px] font-bold text-slate-400 mb-2">預覽內容</p>
                               <div className="flex gap-1 flex-wrap">
                                  {day.customImages?.map((img, i) => (
                                    <img key={i} src={img} className={`w-8 h-8 rounded-md object-cover border border-slate-200 ${isDayRegenerating ? 'opacity-30' : ''}`}/>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })}
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
