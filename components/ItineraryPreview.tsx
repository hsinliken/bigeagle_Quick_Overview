
import React from 'react';
import { TourPlan, TourType, DayPlan } from '../types';
import { PICSUM_URL } from '../constants';

interface Props {
  plan: TourPlan;
  type: TourType;
}

const ItineraryPreview: React.FC<Props> = ({ plan, type }) => {
  const renderImages = (day: DayPlan) => {
    const isVertical = day.imagePosition === 'left' || day.imagePosition === 'right';
    const images: React.ReactNode[] = [];
    const count = Math.max(1, day.imageCount || 1);
    
    // Priority: Custom Images -> Picsum placeholders
    if (day.customImages && day.customImages.length > 0) {
      day.customImages.slice(0, count).forEach((img, i) => {
        images.push(
          <img 
            key={`custom-${i}`}
            src={img} 
            alt={`${day.title} - ${i}`} 
            className={`w-full ${isVertical ? 'h-auto mb-4' : 'h-48 md:h-64'} object-cover rounded-xl shadow-md border border-white`}
          />
        );
      });
    } else {
      // Clean seed for picsum
      const seedBase = (day.imageUrl || 'landscape').replace(/[^a-zA-Z0-9]/g, '');
      for (let i = 0; i < count; i++) {
        images.push(
          <img 
            key={`ai-${i}`}
            src={`${PICSUM_URL}/${seedBase}${day.day}${i}/800/600`} 
            alt={`${day.title} - AI Placeholder`} 
            className={`w-full ${isVertical ? 'h-auto mb-4' : 'h-48 md:h-64'} object-cover rounded-xl shadow-md border border-white`}
          />
        );
      }
    }

    // Container styling: Vertical stack for left/right, horizontal grid for bottom
    const containerClasses = isVertical 
      ? "flex flex-col w-full" 
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-8 w-full";

    return (
      <div className={containerClasses}>
        {images}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-2xl rounded-lg overflow-hidden max-w-5xl mx-auto my-8 print:shadow-none print:m-0 border border-gray-100 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-10 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-200 font-bold tracking-[0.3em] mb-3 text-sm opacity-80 uppercase">
            {type === TourType.DOMESTIC ? 'Domestic Travel Itinerary' : `International Travel | ${plan.countryCity || ''}`}
          </p>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{plan.mainTitle}</h1>
          <p className="text-xl md:text-2xl text-blue-100 font-medium italic opacity-90">{plan.marketingSubtitle}</p>
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="p-10">
        {/* Info Strip */}
        <div className="flex flex-wrap gap-8 md:gap-12 mb-12 border-b border-gray-200 pb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg text-xl">🗓️</div>
            <div>
              <span className="text-gray-400 text-[10px] block font-black uppercase tracking-widest">出發日期</span>
              <span className="text-gray-900 font-bold text-lg">{plan.departureInfo}</span>
            </div>
          </div>
          {plan.flightInfo && (
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg text-xl">✈️</div>
              <div>
                <span className="text-gray-400 text-[10px] block font-black uppercase tracking-widest">航班資訊</span>
                <div className="text-gray-900 font-bold text-sm">
                  <div>去：{plan.flightInfo.departure}</div>
                  <div>回：{plan.flightInfo.return}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Highlights */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-gray-800 mb-8 border-l-8 border-blue-600 pl-4">行程特色亮點</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.highlights.map((h, i) => (
              <div key={i} className="group p-5 bg-slate-50 rounded-xl border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-start">
                  <span className="text-blue-600 font-black text-2xl mr-4 opacity-40 group-hover:opacity-100">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-gray-800 font-bold leading-snug">{h}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Itinerary */}
        <section className="space-y-24">
          <h2 className="text-2xl font-black text-gray-800 mb-12 border-l-8 border-blue-600 pl-4">精選每日行程</h2>
          {plan.days.map((day, idx) => {
            const isBottom = day.imagePosition === 'bottom';
            const isLeft = day.imagePosition === 'left';
            
            return (
              <div key={idx} className={`print-break-inside-avoid flex flex-col ${isBottom ? '' : isLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 items-start`}>
                <div className="flex-1 w-full">
                  <div className="flex items-center mb-6">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-black mr-4 tracking-widest">DAY {day.day}</span>
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{day.title}</h3>
                  </div>
                  
                  <p className="text-gray-600 text-lg leading-relaxed mb-8 whitespace-pre-wrap font-medium">{day.description}</p>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 mb-8">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6">時間預排表</h4>
                    <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-100">
                      {day.timeline.map((item, i) => (
                        <div key={i} className="flex gap-6 items-start relative z-10">
                          <div className="w-6 h-6 rounded-full bg-white border-4 border-blue-500 flex-shrink-0"></div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                            <span className="text-blue-600 font-black font-mono text-sm sm:w-16">{item.time}</span>
                            <span className="text-gray-800 font-bold">{item.activity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-6 rounded-2xl">
                       <span className="block text-xs font-black text-blue-500 uppercase tracking-widest mb-3">美味餐食</span>
                       <div className="space-y-1 text-sm font-bold text-gray-700">
                         <div>早：{day.meals.breakfast}</div>
                         <div>午：{day.meals.lunch}</div>
                         <div>晚：{day.meals.dinner}</div>
                       </div>
                    </div>
                    <div className="bg-slate-800 text-white p-6 rounded-2xl">
                       <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">優質住宿</span>
                       <p className="text-lg font-black">{day.accommodation}</p>
                    </div>
                  </div>
                </div>

                <div className={`${isBottom ? 'w-full' : 'lg:w-[350px] flex-shrink-0'}`}>
                   {renderImages(day)}
                </div>
              </div>
            );
          })}
        </section>

        {/* Footer Details */}
        <section className="mt-24 pt-12 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-12 text-sm">
          <div className="space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight underline decoration-blue-500 decoration-4">費用詳情說明</h3>
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <span className="block font-black text-blue-700 mb-4 pb-2 border-b border-blue-200">【費用包含】</span>
              <ul className="space-y-2 text-gray-700 font-medium">
                {plan.costIncludes.map((item, i) => <li key={i} className="flex items-center"><span className="mr-2 text-blue-500">✓</span>{item}</li>)}
              </ul>
            </div>
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
              <span className="block font-black text-red-700 mb-4 pb-2 border-b border-red-200">【費用不包含】</span>
              <ul className="space-y-2 text-gray-700 font-medium">
                {plan.costExcludes.map((item, i) => <li key={i} className="flex items-center"><span className="mr-2 text-red-300">✗</span>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight underline decoration-blue-500 decoration-4">參團服務須知</h3>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block font-black text-gray-800 mb-4 pb-2 border-b border-slate-200">【注意事項】</span>
              <ul className="space-y-2 text-gray-600 font-medium">
                {plan.precautions.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0"></span>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ItineraryPreview;
