
import React, { useState } from 'react';
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
    setImageProgress('正在構思行程精華...');
    
    try {
      const plan = await generateTourPlan(tourType, productName, extraContent);
      
      setImageProgress('正在為每天生成多張視覺美圖...');
      const updatedDays = await Promise.all(plan.days.map(async (day) => {
        try {
          const count = day.imageCount || 1;
          const imagePromises = [];
          for (let i = 0; i < count; i++) {
            // 加入變數讓每張圖都有所不同
            const p = `${day.title} travel photography, angle ${i + 1}`;
            imagePromises.push(generateImageForDay(p));
          }
          const base64Images = await Promise.all(imagePromises);
          return { ...day, customImages: base64Images };
        } catch (e) {
          return day;
        }
      }));

      setGeneratedPlan({ ...plan, days: updatedDays });
      setIsEditing(true); 
    } catch (err: any) {
      setError('生成失敗。請檢查 API Key 是否正確注入，或稍後再試。');
    } finally {
      setIsLoading(false);
      setImageProgress('');
    }
  };

  const regenerateDayImages = async (idx: number) => {
    if (!generatedPlan) return;
    const day = generatedPlan.days[idx];
    const count = day.imageCount || 1;
    
    // 清空現有圖片並顯示進度
    const newDays = [...generatedPlan.days];
    newDays[idx] = { ...newDays[idx], customImages: [] };
    setGeneratedPlan({ ...generatedPlan, days: newDays });
    
    try {
      const imagePromises = [];
      for (let i = 0; i < count; i++) {
        imagePromises.push(generateImageForDay(`${day.title} professional view ${i + 1}`));
      }
      const base64Images = await Promise.all(imagePromises);
      updateDayField(idx, 'customImages', base64Images);
    } catch (e) {
      alert("圖片重新生成失敗");
    }
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
      const combined = [...existing, ...base64Images].slice(0, 4);
      updateDayField(index, 'customImages', combined);
      updateDayField(index, 'imageCount', combined.length);
    });
  };

  if (generatedPlan && isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 no-print font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">🛠️ 行程企劃微調</h2>
              <p className="text-slate-500 mt-1 italic">調整「圖片顯示數量」後，可點擊「重新生成」獲取對應數量的美圖。</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setGeneratedPlan(null)} className="px-5 py-2 text-slate-500 font-bold hover:text-slate-800">取消重來</button>
              <button onClick={() => setIsEditing(false)} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black shadow-xl hover:bg-blue-700 transition-all">預覽行程表樣式 🚀</button>
            </div>
          </div>

          <div className="space-y-6">
            {generatedPlan.days.map((day, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black">D{day.day}</span>
                      <input className="flex-1 text-2xl font-black p-2 border-b-2 border-slate-100 focus:border-blue-500 outline-none" value={day.title} onChange={e => updateDayField(idx, 'title', e.target.value)}/>
                    </div>
                    <textarea className="w-full h-32 p-4 rounded-2xl bg-slate-50 border-none text-sm text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none resize-none" value={day.description} onChange={e => updateDayField(idx, 'description', e.target.value)}/>
                  </div>
                  
                  <div className="md:w-72 space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-shrink-0">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">📸 圖片排版位置</label>
                      <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
                        {(['left', 'right', 'bottom'] as ImagePosition[]).map(pos => (
                          <button key={pos} onClick={() => updateDayField(idx, 'imagePosition', pos)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${day.imagePosition === pos ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>{pos}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🖼️ 數量：{day.imageCount || 1}</label>
                        <button onClick={() => regenerateDayImages(idx)} className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-black hover:bg-blue-700 shadow-sm">✨ 重新生成</button>
                      </div>
                      <input type="range" min="1" max="4" step="1" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={day.imageCount || 1} onChange={(e) => updateDayField(idx, 'imageCount', parseInt(e.target.value))}/>
                    </div>

                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">手動替換</label>
                       <input type="file" multiple accept="image/*" className="text-[10px] w-full" onChange={(e) => handleDayImageUpload(idx, e.target.files)}/>
                       {day.customImages && day.customImages.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                             {day.customImages.map((img, i) => (
                                <img key={i} src={img} className="w-8 h-8 rounded-lg object-cover border border-white shadow-sm" alt="prev"/>
                             ))}
                          </div>
                       )}
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
        <div className="text-center mb-10">
          <div className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold mb-3 tracking-widest uppercase shadow-lg shadow-blue-100">Eagle AI Studio</div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">大鷹-行程簡表AI小助手</h1>
          <p className="text-slate-500 font-medium">不需部署即可透過 AI 快速產出精美企劃書</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 mb-8 border border-slate-100">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">企劃類型</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setTourType(TourType.DOMESTIC)} className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${tourType === TourType.DOMESTIC ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>國內團體</button>
                  <button onClick={() => setTourType(TourType.INTERNATIONAL)} className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${tourType === TourType.INTERNATIONAL ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>國外團體</button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">內容來源</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: InputMethod.AUTO, label: 'AI 生成', icon: '✨' },
                    { id: InputMethod.TEXT, label: '文字錄入', icon: '✍️' },
                    { id: InputMethod.FILE, label: '上傳檔案', icon: '📎' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setInputMethod(m.id)} className={`py-3 rounded-xl border-2 flex flex-col items-center transition-all ${inputMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>
                      <span className="text-lg mb-1">{m.icon}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-[1.5] space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">旅遊商品名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="例如：南投清境奢華三日遊"
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-base transition-all"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              {inputMethod === InputMethod.TEXT && (
                <textarea
                  placeholder="輸入景點重點或特殊需求..."
                  className="w-full h-24 px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm"
                  value={extraContent}
                  onChange={(e) => setExtraContent(e.target.value)}
                />
              )}
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl transition-all ${isLoading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <span className="text-sm">處理中，請稍候...</span>
                    <span className="text-[9px] font-normal opacity-75 mt-1">{imageProgress}</span>
                  </div>
                ) : '🚀 開始 AI 企劃生成'}
              </button>
            </div>
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 font-bold text-center border-l-4 border-red-500">{error}</div>}
      </div>

      {generatedPlan && !isEditing && (
        <div className="w-full flex flex-col items-center animate-in fade-in duration-700">
          <div className="w-full max-w-5xl flex justify-between items-center mb-6 no-print px-4">
            <button onClick={() => setIsEditing(true)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black shadow-lg">✏️ 回到編輯模式</button>
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Download Guide</p>
                  <p className="text-[10px] text-slate-500">列印時請選擇「儲存為 PDF」格式</p>
               </div>
               <button onClick={() => window.print()} className="bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black hover:bg-emerald-700 shadow-2xl transition-all flex items-center gap-2">
                  🖨️ 儲存為 PDF 下載
               </button>
            </div>
          </div>
          <ItineraryPreview plan={generatedPlan} type={tourType} />
        </div>
      )}
    </div>
  );
};

export default App;
