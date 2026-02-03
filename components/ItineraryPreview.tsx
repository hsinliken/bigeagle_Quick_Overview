
import React from 'react';
import { TourPlan, TourType, DayPlan } from '../types';

interface Props {
  plan: TourPlan;
  type: TourType;
}

const ItineraryPreview: React.FC<Props> = ({ plan, type }) => {
  const renderImages = (day: DayPlan) => {
    const isBottom = day.imagePosition === 'bottom';
    const isSide = day.imagePosition === 'left' || day.imagePosition === 'right';
    const images: React.ReactNode[] = [];
    const count = Math.max(1, day.imageCount || 1);
    
    if (day.customImages && day.customImages.length > 0) {
      day.customImages.slice(0, count).forEach((img, i) => {
        images.push(
          <div key={`img-container-${i}`} className="relative group overflow-hidden rounded-lg shadow-sm border border-slate-100 w-full h-full">
            <img 
              src={img} 
              alt={`${day.title} - ${i}`} 
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 aspect-video"
            />
            {/* HTML 文字疊加層 - 系統字體保證清晰無模糊 */}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
               <p className="text-white font-bold text-[10px] drop-shadow-md truncate leading-tight">
                  {day.title}
               </p>
            </div>
          </div>
        );
      });
    }

    if (images.length === 0) return null;

    // 排版邏輯
    // 1. Bottom: 橫式排列，寬度 = 100% / 張數
    if (isBottom) {
      const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
      }[count as 1|2|3|4] || 'grid-cols-1';

      return (
        <div className={`grid ${gridCols} gap-4 mt-8 w-full`}>
          {images}
        </div>
      );
    }

    // 2. Left/Right: 垂直排列，寬度由父層 lg:w-1/5 控制
    return (
      <div className="flex flex-col gap-3 w-full">
        {images}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-2xl rounded-lg overflow-hidden max-w-5xl mx-auto my-8 print:shadow-none print:m-0 border border-gray-100 font-sans selection:bg-blue-100">
      {/* Header Section */}
      <div className="bg-slate-900 text-white p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 rounded-full mb-4">
             <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
             <span className="text-[9px] font-black tracking-widest uppercase">
                {type === TourType.DOMESTIC ? 'Premium Domestic Journey' : `Global Discovery | ${plan.countryCity || ''}`}
             </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">{plan.mainTitle}</h1>
          <p className="text-lg md:text-xl text-blue-200 font-medium italic opacity-90 border-l-2 border-blue-500 pl-4">
             {plan.marketingSubtitle}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/5 -skew-x-12 translate-x-1/2"></div>
      </div>

      <div className="p-8 md:p-12">
        {/* Quick Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 pb-10 border-b border-slate-100">
          <div className="flex items-start space-x-4">
            <div className="bg-slate-50 p-3 rounded-2xl text-2xl border border-slate-100">🗓️</div>
            <div>
              <span className="text-slate-400 text-[9px] block font-black uppercase tracking-widest mb-1">Departure</span>
              <span className="text-slate-900 font-black text-lg tracking-tight">{plan.departureInfo}</span>
            </div>
          </div>
          {plan.flightInfo && (
            <div className="flex items-start space-x-4 col-span-1 md:col-span-2 lg:col-span-2">
              <div className="bg-slate-50 p-3 rounded-2xl text-2xl border border-slate-100">✈️</div>
              <div className="flex flex-col sm:flex-row gap-6">
                <div>
                  <span className="text-slate-400 text-[9px] block font-black uppercase tracking-widest mb-1">Outbound</span>
                  <span className="text-slate-900 font-bold text-sm">{plan.flightInfo.departure}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] block font-black uppercase tracking-widest mb-1">Inbound</span>
                  <span className="text-slate-900 font-bold text-sm">{plan.flightInfo.return}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Highlights Section */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">行程特色亮點</h2>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.highlights.map((h, i) => (
              <div key={i} className="flex items-start p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                <span className="text-blue-600 font-black text-xl mr-4 opacity-40">{i + 1}</span>
                <p className="text-slate-800 font-bold leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Itinerary Body */}
        <section className="space-y-32">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">精選每日行程</h2>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          
          {plan.days.map((day, idx) => {
            const isBottom = day.imagePosition === 'bottom';
            const isLeft = day.imagePosition === 'left';
            const isSide = !isBottom;
            
            return (
              <div key={idx} className={`print-break-inside-avoid flex flex-col ${isBottom ? '' : isLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-start relative`}>
                
                {/* 內容區域：側邊排版時佔 80% (4/5)，底部排版時佔 100% */}
                <div className={`w-full ${isSide ? 'lg:w-4/5' : ''}`}>
                  <div className="flex items-center mb-6">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black mr-4 tracking-widest shadow-md">DAY {day.day}</span>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-tight border-b-2 border-slate-100 pb-1 flex-1">
                      {day.title}
                    </h3>
                  </div>
                  
                  <p className="text-slate-600 text-lg leading-relaxed mb-8 whitespace-pre-wrap font-medium">
                    {day.description}
                  </p>
                  
                  <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-100 shadow-inner">
                    <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-100">
                      {day.timeline.map((item, i) => (
                        <div key={i} className="flex gap-6 items-start relative z-10">
                          <div className="w-5 h-5 rounded-full bg-white border-[4px] border-blue-600 flex-shrink-0 shadow-sm"></div>
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-6">
                            <span className="text-blue-600 font-black font-mono text-base sm:w-20 tracking-tighter">{item.time}</span>
                            <span className="text-slate-900 font-bold text-base leading-tight">{item.activity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-center">
                       <div>
                          <span className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Gastronomy 餐食</span>
                          <p className="text-sm font-bold text-slate-700">
                            早：{day.meals.breakfast} / 午：{day.meals.lunch} / 晚：{day.meals.dinner}
                          </p>
                       </div>
                    </div>
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex items-center">
                       <div>
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Accommodation 住宿</span>
                          <p className="text-base font-black tracking-tight">{day.accommodation}</p>
                       </div>
                    </div>
                  </div>

                  {/* 當選擇 Bottom 時圖片顯示在此處 */}
                  {isBottom && renderImages(day)}
                </div>

                {/* 當選擇 Left/Right 時圖片顯示在此處：佔 20% (1/5) */}
                {isSide && (
                  <div className="w-full lg:w-1/5 flex-shrink-0">
                     {renderImages(day)}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Detailed Footer Section */}
        <section className="mt-40 pt-16 border-t-2 border-slate-900 grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm">
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">費用詳情與說明</h3>
            <div className="space-y-4">
              <div className="p-6 bg-blue-50/30 rounded-2xl border border-blue-100">
                <span className="block font-black text-blue-700 mb-3 text-sm">【費用包含】</span>
                <ul className="space-y-2 text-slate-700 font-medium text-xs">
                  {plan.costIncludes.map((item, i) => (
                    <li key={i} className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-red-50/30 rounded-2xl border border-red-100">
                <span className="block font-black text-red-700 mb-3 text-sm">【費用不包含】</span>
                <ul className="space-y-2 text-slate-700 font-medium text-xs">
                  {plan.costExcludes.map((item, i) => (
                    <li key={i} className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></span>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">行前注意事項</h3>
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100">
              <ul className="space-y-3">
                {plan.precautions.map((item, i) => (
                  <li key={i} className="flex items-start text-xs font-bold text-slate-600 leading-relaxed">
                    <span className="mr-3 mt-1.5 w-1 h-1 bg-slate-300 rounded-full flex-shrink-0"></span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-32 pt-10 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            * 行程內容供參考，實際以合約及行前說明會資料為準 *
          </p>
          <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
            Eagle AI Studio Itinerary Engine
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ItineraryPreview;
