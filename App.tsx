
import React, { useState, useRef, useEffect } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan } from './services/geminiService';
import ItineraryPreview from './components/ItineraryPreview';

// 宣告 window.aistudio 類型，使用 AIStudio 名稱以符合環境預期並避免衝突
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
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

  // 檢查 API Key 狀態
  useEffect(() => {
    const checkKey = async () => {
      // 如果 process.env.API_KEY 存在則視為有金鑰
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }
      // 否則檢查平台是否已選取金鑰
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

  // 處理金鑰選取，遵循規範：點擊後立即假設成功以避免競態條件
  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true); // 遵循規範：假設選取成功，避免 race condition
      } catch (e) {
        console.error("Failed to open key selector", e);
      }
    }
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('請輸入商品名稱');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateTourPlan(tourType, productName, extraContent);
      setGeneratedPlan(plan);
      setIsEditing(true); 
    } catch (err: any) {
      // 處理實體未找到或金鑰無效的特殊錯誤，遵循規範：重置金鑰選取狀態
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API key")) {
        setHasApiKey(false);
        setError('API 金鑰效期已過或未設定，請重新選取。');
      } else {
        setError(err.message || '生成失敗，請檢查 API Key 或網路狀況。');
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

  const handlePrint = () => {
    window.print();
  };

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

  // 如果沒有金鑰，顯示引導畫面
  if (!hasApiKey && !generatedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl max-w-md border border-slate-100">
          <div className="text-6xl mb-6">🔑</div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">設定您的 API 金鑰</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            為了安全調用 AI 服務，您需要先連結您的 API 金鑰。請點擊下方按鈕進行選取。<br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-500 underline text-sm hover:text-blue-600">關於計費說明</a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
          >
            立即選取金鑰
          </button>
        </div>
      </div>
    );
  }

  if (generatedPlan && isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 no-print">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800">🛠️ 行程內容確認與調整</h2>
              <p className="text-slate-500 mt-1">請在出版前調整您的文字內容與版面配置</p>
            </div>
            <div className="flex gap-4">
              <button onClick={reset} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all">捨棄</button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105"
              >
                確認並生成預覽 🚀
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">商品標題</label>
                   <input 
                     className="w-full p-3 rounded-lg border border-slate-200 font-bold text-lg focus:border-blue-500 outline-none transition-all" 
                     value={generatedPlan.mainTitle}
                     onChange={e => setGeneratedPlan({...generatedPlan, mainTitle: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">行銷副標</label>
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
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest">時間軸規劃</label>
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
                      版面配置設定
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
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">圖片數量 ({day.imageCount} 張)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="1" max="3" step="1"
                          className="flex-1 accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
                          value={day.imageCount}
                          onChange={e => updateDayField(idx, 'imageCount', parseInt(e.target.value, 10))}
                        />
                        <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md">
                          {day.imageCount}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">圖片搜尋關鍵字</label>
                      <input 
                        className="w-full p-3 text-sm border rounded-xl bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                        value={day.imageUrl}
                        onChange={e => updateDayField(idx, 'imageUrl', e.target.value)}
                        placeholder="例如：阿里山, 櫻花"
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl no-print">
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase">
            Tour Planner Studio 2.5
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-lg text-slate-500 font-medium">智能生成、深度客製、專業排版，讓行程規劃事半功倍。</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl p-10 mb-8 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 -mr-16 -mt-16 rounded-full opacity-50"></div>
          
          <div className="flex flex-col md:flex-row gap-10 relative z-10">
            <div className="flex-1 space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">企劃商品類型</label>
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
                <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">內容輸入方式</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: InputMethod.AUTO, label: 'AI 全自動', icon: '🤖' },
                    { id: InputMethod.TEXT, label: '手寫補充', icon: '📝' },
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
                  旅遊商品完整名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={tourType === TourType.DOMESTIC ? "例如：阿里山絕美日出、奮起湖老街豐富三日" : "例如：德國瑞士阿爾卑斯峰、萊茵河遊船深度十日遊"}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {inputMethod === InputMethod.FILE ? (
                <div>
                   <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">文件上傳支援</label>
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
                         <p className="text-slate-400 text-xs mt-2">點擊以更換文件</p>
                       </div>
                     ) : (
                       <>
                         <div className="text-4xl mb-4 opacity-50 group-hover:scale-110 transition-transform">📤</div>
                         <p className="font-black text-slate-500 mb-1">點擊此處上傳 Word / PDF / Excel</p>
                         <p className="text-slate-400 text-xs">AI 將自動讀取文件內容轉化為企劃草案</p>
                       </>
                     )}
                   </div>
                </div>
              ) : inputMethod === InputMethod.TEXT ? (
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">補充參考資料或大綱</label>
                  <textarea
                    placeholder="請在此輸入您已有的粗略行程大綱或景點需求..."
                    className="w-full h-40 px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none resize-none transition-all font-medium text-slate-600"
                    value={extraContent}
                    onChange={(e) => setExtraContent(e.target.value)}
                  />
                </div>
              ) : null}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl text-white font-black text-xl transition-all shadow-2xl relative overflow-hidden group ${
                  isLoading 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-95'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    大數據核心運算中...
                  </span>
                ) : (
                  <>
                    <span className="relative z-10">開始生成企劃草案</span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-8 border-red-500 p-6 rounded-2xl mb-8 flex items-center shadow-lg transition-all">
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
              ✏️ 返回調整內容
            </button>
            <button
              onClick={handlePrint}
              className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2"
            >
              🖨️ 列印 / 儲存為 PDF
            </button>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}

      <div className="mt-24 text-slate-300 text-[10px] font-black tracking-widest uppercase no-print">
        Powered by Google Gemini 3 Pro & Eagle Travel Logic
      </div>
    </div>
  );
};

export default App;
