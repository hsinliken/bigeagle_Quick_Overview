
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
  
  // 預設為 true，只有在偵測到 aistudio 且未選取時才設為 false
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // 如果有 window.aistudio 橋接器，則強制執行選取流程
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          // 發生異常則退回選取畫面
          setHasApiKey(false);
        }
      } else {
        // 在 Vercel 或一般瀏覽器中，偵測不到橋接器就假設 API_KEY 會從環境變數注入
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        setError("無法開啟金鑰對話框，請檢查瀏覽器設定。");
      }
    } else {
      // 如果按鈕失效，可能是因為環境不支援，直接嘗試進入應用程式
      setHasApiKey(true);
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
      if (err.message?.includes("API Key 缺失") || err.message?.includes("API key")) {
        // 如果 API 調用回報缺少金鑰，且環境支援橋接器，則提示選取
        if (window.aistudio) {
          setHasApiKey(false);
        }
        setError('金鑰無效或尚未設定。若您在 Vercel 部署，請至後台設定 API_KEY。');
      } else {
        setError(err.message || '行程生成失敗，請檢查網路或金鑰狀態。');
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
      setExtraContent(`[已從文件 ${file.name} 提取內容]`);
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

  if (!hasApiKey && !generatedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md border border-slate-100">
          <div className="text-6xl mb-6">🔑</div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">環境安全驗證</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            系統偵測到需要進行金鑰授權。請點擊按鈕選取金鑰，或確保環境變數已正確配置。
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105"
          >
            立即啟動驗證
          </button>
          {error && <p className="mt-4 text-red-500 text-sm font-bold">{error}</p>}
        </div>
      </div>
    );
  }

  if (generatedPlan && isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 no-print font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">🛠️ 行程企劃微調</h2>
              <p className="text-slate-500 mt-1">您可以手動調整 AI 生成的內容，確保符合販售需求</p>
            </div>
            <div className="flex gap-4">
              <button onClick={reset} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all">重新開始</button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105"
              >
                查看成品預覽 🚀
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">主標題</label>
                   <input className="w-full p-3 rounded-lg border border-slate-200 font-bold text-lg focus:border-blue-500 outline-none" value={generatedPlan.mainTitle} onChange={e => setGeneratedPlan({...generatedPlan, mainTitle: e.target.value})}/>
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">副標題</label>
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
                      <input className="flex-1 text-2xl font-black p-2 border-b-2 border-slate-100 outline-none" value={day.title} onChange={e => updateDayField(idx, 'title', e.target.value)}/>
                    </div>
                    <textarea className="w-full h-32 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 outline-none" value={day.description} onChange={e => updateDayField(idx, 'description', e.target.value)}/>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">時間表規劃</label>
                       {day.timeline.map((time, tIdx) => (
                         <div key={tIdx} className="flex gap-2">
                            <input className="w-24 p-2 border rounded text-xs font-mono" value={time.time} onChange={e => updateTimeline(idx, tIdx, 'time', e.target.value)} />
                            <input className="flex-1 p-2 border rounded text-xs" value={time.activity} onChange={e => updateTimeline(idx, tIdx, 'activity', e.target.value)} />
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="md:w-64 space-y-4 bg-slate-50 p-4 rounded-2xl">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">圖片配置</label>
                    <div className="flex flex-wrap gap-1">
                      {['left', 'right', 'bottom'].map(pos => (
                        <button key={pos} onClick={() => updateDayField(idx, 'imagePosition', pos)} className={`px-3 py-1 rounded text-[10px] font-bold ${day.imagePosition === pos ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border'}`}>{pos}</button>
                      ))}
                    </div>
                    <div className="pt-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">搜尋關鍵字</label>
                       <input className="w-full p-2 text-xs border rounded bg-white" value={day.imageUrl} onChange={e => updateDayField(idx, 'imageUrl', e.target.value)}/>
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
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase">EAGLE TRAVEL AI</div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-lg text-slate-500 font-medium">智能生成國內外團體行程，符合專業銷售規範。</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 mb-8 border border-slate-100">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1 space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">企劃類型</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button onClick={() => setTourType(TourType.DOMESTIC)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${tourType === TourType.DOMESTIC ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>國內團體</button>
                  <button onClick={() => setTourType(TourType.INTERNATIONAL)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${tourType === TourType.INTERNATIONAL ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>國外團體</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">內容來源</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: InputMethod.AUTO, label: 'AI 生成', icon: '🤖' },
                    { id: InputMethod.TEXT, label: '文字輸入', icon: '📝' },
                    { id: InputMethod.FILE, label: '上傳檔案', icon: '📁' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setInputMethod(m.id)} className={`py-4 rounded-2xl border-2 flex flex-col items-center transition-all ${inputMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>
                      <span className="text-xl mb-1">{m.icon}</span>
                      <span className="text-[10px] font-black uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-[1.5] space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase">商品名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder={tourType === TourType.DOMESTIC ? "阿里山日出三日遊" : "德瑞阿爾卑斯峰十日"}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-lg"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {inputMethod === InputMethod.FILE && (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:bg-blue-50">
                   <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange}/>
                   {uploadedFileName ? <p className="font-black text-emerald-600">已選：{uploadedFileName}</p> : <p className="text-slate-400 font-black">點擊上傳 PDF / Word / Excel</p>}
                </div>
              )}

              {inputMethod === InputMethod.TEXT && (
                <textarea
                  placeholder="輸入行程大綱或關鍵景點需求..."
                  className="w-full h-40 px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none resize-none font-medium"
                  value={extraContent}
                  onChange={(e) => setExtraContent(e.target.value)}
                />
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transition-all ${isLoading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
              >
                {isLoading ? '正在生成企劃...' : '開始產出行程簡表'}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-8 text-red-700 font-bold">{error}</div>}
      </div>

      {generatedPlan && !isEditing && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-5xl flex justify-between items-center mb-6 no-print px-4">
            <button onClick={() => setIsEditing(true)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all">✏️ 修正內容</button>
            <button onClick={handlePrint} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-2xl transform hover:scale-105 transition-all">🖨️ 列印 / 存為 PDF</button>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}
    </div>
  );
};

export default App;
