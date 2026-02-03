
import React from 'react';
import { TourPlan, TourType, DayPlan } from '../types';

interface Props {
  plan: TourPlan;
  type: TourType;
}

const ItineraryPreview: React.FC<Props> = ({ plan, type }) => {
  const renderImages = (day: DayPlan) => {
    const isBottom = day.imagePosition === 'bottom';
    const images: React.ReactNode[] = [];
    const count = Math.max(1, day.imageCount || 1);
    
    if (day.customImages && day.customImages.length > 0) {
      day.customImages.slice(0, count).forEach((img, i) => {
        images.push(
          <div key={`img-container-${i}`} className="relative group overflow-hidden rounded-2xl shadow-lg border border-slate-100 w-full h-full">
            <img 
              src={img} 
              alt={`${day.title} - ${i}`} 
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 aspect-video lg:aspect-square"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
               <p className="text-white font-bold text-[10px] sm:text-xs drop-shadow-md truncate leading-tight tracking-wider">
                  {day.title}
               </p>
            </div>
          </div>
        );
      });
    }

    if (images.length === 0) return null;

    if (isBottom) {
      const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
      }[count as 1|2|3|4] || 'grid-cols-1';

      return (
        <div className={`grid ${gridCols} gap-6 mt-8 w-full`}>
          {images}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        {images}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden max-w-5xl mx-auto my-8 print:shadow-none print:m-0 border border-gray-100 font-sans selection:bg-blue-100">
      {/* Header Section */}
      <div className="bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 rounded-full mb-6">
             <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
             <span className="text-[10px] font-black tracking-[0.3em] uppercase">
                {type === TourType.DOMESTIC ? 'Premium Domestic Journey' : `Global Discovery | ${plan.countryCity || 'Luxury Tour'}`}
             </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter leading-[1.1]">{plan.mainTitle}</h1>
          <p className="text-xl md:text-2xl text-blue-200 font-medium italic opacity-90 border-l-4 border-blue-500 pl-6 py-1">
             {plan.marketingSubtitle}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-500/10 -skew-x-[20deg] translate-x-1/4"></div>
      </div>

      <div className="p-8 md:p-16">
        {/* Quick Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16 pb-12 border-b border-slate-100">
          <div className="flex items-start space-x-5">
            <div className="bg-slate-50 p-4 rounded-2xl text-3xl border border-slate-100 shadow-sm">🗓️</div>
            <div>
              <span className="text-slate-400 text-[10px] block font-black uppercase tracking-widest mb-1">Departure</span>
              <span className="text-slate-900 font-black text-xl tracking-tight">{plan.departureInfo}</span>
            </div>
          </div>
          {plan.flightInfo && (
            <div className="flex items-start space-x-5 col-span-1 md:col-span-2 lg:col-span-2">
              <div className="bg-slate-50 p-4 rounded-2xl text-3xl border border-slate-100 shadow-sm">✈️</div>
              <div className="flex flex-col sm:flex-row gap-8">
                <div>
                  <span className="text-slate-400 text-[10px] block font-black uppercase tracking-widest mb-1">Outbound</span>
                  <span className="text-slate-900 font-bold text-base">{plan.flightInfo.departure}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-black uppercase tracking-widest mb-1">Inbound</span>
                  <span className="text-slate-900 font-bold text-base">{plan.flightInfo.return}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Highlights Section */}
        <section className="mb-20">
          <div className="flex items-center gap-6 mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter shrink-0">行程特色亮點</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plan.highlights.map((h, i) => (
              <div key={i} className="flex items-start p-6 bg-slate-50/70 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-500 group">
                <span className="text-blue-600 font-black text-2xl mr-5 opacity-30 group-hover:opacity-100 transition-opacity">{(i + 1).toString().padStart(2, '0')}</span>
                <p className="text-slate-800 font-bold leading-snug text-lg">{h}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Itinerary Body */}
        <section className="space-y-32">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter shrink-0">精選每日行程</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
          </div>
          
          {plan.days.map((day, idx) => {
            const isBottom = day.imagePosition === 'bottom';
            const isLeft = day.imagePosition === 'left';
            const isSide = !isBottom;
            
            return (
              <div key={idx} className={`print-break-inside-avoid flex flex-col ${isBottom ? '' : isLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-16 items-start relative`}>
                <div className={`w-full ${isSide ? 'flex-[2]' : ''}`}>
                  <div className="flex items-center mb-6">
                    <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-black mr-6 tracking-widest shadow-xl">DAY {day.day}</span>
                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight border-b-4 border-slate-100 pb-2 flex-1">
                      {day.title}
                    </h3>
                  </div>
                  
                  <p className="text-slate-600 text-lg md:text-xl leading-normal mb-8 whitespace-pre-wrap font-medium">
                    {day.description}
                  </p>
                  
                  <div className="bg-slate-50 rounded-[2rem] p-8 mb-8 border border-slate-100 shadow-inner group">
                    <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-200">
                      {day.timeline.map((item, i) => (
                        <div key={i} className="flex gap-8 items-start relative z-10 group/item">
                          <div className="w-6 h-6 rounded-full bg-white border-[5px] border-blue-600 flex-shrink-0 shadow-lg group-hover/item:scale-125 transition-transform"></div>
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-8">
                            <span className="text-blue-600 font-black font-mono text-lg sm:w-20 tracking-tighter">{item.time}</span>
                            <span className="text-slate-900 font-bold text-lg leading-tight">{item.activity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-blue-50/40 p-6 rounded-3xl border border-blue-100/50 flex items-center">
                       <div className="w-full">
                          <span className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2">Gastronomy 餐食</span>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-slate-700">早：<span className="text-slate-900">{day.meals.breakfast}</span></p>
                            <p className="text-sm font-bold text-slate-700">午：<span className="text-slate-900">{day.meals.lunch}</span></p>
                            <p className="text-sm font-bold text-slate-700">晚：<span className="text-slate-900">{day.meals.dinner}</span></p>
                          </div>
                       </div>
                    </div>
                    <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl flex items-center overflow-hidden relative">
                       <div className="relative z-10">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Accommodation 住宿</span>
                          <p className="text-xl font-black tracking-tight leading-tight">{day.accommodation}</p>
                       </div>
                       <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 -skew-x-12 translate-x-1/2"></div>
                    </div>
                  </div>

                  {isBottom && renderImages(day)}
                </div>

                {isSide && (
                  <div className="w-full lg:w-1/3 flex-shrink-0 max-w-sm sticky top-8">
                     {renderImages(day)}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Detailed Footer Section */}
        <section className="mt-32 pt-16 border-t-4 border-slate-900 grid grid-cols-1 lg:grid-cols-2 gap-16 text-sm">
          <div className="space-y-8">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">費用詳情與說明</h3>
            <div className="space-y-6">
              <div className="p-8 bg-blue-50/40 rounded-[2rem] border border-blue-100">
                <span className="block font-black text-blue-700 mb-4 text-base">【費用包含】</span>
                <ul className="space-y-2 text-slate-700 font-bold text-xs leading-snug">
                  {plan.costIncludes.map((item, i) => (
                    <li key={i} className="flex items-start"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-3 mt-1.5 shrink-0"></span>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-8 bg-red-50/40 rounded-[2rem] border border-red-100">
                <span className="block font-black text-red-700 mb-4 text-base">【費用不包含】</span>
                <ul className="space-y-2 text-slate-700 font-bold text-xs leading-snug">
                  {plan.costExcludes.map((item, i) => (
                    <li key={i} className="flex items-start"><span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-3 mt-1.5 shrink-0"></span>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">行前注意事項</h3>
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
              <ul className="space-y-3">
                {plan.precautions.map((item, i) => (
                  <li key={i} className="flex items-start text-xs font-bold text-slate-600 leading-snug">
                    <span className="mr-4 mt-1.5 w-1.5 h-1.5 bg-slate-300 rounded-full flex-shrink-0"></span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-xl">
               <span className="block font-black text-slate-400 mb-4 text-xs tracking-widest uppercase">Suggested Items</span>
               <div className="flex flex-wrap gap-2">
                  {plan.suggestedItems.map((item, i) => (
                    <span key={i} className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold">{item}</span>
                  ))}
               </div>
            </div>
          </div>
        </section>

        <footer className="mt-32 pt-12 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-6">
            * 行程內容供參考，實際以合約及行前說明會資料為準 *
          </p>
          <div className="inline-block bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl">
            Eagle AI Studio Itinerary Engine
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ItineraryPreview;
