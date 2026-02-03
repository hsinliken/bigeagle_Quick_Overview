
import React, { useState, useRef, useEffect } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan } from './services/geminiService';
import ItineraryPreview from './components/ItineraryPreview';

const App: React.FC = () => {
  const [tourType, setTourType] = useState<TourType>(TourType.DOMESTIC);
  const [inputMethod, setInputMethod] = useState<InputMethod>(InputMethod.AUTO);
  const [productName, setProductName] = useState('');
  const [extraContent, setExtraContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<TourPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const isSelected = await window.aistudio.hasSelectedApiKey();
        setHasKey(isSelected);
      } else {
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleLinkKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
    } else {
      setError("當前環境不支援線上選取金鑰，請手動確認 Vercel 的 API_KEY 設定。");
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
      console.error("Generation Error:", err);
      const msg = err.message || '';
      if (msg.includes("API key is missing") || msg.includes("401")) {
        setHasKey(false);
        setError("系統偵測不到有效的 API 金鑰。");
      } else {
        setError(msg || '產出行程時發生錯誤。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setGeneratedPlan(null);
    setError(null);
    setIsEditing(false);
    setProductName('');
    setExtraContent('');
  };

  const updateDayField = (index: number, field: keyof DayPlan, value: any) => {
    if (!generatedPlan) return;
    const newDays = [...generatedPlan.days];
    newDays[index] = { ...newDays[index], [field]: value };
    setGeneratedPlan({ ...generatedPlan, days: newDays });
  };

  const handleDayImageUpload = (index: number, files: FileList | null) => {
    if (!files) return;
    
    const readers = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(base64Images => {
      updateDayField(index, 'customImages', base64Images);
      updateDayField(index, 'imageCount', base64Images.length);
    });
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg w-full">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">🔑</div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">啟動 AI 企劃助手</h2>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">系統偵測不到有效的 API 金鑰。點擊按鈕進行授權。</p>
          <button onClick={handleLinkKey} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all transform hover:scale-[1.02] mb-6">連結 API 金鑰</button>
          {error && <p className="mt-8 text-red-500 font-bold bg-red-50 p-4 rounded-xl text-sm">{error}</p>}
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
              <p className="text-slate-500 mt-1">調整排版位置、圖片張數或上傳自有照片</p>
            </div>
            <div className="flex gap-4">
              <button onClick={reset} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all">重新開始</button>
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105">生成精美預覽 🚀</button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">商品主標題</label>
                <input className="w-full p-3 rounded-lg border border-slate-200 font-bold text-lg focus:border-blue-500 outline-none" value={generatedPlan.mainTitle} onChange={e => setGeneratedPlan({...generatedPlan, mainTitle: e.target.value})}/>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">行銷吸引語</label>
                <input className="w-full p-3 rounded-lg border border-slate-200 italic focus:border-blue-500 outline-none" value={generatedPlan.marketingSubtitle} onChange={e => setGeneratedPlan({...generatedPlan, marketingSubtitle: e.target.value})}/>
              </div>
            </div>

            {generatedPlan.days.map((day, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6 transition-all">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black shadow-lg">D{day.day}</span>
                      <input className="flex-1 text-2xl font-black p-2 border-b-2 border-slate-100 focus:border-blue-500 outline-none" value={day.title} onChange={e => updateDayField(idx, 'title', e.target.value)}/>
                    </div>
                    <textarea className="w-full h-32 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 resize-none focus:ring-2 focus:ring-blue-100 outline-none" value={day.description} onChange={e => updateDayField(idx, 'description', e.target.value)}/>
                  </div>
                  
                  <div className="md:w-80 space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">📸 圖片排版位置</label>
                      <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
                        {(['left', 'right', 'bottom'] as ImagePosition[]).map(pos => (
                          <button key={pos} onClick={() => updateDayField(idx, 'imagePosition', pos)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${day.imagePosition === pos ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>{pos}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🖼️ 圖片數量：{day.imageCount || 1}</label>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="4" 
                        step="1" 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={day.imageCount || 1}
                        onChange={(e) => updateDayField(idx, 'imageCount', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">自定義照片</label>
                       <div className="flex flex-col gap-2">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                            onChange={(e) => handleDayImageUpload(idx, e.target.files)}
                          />
                          {day.customImages && (
                            <div className="flex gap-1 overflow-x-auto pb-2">
                              {day.customImages.map((img, i) => (
                                <img key={i} src={img} className="w-8 h-8 rounded object-cover border border-white shadow-sm" alt="Preview"/>
                              ))}
                              <button onClick={() => updateDayField(idx, 'customImages', undefined)} className="text-[10px] text-red-500 font-bold hover:underline">清除</button>
                            </div>
                          )}
                       </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">圖片關鍵字 (AI Seed)</label>
                       <input className="w-full p-2 text-xs border rounded-lg bg-white font-mono" value={day.imageUrl} onChange={e => updateDayField(idx, 'imageUrl', e.target.value)}/>
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
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase shadow-lg shadow-blue-100">Eagle AI Studio</div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-lg text-slate-500 font-medium">智能生成專業國內外旅遊企劃行程。</p>
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
                    { id: InputMethod.AUTO, label: 'AI 自動生成', icon: '✨' },
                    { id: InputMethod.TEXT, label: '手打文字', icon: '✍️' },
                    { id: InputMethod.FILE, label: '上傳檔案', icon: '📎' },
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
                  placeholder={tourType === TourType.DOMESTIC ? "例如：南投清境三日遊" : "例如：日本北海道五日奢華團"}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-lg"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {inputMethod === InputMethod.TEXT && (
                <textarea
                  placeholder="請輸入行程重點、必去景點或餐食需求..."
                  className="w-full h-32 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-medium"
                  value={extraContent}
                  onChange={(e) => setExtraContent(e.target.value)}
                />
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
              >
                {isLoading ? '生成中，請稍候...' : '立即生成行程計劃'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-8 border-red-500 p-6 rounded-2xl mb-8 flex items-start shadow-lg">
            <span className="text-3xl mr-4">⚠️</span>
            <div className="text-red-700 flex-1">
               <p className="font-black text-lg">操作失敗</p>
               <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </div>

      {generatedPlan && !isEditing && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-5xl flex justify-between items-center mb-6 no-print px-4">
            <button onClick={() => setIsEditing(true)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg">✏️ 內容微調</button>
            <button onClick={() => window.print()} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-2xl transition-all">🖨️ 列印 / 儲存 PDF</button>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}
    </div>
  );
};

export default App;
