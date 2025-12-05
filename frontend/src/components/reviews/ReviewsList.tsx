/**
 * ReviewsList Component
 * Displays reviews for a doctor profile
 */

import React, { useState, useEffect } from 'react';
import { Star, User, ChevronDown, Loader2 } from 'lucide-react';
import { getDoctorReviews } from '../../services/reviews';
import type { Review, DoctorReviewsResponse } from '../../services/reviews';
import { Button } from '../ui';

interface ReviewsListProps {
  doctorId: number;
  initialData?: DoctorReviewsResponse;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ doctorId, initialData }) => {
  const [data, setData] = useState<DoctorReviewsResponse | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialData) {
      fetchReviews();
    }
  }, [doctorId]);

  const fetchReviews = async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await getDoctorReviews(doctorId, pageNum, 5);
      if (append && data) {
        setData({
          ...response,
          reviews: [...data.reviews, ...response.reviews],
        });
      } else {
        setData(response);
      }
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchReviews(page + 1, true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => fetchReviews()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Reviews Yet</h3>
        <p className="text-slate-500">
          Be the first to review this doctor after your consultation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
        <div className="flex items-center gap-6">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-5xl font-bold text-amber-600">
              {data.average_rating.toFixed(1)}
            </div>
            <div className="flex gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`w-4 h-4 ${
                    value <= Math.round(data.average_rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-amber-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-amber-700 mt-1">
              {data.total} {data.total === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = data.rating_distribution[String(rating)] || 0;
              const percentage = data.total > 0 ? (count / data.total) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-amber-600">{rating}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-amber-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {data.reviews.map((review) => (
          <ReviewCard key={review.id} review={review} formatDate={formatDate} />
        ))}
      </div>

      {/* Load More */}
      {data.reviews.length < data.total && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load More Reviews
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

interface ReviewCardProps {
  review: Review;
  formatDate: (date: string) => string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, formatDate }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h4 className="font-medium text-slate-900">
                {review.patient_name || 'Anonymous'}
              </h4>
              <p className="text-sm text-slate-500">
                {formatDate(review.created_at)}
              </p>
            </div>
            
            {/* Rating */}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`w-4 h-4 ${
                    value <= review.rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Comment */}
          {review.comment && (
            <p className="text-slate-600 leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsList;
