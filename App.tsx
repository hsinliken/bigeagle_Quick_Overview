
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
  
  // 初始設為 false，確保使用者一定會經過金鑰確認流程
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isAistudioAvailable, setIsAistudioAvailable] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // 1. 檢查環境變數是否已存在 (Vercel injected)
      const envKey = process.env.API_KEY;
      if (envKey && envKey !== 'undefined' && envKey !== '') {
        setHasApiKey(true);
        return;
      }
      
      // 2. 檢查是否有 aistudio 橋接器
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        setIsAistudioAvailable(true);
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          setHasApiKey(false);
        }
      } else {
        setIsAistudioAvailable(false);
        // 如果沒有橋接器也沒有環境變數，則維持 false 顯示提示畫面
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
        // 選取後嘗試進入應用
        setHasApiKey(true);
      } catch (e) {
        setError("無法開啟金鑰對話框，請檢查瀏覽器設定或重新整理。");
      }
    } else {
      setError("當前環境不支援直接選取金鑰。請在 Vercel 專案設定中加入名為 API_KEY 的環境變數。");
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
      if (err.message?.includes("API Key") || err.message?.includes("API key")) {
        setHasApiKey(false);
        setError('API 金鑰無效或缺失。請確認金鑰設定。');
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

  // 金鑰設定畫面
  if (!hasApiKey && !generatedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl max-w-lg border border-slate-100 transition-all">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">🔑</div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">設定您的 API 金鑰</h2>
          <p className="text-slate-500 mb-8 leading-relaxed px-4">
            為了安全調用 AI 服務，您需要先連結您的 Google Gemini API 金鑰。<br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-500 underline text-sm hover:text-blue-600 font-bold">關於計費說明 (ai.google.dev)</a>
          </p>
          
          {isAistudioAvailable ? (
            <button 
              onClick={handleSelectKey}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-95 mb-4"
            >
              立即選取金鑰
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left mb-6">
              <p className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                <span>⚠️</span> 偵測不到金鑰選取工具
              </p>
              <p className="text-amber-700 text-sm leading-relaxed">
                如果您是在 Vercel 上查看，請前往 <b>Settings > Environment Variables</b>，新增一個 Key 為 <b>API_KEY</b> 的環境變數，然後重新部署。
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2 justify-center">
              <span>🛑</span> {error}
            </div>
          )}
        </div>
        <p className="mt-8 text-slate-400 text-xs font-bold tracking-widest uppercase opacity-50">Eagle Travel AI Assistant v2.5</p>
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
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">🛠️ 行程企劃微調</h2>
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
                   <input className="w-full p-3 rounded-lg border border-slate-200 font-bold text-lg focus:border-blue-500 outline-none" value={generatedPlan.mainTitle} onChange={e => setGeneratedPlan({...generatedPlan, mainTitle: e.target.value})}/>
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">行銷吸引語</label>
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
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">時間表規劃</label>
                       {day.timeline.map((time, tIdx) => (
                         <div key={tIdx} className="flex gap-2">
                            <input className="w-24 p-2 border rounded-lg text-xs font-mono bg-slate-50" value={time.time} onChange={e => updateTimeline(idx, tIdx, 'time', e.target.value)} />
                            <input className="flex-1 p-2 border rounded-lg text-xs bg-slate-50" value={time.activity} onChange={e => updateTimeline(idx, tIdx, 'activity', e.target.value)} />
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="md:w-64 space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">圖片位置</label>
                    <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
                      {['left', 'right', 'bottom'].map(pos => (
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
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase shadow-lg shadow-blue-100">EAGLE TRAVEL AI</div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-lg text-slate-500 font-medium">智能生成國內外團體行程，符合專業銷售規範。</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 mb-8 border border-slate-100">
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
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">內容來源方式</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: InputMethod.AUTO, label: 'AI 自動', icon: '🤖' },
                    { id: InputMethod.TEXT, label: '文字輸入', icon: '📝' },
                    { id: InputMethod.FILE, label: '文件上傳', icon: '📁' },
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
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">旅遊商品名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder={tourType === TourType.DOMESTIC ? "例如：阿里山絕美日出、奮起湖老街三日" : "例如：德國瑞士阿爾卑斯萊茵河遊船十日"}
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
                     <><p className="text-4xl mb-2 opacity-30 group-hover:scale-110 transition-transform">📤</p><p className="text-slate-400 font-black">點擊上傳 PDF / Word / Excel</p></>
                   )}
                </div>
              )}

              {inputMethod === InputMethod.TEXT && (
                <textarea
                  placeholder="輸入行程大綱或特殊需求..."
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
                {isLoading ? '正在編寫行程內容...' : '開始產出企劃簡表'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-xl mb-8 flex items-center shadow-lg">
            <span className="text-2xl mr-4">⚠️</span>
            <p className="text-red-700 font-bold">{error}</p>
          </div>
        )}
      </div>

      {generatedPlan && !isEditing && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-5xl flex justify-between items-center mb-6 no-print px-4">
            <button onClick={() => setIsEditing(true)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg">✏️ 修正草案</button>
            <button onClick={handlePrint} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-2xl transform hover:scale-105 transition-all flex items-center gap-2">🖨️ 列印 / 儲存 PDF</button>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}
      
      <div className="mt-20 text-slate-300 text-[10px] font-black tracking-widest uppercase no-print">
        Powered by Google Gemini 3 Pro • Design for Eagle
      </div>
    </div>
  );
};

export default App;
