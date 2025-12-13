/**
 * ReviewModal Component
 * Modal for submitting reviews after consultation
 */

import React, { useState } from 'react';
import { Star, X, Send, Loader2, Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '../ui';
import { submitReview, getAIReviewSuggestion, rephraseReview } from '../../services/reviews';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  doctorName: string;
  specialization?: string;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  doctorName,
  specialization,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [rephraseLoading, setRephraseLoading] = useState(false);
  const [showRephraseOptions, setShowRephraseOptions] = useState(false);

  if (!isOpen) return null;

  const handleAISuggestion = async () => {
    if (rating === 0) {
      setError('Please select a rating first');
      return;
    }
    
    setAiLoading(true);
    setError('');
    
    try {
      const suggestion = await getAIReviewSuggestion(doctorName, rating, specialization);
      setComment(suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI suggestion');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRephrase = async (style: 'professional' | 'casual' | 'concise' | 'detailed') => {
    if (!comment.trim()) {
      setError('Please write something to rephrase');
      return;
    }
    
    setRephraseLoading(true);
    setError('');
    setShowRephraseOptions(false);
    
    try {
      const rephrased = await rephraseReview(comment, style);
      setComment(rephrased);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rephrase');
    } finally {
      setRephraseLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await submitReview({
        appointment_id: appointmentId,
        rating,
        comment: comment.trim() || undefined,
      });
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select rating';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Rate Your Experience
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600 fill-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Thank You!
            </h3>
            <p className="text-slate-600">
              Your review has been submitted successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Doctor Name */}
              <div className="text-center">
                <p className="text-slate-600">How was your consultation with</p>
                <p className="text-lg font-semibold text-slate-900">{doctorName}?</p>
              </div>

              {/* Star Rating */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          value <= (hoveredRating || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className={`text-sm font-medium ${
                  (hoveredRating || rating) > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  {getRatingLabel(hoveredRating || rating)}
                </span>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Share your experience (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your consultation..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  {/* AI Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* AI Suggest Button */}
                    <button
                      type="button"
                      onClick={handleAISuggestion}
                      disabled={aiLoading || rating === 0}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={rating === 0 ? 'Select a rating first' : 'Get AI suggestion'}
                    >
                      {aiLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      AI Suggest
                    </button>
                    
                    {/* Rephrase Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRephraseOptions(!showRephraseOptions)}
                        disabled={rephraseLoading || !comment.trim()}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!comment.trim() ? 'Write something to rephrase' : 'Rephrase your review'}
                      >
                        {rephraseLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Rephrase
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      
                      {/* Rephrase Dropdown - opens upward */}
                      {showRephraseOptions && (
                        <div className="absolute left-0 bottom-full mb-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                          {[
                            { style: 'professional', label: 'Professional' },
                            { style: 'casual', label: 'Casual' },
                            { style: 'concise', label: 'Concise' },
                            { style: 'detailed', label: 'Detailed' },
                          ].map((option) => (
                            <button
                              key={option.style}
                              type="button"
                              onClick={() => handleRephrase(option.style as 'professional' | 'casual' | 'concise' | 'detailed')}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Character count */}
                  <p className="text-xs text-slate-400">
                    {comment.length}/1000
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Skip
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500"
                disabled={loading || rating === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
