
import React from 'react';
import { TourPlan, TourType, DayPlan } from '../types';

interface Props {
  plan: TourPlan;
  type: TourType;
}

const ItineraryPreview: React.FC<Props> = ({ plan, type }) => {
  const renderImages = (day: DayPlan) => {
    const isSide = day.imagePosition === 'left' || day.imagePosition === 'right';
    const images: React.ReactNode[] = [];
    const count = Math.max(1, day.imageCount || 1);
    
    if (day.customImages && day.customImages.length > 0) {
      day.customImages.slice(0, count).forEach((img, i) => {
        images.push(
          <div key={`img-container-${i}`} className="relative group overflow-hidden rounded-xl shadow-lg border border-white mb-4 last:mb-0">
            <img 
              src={img} 
              alt={`${day.title} - ${i}`} 
              className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
            />
            {/* HTML 文字疊加層：確保文字清晰正確 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
               <div className="flex items-center gap-2">
                 <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Location</span>
                 <p className="text-white font-bold text-sm drop-shadow-md truncate">{day.title}</p>
               </div>
            </div>
          </div>
        );
      });
    }

    const containerClasses = isSide 
      ? "flex flex-col w-full" 
      : "grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 w-full";

    return images.length > 0 ? (
      <div className={containerClasses}>
        {images}
      </div>
    ) : null;
  };

  return (
    <div className="bg-white shadow-2xl rounded-lg overflow-hidden max-w-5xl mx-auto my-8 print:shadow-none print:m-0 border border-gray-100 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-12 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-200 font-bold tracking-[0.4em] mb-4 text-xs opacity-80 uppercase">
            {type === TourType.DOMESTIC ? 'Exclusive Domestic Tour' : `World Discovery | ${plan.countryCity || ''}`}
          </p>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">{plan.mainTitle}</h1>
          <div className="h-1 w-24 bg-blue-400 mb-6"></div>
          <p className="text-xl md:text-2xl text-blue-100 font-medium italic opacity-90 leading-relaxed">{plan.marketingSubtitle}</p>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/10 skew-x-12 transform translate-x-20"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="p-10">
        {/* Info Strip */}
        <div className="flex flex-wrap gap-10 md:gap-16 mb-16 border-b border-gray-100 pb-10">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shadow-lg shadow-blue-100">🗓️</div>
            <div>
              <span className="text-gray-400 text-[10px] block font-black uppercase tracking-widest mb-1">Departure</span>
              <span className="text-gray-900 font-black text-xl">{plan.departureInfo}</span>
            </div>
          </div>
          {plan.flightInfo && (
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shadow-lg shadow-blue-100">✈️</div>
              <div>
                <span className="text-gray-400 text-[10px] block font-black uppercase tracking-widest mb-1">Flight Details</span>
                <div className="text-gray-900 font-black text-sm leading-tight">
                  <div>DEP: {plan.flightInfo.departure}</div>
                  <div>RET: {plan.flightInfo.return}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Highlights */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-3xl font-black text-gray-900">行程特色亮點</h2>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plan.highlights.map((h, i) => (
              <div key={i} className="group p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-400 hover:bg-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start">
                  <span className="bg-white text-blue-600 font-black text-xl w-10 h-10 flex items-center justify-center rounded-xl shadow-sm mr-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">{i + 1}</span>
                  <p className="text-gray-800 font-bold leading-relaxed text-lg pt-1">{h}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Itinerary */}
        <section className="space-y-40">
           <div className="flex items-center gap-4 mb-12">
            <h2 className="text-3xl font-black text-gray-900">精選每日行程</h2>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>
          {plan.days.map((day, idx) => {
            const isBottom = day.imagePosition === 'bottom';
            const isLeft = day.imagePosition === 'left';
            
            return (
              <div key={idx} className={`print-break-inside-avoid flex flex-col ${isBottom ? '' : isLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 items-start`}>
                <div className="flex-1 w-full">
                  <div className="flex items-center mb-8">
                    <div className="flex flex-col mr-6">
                      <span className="text-blue-600 font-black text-5xl leading-none">0{day.day}</span>
                      <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Day</span>
                    </div>
                    <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-tight border-l-4 border-blue-600 pl-6">{day.title}</h3>
                  </div>
                  
                  <p className="text-gray-600 text-xl leading-relaxed mb-10 whitespace-pre-wrap font-medium">{day.description}</p>
                  
                  <div className="bg-slate-50 rounded-3xl p-10 mb-10 border border-slate-100 relative">
                    <div className="absolute -top-4 left-10 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Time Schedule</div>
                    <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-200">
                      {day.timeline.map((item, i) => (
                        <div key={i} className="flex gap-8 items-start relative z-10">
                          <div className="w-6 h-6 rounded-full bg-white border-[6px] border-blue-600 flex-shrink-0 shadow-sm"></div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                            <span className="text-blue-600 font-black font-mono text-lg sm:w-24">{item.time}</span>
                            <span className="text-gray-900 font-bold text-lg">{item.activity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100">
                       <span className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-4">🍽️美味餐食 Gastronomy</span>
                       <div className="space-y-2 text-base font-bold text-gray-800">
                         <div className="flex justify-between"><span>早餐</span><span className="text-gray-500">{day.meals.breakfast}</span></div>
                         <div className="flex justify-between"><span>午餐</span><span className="text-gray-500">{day.meals.lunch}</span></div>
                         <div className="flex justify-between"><span>晚餐</span><span className="text-gray-500">{day.meals.dinner}</span></div>
                       </div>
                    </div>
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
                       <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">🏨優質住宿 Stay</span>
                       <p className="text-2xl font-black leading-tight">{day.accommodation}</p>
                    </div>
                  </div>
                </div>

                <div className={`${isBottom ? 'w-full' : 'lg:w-[350px] xl:w-[420px] flex-shrink-0'}`}>
                   {renderImages(day)}
                </div>
              </div>
            );
          })}
        </section>

        {/* Footer Details */}
        <section className="mt-40 pt-20 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-16 text-sm">
          <div className="space-y-10">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">費用及服務詳情</h3>
            <div className="p-10 bg-blue-50 rounded-[2.5rem] border border-blue-100">
              <span className="block font-black text-blue-700 mb-6 pb-4 border-b border-blue-200 text-lg">【費用包含內容】</span>
              <ul className="space-y-4 text-gray-700 text-base font-medium">
                {plan.costIncludes.map((item, i) => <li key={i} className="flex items-start"><span className="mr-3 text-blue-600 font-black text-xl leading-none">✓</span>{item}</li>)}
              </ul>
            </div>
            <div className="p-10 bg-red-50 rounded-[2.5rem] border border-red-100">
              <span className="block font-black text-red-700 mb-6 pb-4 border-b border-red-200 text-lg">【費用不包含內容】</span>
              <ul className="space-y-4 text-gray-700 text-base font-medium">
                {plan.costExcludes.map((item, i) => <li key={i} className="flex items-start"><span className="mr-3 text-red-400 font-black text-xl leading-none">✗</span>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="space-y-10">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">行前溫馨提醒</h3>
            <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <span className="block font-black text-gray-800 mb-6 pb-4 border-b border-slate-200 text-lg">【注意事項】</span>
              <ul className="space-y-4 text-gray-600 text-base font-medium">
                {plan.precautions.map((item, i) => <li key={i} className="flex items-start"><span className="mr-4 mt-2 w-2 h-2 bg-slate-400 rounded-full flex-shrink-0"></span>{item}</li>)}
              </ul>
            </div>
            <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <span className="block font-black text-gray-800 mb-6 pb-4 border-b border-slate-200 text-lg">【建議攜帶】</span>
              <ul className="space-y-4 text-gray-600 text-base font-medium">
                {plan.suggestedItems.map((item, i) => <li key={i} className="flex items-start"><span className="mr-4 mt-2 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-40 pt-16 border-t border-gray-100 text-center">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-4">
            * 本行程內容僅供參考，實際行程請以行前說明會資料為準 *
          </p>
          <div className="inline-block bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
            Powered by Eagle AI Studio Itinerary Engine
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ItineraryPreview;
