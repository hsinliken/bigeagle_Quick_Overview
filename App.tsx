
import React, { useState, useRef, useEffect } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan } from './services/geminiService';
import ItineraryPreview from './components/ItineraryPreview';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [tourType, setTourType] = useState<TourType>(TourType.DOMESTIC);
  const [inputMethod, setInputMethod] = useState<InputMethod>(InputMethod.AUTO);
  const [productName, setProductName] = useState('');
  const [extraContent, setExtraContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<TourPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [hasApiKey, setHasApiKey] = useState<boolean>(true); // 預設為 true 允許進入，失敗才提醒
  const [isAistudioAvailable, setIsAistudioAvailable] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    // 檢查是否有 aistudio 橋接器（通常在 Google AI Studio 預覽環境）
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      setIsAistudioAvailable(true);
      window.aistudio.hasSelectedApiKey().then(selected => {
        setHasApiKey(selected);
      }).catch(() => setHasApiKey(false));
    } else {
      setIsAistudioAvailable(false);
      // 在 Vercel 環境中，我們無法在前端輕易驗證 process.env.API_KEY 是否有效（因為它是伺服器端或編譯時注入）
      // 所以預設允許使用者操作
      setHasApiKey(true);
    }
  }, []);

  const handleSelectKey = async () => {
    setError(null);
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        setError("無法開啟金鑰對話框，請檢查瀏覽器彈出視窗設定。");
      }
    }
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('請輸入旅遊商品名稱');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateTourPlan(tourType, productName, extraContent);
      setGeneratedPlan(plan);
      setIsEditing(true); 
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes("API Key") || errMsg.includes("401") || errMsg.includes("not found")) {
        setHasApiKey(false);
        if (isAistudioAvailable) {
          setError('API 金鑰效期已過或尚未選取，請點擊「選取金鑰」按鈕。');
        } else {
          setError('偵測不到有效的 API 金鑰。請確認已在 Vercel Settings > Environment Variables 設定 API_KEY 並重新部署。');
        }
      } else {
        setError(errMsg || '行程生成失敗，請稍後再試。');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setExtraContent(`[已從文件 ${file.name} 提取內容數據]`);
    }
  };

  const reset = () => {
    setGeneratedPlan(null);
    setError(null);
    setIsEditing(false);
    setUploadedFileName(null);
    setProductName('');
    setExtraContent('');
  };

  const handlePrint = () => window.print();

  const updateDayField = (index: number, field: keyof DayPlan, value: any) => {
    if (!generatedPlan) return;
    const newDays = [...generatedPlan.days];
    newDays[index] = { ...newDays[index], [field]: value };
    setGeneratedPlan({ ...generatedPlan, days: newDays });
  };

  const updateTimeline = (dayIndex: number, timeIndex: number, field: 'time' | 'activity', value: string) => {
    if (!generatedPlan) return;
    const newDays = [...generatedPlan.days];
    const newTimeline = [...newDays[dayIndex].timeline];
    newTimeline[timeIndex] = { ...newTimeline[timeIndex], [field]: value };
    newDays[dayIndex].timeline = newTimeline;
    setGeneratedPlan({ ...generatedPlan, days: newDays });
  };

  // 編輯模式
  if (generatedPlan && isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 no-print font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">🛠️ 行程企劃微調</h2>
              <p className="text-slate-500 mt-1">您可以手動調整內容，確保符合您的銷售風格</p>
            </div>
            <div className="flex gap-4">
              <button onClick={reset} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all">重新開始</button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105"
              >
                生成精美預覽 🚀
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">商品主標題</label>
                   <input className="w-full p-3 rounded-lg border border-slate-200 font-bold text-lg focus:border-blue-500 outline-none" value={generatedPlan.mainTitle} onChange={e => setGeneratedPlan({...generatedPlan, mainTitle: e.target.value})}/>
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">行銷吸引語</label>
                   <input className="w-full p-3 rounded-lg border border-slate-200 italic focus:border-blue-500 outline-none" value={generatedPlan.marketingSubtitle} onChange={e => setGeneratedPlan({...generatedPlan, marketingSubtitle: e.target.value})}/>
                 </div>
               </div>
            </div>

            {generatedPlan.days.map((day, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black shadow-lg">D{day.day}</span>
                      <input className="flex-1 text-2xl font-black p-2 border-b-2 border-slate-100 focus:border-blue-500 outline-none" value={day.title} onChange={e => updateDayField(idx, 'title', e.target.value)}/>
                    </div>
                    <textarea className="w-full h-32 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 resize-none focus:ring-2 focus:ring-blue-100 outline-none" value={day.description} onChange={e => updateDayField(idx, 'description', e.target.value)}/>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">每日時間表規劃</label>
                       {day.timeline.map((time, tIdx) => (
                         <div key={tIdx} className="flex gap-2">
                            <input className="w-24 p-2 border rounded-lg text-xs font-mono bg-slate-50" value={time.time} onChange={e => updateTimeline(idx, tIdx, 'time', e.target.value)} />
                            <input className="flex-1 p-2 border rounded-lg text-xs bg-slate-50" value={time.activity} onChange={e => updateTimeline(idx, tIdx, 'activity', e.target.value)} />
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="md:w-64 space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">排版與圖片</label>
                    <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
                      {(['left', 'right', 'bottom'] as ImagePosition[]).map(pos => (
                        <button key={pos} onClick={() => updateDayField(idx, 'imagePosition', pos)} className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${day.imagePosition === pos ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>{pos}</button>
                      ))}
                    </div>
                    <div className="pt-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">搜尋關鍵字</label>
                       <input className="w-full p-2 text-xs border rounded-xl bg-white focus:ring-2 focus:ring-blue-100 outline-none" value={day.imageUrl} onChange={e => updateDayField(idx, 'imageUrl', e.target.value)}/>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-4xl no-print">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase shadow-lg shadow-blue-100">
            Eagle AI Itinerary Studio
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-lg text-slate-500 font-medium">智能生成國內外專業團體行程，讓企劃更有效率。</p>
        </div>

        {/* API Status Reminder (Only show if key is missing or error occurred) */}
        {!hasApiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🔑</div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-black text-amber-900 mb-1">需要設定 API 金鑰</h4>
              <p className="text-amber-700 text-sm">
                {isAistudioAvailable 
                  ? "目前環境需要您手動選取金鑰才能調用 Gemini 模型。" 
                  : "請確保已在 Vercel 專案設定中加入 API_KEY 環境變數，否則無法生成行程。"}
              </p>
            </div>
            {isAistudioAvailable && (
              <button onClick={handleSelectKey} className="bg-amber-600 text-white px-6 py-2 rounded-xl font-black text-sm hover:bg-amber-700 transition-all">
                立即選取金鑰
              </button>
            )}
          </div>
        )}

        {/* Main Input Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 mb-8 border border-slate-100 relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1 space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">企劃類型</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button onClick={() => setTourType(TourType.DOMESTIC)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${tourType === TourType.DOMESTIC ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>國內團體</button>
                  <button onClick={() => setTourType(TourType.INTERNATIONAL)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${tourType === TourType.INTERNATIONAL ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>國外團體</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">內容來源</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: InputMethod.AUTO, label: 'AI 生成', icon: '🤖' },
                    { id: InputMethod.TEXT, label: '手寫大綱', icon: '📝' },
                    { id: InputMethod.FILE, label: '參考文件', icon: '📁' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setInputMethod(m.id)} className={`py-4 rounded-2xl border-2 flex flex-col items-center transition-all ${inputMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                      <span className="text-xl mb-1">{m.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-[1.5] space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">商品名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder={tourType === TourType.DOMESTIC ? "例如：阿里山日出三日、奮起湖老街" : "例如：德瑞阿爾卑斯峰萊茵河十日"}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-lg transition-all"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {inputMethod === InputMethod.FILE && (
                <div onClick={() => fileInputRef.current?.click()} className="group border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                   <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".doc,.docx,.pdf,.xls,.xlsx,.txt"/>
                   {uploadedFileName ? (
                     <div className="flex flex-col items-center"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-2">📄</div><p className="font-black text-emerald-600">{uploadedFileName}</p></div>
                   ) : (
                     <><p className="text-4xl mb-2 opacity-30 group-hover:scale-110 transition-transform">📤</p><p className="text-slate-400 font-black">上傳 PDF / Word / Excel</p></>
                   )}
                </div>
              )}

              {inputMethod === InputMethod.TEXT && (
                <textarea
                  placeholder="輸入行程大綱、必去景點或特殊需求..."
                  className="w-full h-40 px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none resize-none font-medium text-slate-600"
                  value={extraContent}
                  onChange={(e) => setExtraContent(e.target.value)}
                />
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
              >
                {isLoading ? '核心大腦運算中...' : '開始產出企劃內容'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-8 border-red-500 p-5 rounded-2xl mb-8 flex items-center shadow-lg animate-in fade-in duration-300">
            <span className="text-3xl mr-4">🛑</span>
            <div className="text-red-700">
               <p className="font-black">發生錯誤</p>
               <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {generatedPlan && !isEditing && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-5xl flex justify-between items-center mb-6 no-print px-4">
            <button onClick={() => setIsEditing(true)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg">✏️ 內容微調</button>
            <button onClick={handlePrint} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-2xl transform hover:scale-105 transition-all flex items-center gap-2">🖨️ 列印 / 儲存 PDF</button>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}
      
      <div className="mt-20 text-slate-300 text-[10px] font-black tracking-widest uppercase no-print">
        Powered by Google Gemini 3 Pro • For Eagle Travel
      </div>
    </div>
  );
};

export default App;
