
import React, { useState, useRef, useEffect } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan } from './services/geminiService';
import ItineraryPreview from './components/ItineraryPreview';

// 宣告 window.aistudio 類型，確保與平台環境完全相容
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
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // 初始化檢查金鑰狀態
  useEffect(() => {
    const checkKey = async () => {
      // 1. 優先檢查環境變數
      const envKey = process.env.API_KEY;
      if (envKey && envKey !== 'undefined' && envKey !== '') {
        setHasApiKey(true);
        return;
      }
      
      // 2. 檢查是否有透過 aistudio 選取過金鑰
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          setHasApiKey(false);
        }
      } else {
        setHasApiKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    setError(null);
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // 遵循規範：點擊後立即假設成功並嘗試進入應用
        setHasApiKey(true);
      } catch (e) {
        console.error("無法開啟金鑰選取器", e);
        setError("無法開啟金鑰選取器，請檢查瀏覽器是否封鎖了彈出視窗。");
      }
    } else {
      setError("偵測不到金鑰選取對話框。請確認您是在專屬預覽環境中開啟，或已在 Vercel 後台設定 API_KEY 環境變數。");
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
      if (err.message?.includes("API key") || err.message?.includes("not found")) {
        setHasApiKey(false);
        setError('API 金鑰效期已過或環境變數讀取失敗，請重新選取金鑰。');
      } else {
        setError(err.message || '行程生成失敗，請稍後再試。');
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

  // 渲染金鑰選取畫面
  if (!hasApiKey && !generatedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md border border-slate-100 relative">
          <div className="text-6xl mb-6">🔑</div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">設定您的 API 金鑰</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            您正在使用 Gemini 3 Pro 高階企劃系統。請點擊下方按鈕以連結您的有效 API 金鑰。<br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-500 underline text-sm hover:text-blue-600">關於計費說明 (ai.google.dev)</a>
          </p>
          
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 mb-4"
          >
            立即選取金鑰
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 animate-pulse">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 編輯模式
  if (generatedPlan && isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 no-print font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">🛠️ 行程細節微調</h2>
              <p className="text-slate-500 mt-1">AI 已生成初稿，您可以根據需求修改文字或變更圖片配置</p>
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
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">商品主標題</label>
                   <input 
                     className="w-full p-3 rounded-lg border border-slate-200 font-bold text-lg focus:border-blue-500 outline-none transition-all" 
                     value={generatedPlan.mainTitle}
                     onChange={e => setGeneratedPlan({...generatedPlan, mainTitle: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">行銷吸引語</label>
                   <input 
                     className="w-full p-3 rounded-lg border border-slate-200 italic focus:border-blue-500 outline-none transition-all" 
                     value={generatedPlan.marketingSubtitle}
                     onChange={e => setGeneratedPlan({...generatedPlan, marketingSubtitle: e.target.value})}
                   />
                 </div>
               </div>
            </div>

            {generatedPlan.days.map((day, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black shadow-lg">D{day.day}</span>
                      <input 
                        className="flex-1 text-2xl font-black p-2 border-b-2 border-slate-100 focus:border-blue-500 outline-none transition-all" 
                        value={day.title}
                        onChange={e => updateDayField(idx, 'title', e.target.value)}
                      />
                    </div>
                    <textarea 
                      className="w-full h-32 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 resize-none focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      value={day.description}
                      onChange={e => updateDayField(idx, 'description', e.target.value)}
                    />
                    
                    <div className="space-y-3">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest">行程時間軸</label>
                       {day.timeline.map((time, tIdx) => (
                         <div key={tIdx} className="flex gap-3">
                            <input className="w-28 p-2 border rounded-lg text-sm font-mono bg-slate-50" value={time.time} onChange={e => updateTimeline(idx, tIdx, 'time', e.target.value)} />
                            <input className="flex-1 p-2 border rounded-lg text-sm bg-slate-50" value={time.activity} onChange={e => updateTimeline(idx, tIdx, 'activity', e.target.value)} />
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="md:w-80 bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      版面設定
                    </h4>
                    
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">圖片位置</label>
                      <div className="flex gap-1 bg-slate-200 p-1.5 rounded-xl">
                        {(['left', 'right', 'bottom'] as ImagePosition[]).map(pos => (
                          <button 
                            key={pos}
                            onClick={() => updateDayField(idx, 'imagePosition', pos)}
                            className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${day.imagePosition === pos ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">圖片數量 ({day.imageCount})</label>
                      <input 
                        type="range" min="1" max="3" step="1"
                        className="w-full accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
                        value={day.imageCount}
                        onChange={e => updateDayField(idx, 'imageCount', parseInt(e.target.value, 10))}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">圖片主題關鍵字</label>
                      <input 
                        className="w-full p-3 text-sm border rounded-xl bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                        value={day.imageUrl}
                        onChange={e => updateDayField(idx, 'imageUrl', e.target.value)}
                        placeholder="景點關鍵字"
                      />
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

  // 主輸入畫面
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-4xl no-print">
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase shadow-lg shadow-blue-200">
            Tour Planner Studio 2.5
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-lg text-slate-500 font-medium">智能生成行程規劃，讓專業與美感並存。</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 mb-8 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 -mr-16 -mt-16 rounded-full opacity-50"></div>
          
          <div className="flex flex-col md:flex-row gap-10 relative z-10">
            <div className="flex-1 space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">企劃類型</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setTourType(TourType.DOMESTIC)}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                      tourType === TourType.DOMESTIC ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    國內團體
                  </button>
                  <button
                    onClick={() => setTourType(TourType.INTERNATIONAL)}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                      tourType === TourType.INTERNATIONAL ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    國外團體
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">輸入模式</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: InputMethod.AUTO, label: '全自動', icon: '🤖' },
                    { id: InputMethod.TEXT, label: '補充資料', icon: '📝' },
                    { id: InputMethod.FILE, label: '文件上傳', icon: '📁' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setInputMethod(method.id)}
                      className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${
                        inputMethod === method.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
                          : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl mb-2">{method.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-[1.5] space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">
                  旅遊商品名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={tourType === TourType.DOMESTIC ? "例如：阿里山絕美日出、奮起湖老街三日" : "例如：德國瑞士阿爾卑斯萊茵河遊船十日"}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {inputMethod === InputMethod.FILE ? (
                <div>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange} 
                      accept=".doc,.docx,.pdf,.xls,.xlsx,.txt"
                    />
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="group border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                   >
                     {uploadedFileName ? (
                       <div className="flex flex-col items-center">
                         <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4">📄</div>
                         <p className="font-black text-emerald-700">{uploadedFileName}</p>
                       </div>
                     ) : (
                       <>
                         <div className="text-4xl mb-4 opacity-50 group-hover:scale-110 transition-transform">📤</div>
                         <p className="font-black text-slate-500 mb-1">上傳 Word / PDF / Excel</p>
                       </>
                     )}
                   </div>
                </div>
              ) : inputMethod === InputMethod.TEXT ? (
                <div>
                  <textarea
                    placeholder="輸入行程大綱或特殊景點需求..."
                    className="w-full h-40 px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none resize-none transition-all font-medium text-slate-600"
                    value={extraContent}
                    onChange={(e) => setExtraContent(e.target.value)}
                  />
                </div>
              ) : null}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl text-white font-black text-xl transition-all shadow-xl ${
                  isLoading 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-95 shadow-blue-200'
                }`}
              >
                {isLoading ? '核心運算中，請稍候...' : '開始生成企劃草案'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-8 border-red-500 p-6 rounded-2xl mb-8 flex items-center shadow-lg">
            <span className="text-3xl mr-4">⚠️</span>
            <p className="text-red-700 font-bold">{error}</p>
          </div>
        )}
      </div>

      {generatedPlan && !isEditing && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-5xl flex justify-between items-center mb-6 no-print px-4">
            <button 
              onClick={() => setIsEditing(true)} 
              className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg"
            >
              ✏️ 修改內容
            </button>
            <button
              onClick={handlePrint}
              className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2"
            >
              🖨️ 列印 / 儲存 PDF
            </button>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}

      <div className="mt-24 text-slate-300 text-[10px] font-black tracking-widest uppercase no-print">
        Powered by Google Gemini 3 Pro & Eagle Logic
      </div>
    </div>
  );
};

export default App;
