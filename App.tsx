
import React, { useState, useRef } from 'react';
import { TourType, InputMethod, TourPlan, DayPlan, ImagePosition } from './types';
import { generateTourPlan, generateImageForDay } from './services/geminiService';
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
  const [imageProgress, setImageProgress] = useState<string>('');

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('請輸入旅遊商品名稱');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageProgress('正在規劃行程內容...');
    
    try {
      // 1. 生成行程文字
      const plan = await generateTourPlan(tourType, productName, extraContent);
      
      // 2. 根據內容生成呼應的圖片 (預設生成每一天的第一張圖)
      setImageProgress('正在為每天生成專屬景點圖片...');
      const updatedDays = await Promise.all(plan.days.map(async (day, index) => {
        try {
          const prompt = `${plan.mainTitle} 第${day.day}天: ${day.title}. ${day.description.substring(0, 100)}`;
          const base64Image = await generateImageForDay(prompt);
          return {
            ...day,
            customImages: [base64Image]
          };
        } catch (e) {
          console.error(`Day ${day.day} image gen failed`, e);
          return day;
        }
      }));

      setGeneratedPlan({ ...plan, days: updatedDays });
      setIsEditing(true); 
    } catch (err: any) {
      console.error("Generation Error:", err);
      setError(err.message || '產出行程時發生錯誤，請確認 API Key 設定是否正確。');
    } finally {
      setIsLoading(false);
      setImageProgress('');
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
      const existing = (generatedPlan?.days[index].customImages || []);
      updateDayField(index, 'customImages', [...existing, ...base64Images]);
      updateDayField(index, 'imageCount', existing.length + base64Images.length);
    });
  };

  if (generatedPlan && isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 no-print font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">🛠️ 行程企劃微調</h2>
              <p className="text-slate-500 mt-1">調整排版位置、圖片張數或上傳自有照片。Left/Right 將採單列直排。</p>
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
                    <textarea className="w-full h-40 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 resize-none focus:ring-2 focus:ring-blue-100 outline-none" value={day.description} onChange={e => updateDayField(idx, 'description', e.target.value)}/>
                  </div>
                  
                  <div className="md:w-80 space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-shrink-0">
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🖼️ 圖片顯示數量：{day.imageCount || 1}</label>
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
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">上傳/更換圖片</label>
                       <div className="flex flex-col gap-2">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer w-full"
                            onChange={(e) => handleDayImageUpload(idx, e.target.files)}
                          />
                          {day.customImages && day.customImages.length > 0 && (
                            <div className="flex gap-2 flex-wrap py-2 border-t border-slate-200 mt-2">
                              {day.customImages.map((img, i) => (
                                <div key={i} className="relative group">
                                  <img src={img} className="w-12 h-12 rounded object-cover border border-white shadow-sm" alt="Preview"/>
                                  <button 
                                    onClick={() => {
                                      const filtered = day.customImages?.filter((_, imgIdx) => imgIdx !== i);
                                      updateDayField(idx, 'customImages', filtered);
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-sm"
                                  >✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
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
          <p className="text-lg text-slate-500 font-medium">專屬您的行程企劃專家，自動生成精美簡報。</p>
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
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <span>處理中...</span>
                    <span className="text-[10px] font-normal opacity-80 mt-1">{imageProgress}</span>
                  </div>
                ) : '立即生成行程計劃'}
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
