import React, { useState } from 'react';
import { ExternalLink, Play, Clock, AlertCircle } from 'lucide-react';

interface PlatformResultCardProps {
  result: {
    platform: string;
    platformName: string;
    name: string;
    price: number | null;
    originalPrice: number | null;
    imageUrl: string | null;
    productUrl: string | null;
    stockStatus: string;
    rating: number | null;
    reviewCount: number | null;
  };
  onTrack: (result: any) => Promise<void>;
}

export function PlatformResultCard({ result, onTrack }: PlatformResultCardProps) {
  const [isTracking, setIsTracking] = useState(false);
  const isOutOfStock = result.stockStatus === 'out_of_stock';
  const hasDiscount = result.originalPrice && result.price && result.originalPrice > result.price;

  const handleTrack = async () => {
    setIsTracking(true);
    try {
      await onTrack(result);
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col h-full hover:border-primary/50 transition-colors group">
      {/* Platform Badge */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold px-2 py-1 bg-black/50 text-text-primary rounded-md border border-border">
          {result.platformName}
        </span>
        {isOutOfStock ? (
          <span className="text-xs font-medium px-2 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Out of Stock
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
            In Stock
          </span>
        )}
      </div>

      {/* Image & Title */}
      <div className="flex gap-4 mb-4 flex-1">
        <div className="w-20 h-20 shrink-0 rounded-lg bg-black/50 overflow-hidden flex items-center justify-center p-1 border border-border">
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={result.name} className="w-full h-full object-contain mix-blend-lighten" loading="lazy" />
          ) : (
            <Clock className="w-8 h-8 text-text-muted" />
          )}
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-text-primary line-clamp-3 leading-snug group-hover:text-primary transition-colors">
            {result.name}
          </h3>
          {result.rating && (
            <div className="flex items-center gap-1 mt-1 text-xs text-yellow-500">
              <span>★ {result.rating.toFixed(1)}</span>
              {result.reviewCount && <span className="text-text-muted">({result.reviewCount.toLocaleString()})</span>}
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-[#00FF7F] font-mono">
            {result.price ? `₹${result.price.toLocaleString('en-IN')}` : 'Price not found'}
          </span>
          {hasDiscount && (
            <span className="text-sm text-text-muted line-through font-mono">
              ₹{result.originalPrice!.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={handleTrack}
          disabled={isTracking || !result.productUrl}
          className={`flex-1 flex justify-center items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            isOutOfStock 
              ? 'bg-surface hover:bg-black text-text-primary border border-border'
              : 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,127,0.3)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isTracking ? (
            <span className="animate-pulse">Loading...</span>
          ) : isOutOfStock ? (
            <>Track Restock <Clock className="w-4 h-4" /></>
          ) : (
            <>Track This <Play className="w-4 h-4" /></>
          )}
        </button>
        
        {result.productUrl && (
          <a
            href={result.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-2 rounded-lg bg-surface border border-border text-text-muted hover:text-white hover:border-text-muted transition-all"
            title="View on Site"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
