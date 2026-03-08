"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Star, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitFeedback } from "@/actions/feedback";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

const satisfactionQuestions = [
  "How satisfied are you with the quality of service provided?",
  "How professional and courteous was the staff?",
  "Was the appointment process smooth and efficient?",
  "How satisfied are you with the facilities and cleanliness?",
  "Would you recommend our barangay services to others?",
];

export default function ResidentFeedback() {
  const router = useRouter();
  const supabase = createClient();

  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [residentId, setResidentId] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [overallRating, setOverallRating] = useState<number>(0);
  const [hoveredOverallRating, setHoveredOverallRating] = useState<number>(0);
  const [suggestions, setSuggestions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Get resident ID and appointmentId on mount
  useEffect(() => {
    async function getResidentInfo() {
      try {
        const storedAppointmentId = sessionStorage.getItem("feedbackAppointmentId");
        setAppointmentId(storedAppointmentId);

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.push("/");
          return;
        }

        const { data: userRecord } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", userData.user.id)
          .single();

        const { data: residentRecord } = await supabase
          .from("residents")
          .select("id")
          .eq("user_id", userRecord?.id)
          .single();

        if (residentRecord) {
          setResidentId(residentRecord.id);
        }
      } catch (err) {
        console.error("Error getting resident info");
      } finally {
        setPageLoading(false);
      }
    }

    getResidentInfo();
  }, []);

  function validateForm() {
    const newErrors: Record<string, string> = {};

    // Validate all 5 questions are answered
    for (let i = 0; i < 5; i++) {
      if (!ratings[i]) {
        newErrors[`question_${i}`] = "Please rate this question";
      }
    }

    // Validate overall rating
    if (!overallRating) {
      newErrors.overallRating = "Please rate your overall experience";
    }

    // Validate suggestions (minimum 10 characters)
    if (!suggestions.trim()) {
      newErrors.suggestions = "Suggestions are required";
    } else if (suggestions.trim().length < 10) {
      newErrors.suggestions = "Suggestions must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm() || !residentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Submitting feedback...");

    try {
      // Calculate average rating from 5 questions
      const totalRating = Object.values(ratings).reduce((sum, rating) => sum + rating, 0);
      const averageRating = Math.round(totalRating / 5);

      // ✅ NEW: Pass individual ratings
      const result = await submitFeedback(residentId, {
        rating: averageRating,
        category: "Feedback",
        content: suggestions,
        appointmentId: appointmentId ? parseInt(appointmentId) : undefined,
        individualRatings: ratings, // ✅ NEW: Send individual question ratings
      });

      if (result.success) {
        toast.success("Thank you! Your feedback has been submitted.", {
          id: loadingToast,
          duration: 4000,
        });
        setShowSuccessModal(true);
      } else {
        toast.error(result.error || "Failed to submit feedback", {
          id: loadingToast,
          duration: 4000,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred",
        {
          id: loadingToast,
          duration: 4000,
        }
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuccessClose() {
    setShowSuccessModal(false);
    setRatings({});
    setOverallRating(0);
    setSuggestions("");
    setErrors({});
    sessionStorage.removeItem("feedbackAppointmentId");
    router.push("/resident/my-appointment");
  }

  function handleBackClick() {
    router.push("/resident/my-appointment");
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBackClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to My Appointments"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Client Satisfaction</h1>
          <p className="text-sm text-gray-600">
            We value your opinion. Help us improve our services.
          </p>
        </div>
      </div>

      {/* Feedback Form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Ratings Scale Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Rating Scale:</p>
              <div className="text-sm text-blue-800 space-y-1">
                <p>5 - Very Satisfied</p>
                <p>4 - Satisfied</p>
                <p>3 - Neutral</p>
                <p>2 - Dissatisfied</p>
                <p>1 - Very dissatisfied</p>
              </div>
            </div>

            {/* 5 Service Questions with Radio Buttons */}
            <div className="space-y-6">
              {satisfactionQuestions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {index + 1}. {question}
                  </label>
                  <div className="flex items-center gap-6">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`question_${index}`}
                          value={value}
                          checked={ratings[index] === value}
                          onChange={() => {
                            setRatings((prev) => ({ ...prev, [index]: value }));
                            // Clear error for this question
                            if (errors[`question_${index}`]) {
                              setErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors[`question_${index}`];
                                return newErrors;
                              });
                            }
                          }}
                          disabled={isLoading}
                          className="w-4 h-4 accent-blue-500 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-600">{value}</span>
                      </label>
                    ))}
                  </div>
                  {errors[`question_${index}`] && (
                    <p className="mt-2 text-sm text-red-600">{errors[`question_${index}`]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Overall Experience Rating */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  How would you rate your overall experience? <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {overallRating ? `${overallRating}/5` : "Not rated"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setOverallRating(star);
                      // Clear error
                      if (errors.overallRating) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.overallRating;
                          return newErrors;
                        });
                      }
                    }}
                    onMouseEnter={() => setHoveredOverallRating(star)}
                    onMouseLeave={() => setHoveredOverallRating(0)}
                    disabled={isLoading}
                    className="transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star
                      className={[
                        "w-7 h-7 transition-colors",
                        star <= (hoveredOverallRating || overallRating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-transparent text-gray-300",
                      ].join(" ")}
                    />
                  </button>
                ))}
              </div>
              {errors.overallRating && (
                <p className="mt-2 text-sm text-red-600">{errors.overallRating}</p>
              )}
            </div>

            {/* Suggestions Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggestions <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suggestions}
                onChange={(e) => {
                  setSuggestions(e.target.value);
                  // Clear error when user starts typing
                  if (errors.suggestions) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.suggestions;
                      return newErrors;
                    });
                  }
                }}
                disabled={isLoading}
                rows={4}
                className={[
                  "w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50",
                  errors.suggestions ? "border-red-500" : "border-gray-200",
                ].join(" ")}
                placeholder="Please share your thoughts, suggestions, or concerns..."
              />
              <p
                className={[
                  "mt-1 text-xs",
                  suggestions.length < 10 ? "text-gray-400" : "text-green-600",
                ].join(" ")}
              >
                Minimum 10 characters ({suggestions.length}/10)
              </p>
              {errors.suggestions && (
                <p className="mt-1 text-sm text-red-600">{errors.suggestions}</p>
              )}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary mb-1">Your feedback matters!</p>
              <p className="text-sm text-primary/80">
                We review all feedback to continuously improve our services. Your input helps us
                serve the community better.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
              size="lg"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Feedback
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback Submitted!</h3>
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