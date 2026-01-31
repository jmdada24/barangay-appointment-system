"use client";

import { useState } from "react";
import { CheckCircle, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const feedbackCategories = [
  "General Feedback",
  "Service Quality",
  "Staff Assistance",
  "Facility Condition",
  "Appointment Process",
  "Suggestions",
  "Complaints",
  "Others",
] as const;

export default function ResidentFeedback() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = "Please select a rating";
    }
    if (!category) {
      newErrors.category = "Please select a category";
    }
    if (!feedback.trim()) {
      newErrors.feedback = "Feedback is required";
    } else if (feedback.trim().length < 10) {
      newErrors.feedback = "Feedback must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    // TODO: Submit to Supabase
    console.log("Submit feedback:", { rating, category, feedback });
    setShowSuccessModal(true);
  }

  function handleSuccessClose() {
    setShowSuccessModal(false);
    setRating(0);
    setCategory("");
    setFeedback("");
    setErrors({});
  }

  return (
    <div className="space-y-6">
      {/* Feedback Form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How would you rate your experience? <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={[
                        "w-7 h-7 transition-colors",
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-transparent text-gray-300",
                      ].join(" ")}
                    />
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
              )}
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                  }}
                  className={[
                    "w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/50",
                    errors.category ? "border-red-500" : "border-gray-200",
                    !category ? "text-gray-400" : "text-gray-900",
                  ].join(" ")}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {feedbackCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Feedback Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  if (errors.feedback) setErrors((prev) => ({ ...prev, feedback: "" }));
                }}
                rows={5}
                className={[
                  "w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none",
                  errors.feedback ? "border-red-500" : "border-gray-200",
                ].join(" ")}
                placeholder="Please share your thoughts, suggestions, or concerns..."
              />
              <p className="mt-1 text-xs text-gray-400">
                Minimum 10 characters ({feedback.length}/10)
              </p>
              {errors.feedback && (
                <p className="mt-1 text-sm text-red-600">{errors.feedback}</p>
              )}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary mb-1">
                Your feedback matters!
              </p>
              <p className="text-sm text-primary/80">
                We review all feedback to continuously improve our services. Your input helps us
                serve the community better.
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Submit Feedback
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Feedback Submitted!
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Thank you for sharing your feedback. We appreciate your input and will use it to
                improve our services.
              </p>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleSuccessClose}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}