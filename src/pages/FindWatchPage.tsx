import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { PlatformResultCard } from '@/components/PlatformResultCard';
import { Skeleton } from '@/components/Skeleton';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

const QUICK_SEARCHES = ["HMT Jantar", "Casio F91W", "Titan Edge", "Seiko 5 Sports", "Orient Bambino"];

const PLATFORM_NAMES = ['Amazon.in', 'Flipkart', 'Myntra', 'Titan.co.in', 'HMTWatches.com', 'Tata Cliq', 'Nykaa Fashion', 'Meesho', 'AJIO', 'Snapdeal'];

export default function FindWatchPage() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('price_asc');
  const [inStockOnly, setInStockOnly] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = directQuery || query;
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);

    try {
      // Use relative path in production (Vercel serverless), absolute in local dev
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/search-watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (data.success && data.results) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search platforms. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const extractBrandFromName = (name: string) => {
    const commonBrands = ['Casio', 'Titan', 'HMT', 'Seiko', 'Orient', 'Citizen', 'Rolex', 'Omega', 'Timex', 'Fossil'];
    const lowerName = name.toLowerCase();
    for (const brand of commonBrands) {
      if (lowerName.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    return name.split(' ')[0] || 'Unknown';
  };

  const handleTrack = async (result: any) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('You must be logged in to track watches');
        navigate('/login');
        return;
      }

      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/watches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          name: result.name,
          brand: extractBrandFromName(result.name),
          retailer: result.platform,
          product_url: result.productUrl,
          current_price: result.price,
          original_price: result.originalPrice,
          stock_status: result.stockStatus,
          image_url: result.imageUrl,
          target_price: null,
          alert_types: ['price_drop'],
          channels: ['email'],
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to track watch');
      }

      toast.success(`Now tracking on ${result.platformName}!`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start tracking');
    }
  };

  const filteredAndSortedResults = results
    .filter(r => !inStockOnly || r.stockStatus !== 'out_of_stock')
    .sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || Infinity) - (b.price || Infinity);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'availability') return a.stockStatus === 'in_stock' ? -1 : 1;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-h-screen">
      {/* Hero Search Area */}
      <div className={`transition-all duration-500 ease-in-out flex flex-col items-center ${hasSearched ? 'mb-8' : 'mt-24 mb-32'}`}>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 text-center">
          Find a Watch
        </h1>
        <form onSubmit={(e) => handleSearch(e)} className="w-full max-w-2xl relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-text-muted group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-32 py-4 bg-surface border-2 border-border rounded-xl text-white placeholder-text-muted focus:ring-0 focus:border-primary transition-all shadow-xl"
            placeholder="Search any watch model... e.g. HMT Jantar, Casio F91W"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute inset-y-2 right-2 px-4 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            <span className="hidden sm:inline">All Platforms</span>
          </button>
        </form>

        {!hasSearched && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
            <span className="text-sm text-text-muted mr-2 flex items-center">Popular:</span>
            {QUICK_SEARCHES.map(qs => (
              <button
                key={qs}
                onClick={() => { setQuery(qs); handleSearch(undefined, qs); }}
                className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-text-primary hover:border-primary hover:text-primary transition-colors"
              >
                {qs}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Area */}
      {hasSearched && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface/50 p-4 rounded-xl border border-border">
            <h2 className="text-lg font-medium text-white">
              {isSearching ? `Searching across 10 platforms...` : `Showing results for "${query}" across ${results.length} listings`}
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={inStockOnly} 
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary bg-black"
                />
                In Stock Only
              </label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black border border-border text-sm rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:ring-0 outline-none"
              >
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="availability">Availability</option>
              </select>
            </div>
          </div>

          {/* Loading Skeletons */}
          {isSearching && results.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {PLATFORM_NAMES.map(platform => (
                <div key={platform} className="bg-surface border border-border rounded-xl p-4 flex flex-col h-full animate-pulse">
                   <div className="flex justify-between items-start mb-3">
                     <span className="text-xs font-semibold px-2 py-1 bg-black text-text-muted rounded-md border border-border">
                       Searching {platform}...
                     </span>
                   </div>
                   <div className="flex gap-4 mb-4">
                     <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                     <div className="flex-1 space-y-2">
                       <Skeleton className="h-4 w-full" />
                       <Skeleton className="h-4 w-3/4" />
                     </div>
                   </div>
                   <Skeleton className="h-6 w-1/3 mb-4" />
                   <div className="flex gap-2 mt-auto">
                     <Skeleton className="h-9 w-full rounded-lg" />
                     <Skeleton className="h-9 w-10 rounded-lg shrink-0" />
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isSearching && results.length === 0 && (
            <div className="text-center py-20 bg-surface/30 rounded-2xl border border-border border-dashed">
              <div className="bg-black/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Search className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No results found for "{query}"</h3>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                We checked 10 platforms but couldn't find any exact matches. Try a shorter name, a different spelling, or check our suggestions below.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_SEARCHES.map(qs => (
                  <button
                    key={qs}
                    onClick={() => { setQuery(qs); handleSearch(undefined, qs); }}
                    className="text-sm px-4 py-2 rounded-full bg-surface border border-border text-text-primary hover:border-primary hover:text-primary transition-colors"
                  >
                    {qs}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedResults.map((result, idx) => (
              <PlatformResultCard 
                key={`${result.platform}-${result.productUrl}-${idx}`} 
                result={result} 
                onTrack={handleTrack} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
