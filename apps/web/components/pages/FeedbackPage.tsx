"use client";

import { useState, useMemo } from "react";
import { Calendar, Filter, MessageSquare, Star, Trash2, User, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UserRole = "admin" | "staff";

type FeedbackCategory =
  | "General Feedback"
  | "Service Quality"
  | "Staff Assistance"
  | "Facility Condition"
  | "Appointment Process"
  | "Suggestions"
  | "Complaints"
  | "Others";

type Feedback = {
  id: string;
  residentName: string;
  residentEmail: string;
  rating: number;
  category: FeedbackCategory;
  content: string;
  createdAt: string;
};

interface FeedbackPageProps {
  role: UserRole;
}

const mockFeedbacks: Feedback[] = [
  { id: "1", residentName: "Juan Dela Cruz", residentEmail: "juan.delacruz@email.com", rating: 4, category: "Service Quality", content: "The online appointment system is easy to use. Great improvement!", createdAt: "2026-01-17" },
  { id: "2", residentName: "Maria Santos", residentEmail: "maria.santos@email.com", rating: 5, category: "Service Quality", content: "Excellent service! The staff were very helpful.", createdAt: "2026-01-16" },
  { id: "3", residentName: "Pedro Reyes", residentEmail: "pedro.reyes@email.com", rating: 2, category: "Complaints", content: "Long waiting time. Please improve the queue system.", createdAt: "2026-01-15" },
];

const categories: FeedbackCategory[] = [
  "General Feedback", "Service Quality", "Staff Assistance", "Facility Condition",
  "Appointment Process", "Suggestions", "Complaints", "Others",
];

const ratingLabels: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "Average", 4: "Good", 5: "Excellent" };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FeedbackPage({ role }: FeedbackPageProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedbacks);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    const avg = total > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1) : "0";
    const fiveStar = feedbacks.filter((f) => f.rating === 5).length;
    const needsAttention = feedbacks.filter((f) => f.rating <= 2).length;
    return [
      { label: "Average Rating", value: avg, hint: "Out of 5 stars", icon: Star },
      { label: "Total Feedback", value: total, hint: "All time", icon: MessageSquare },
      { label: "5-Star Reviews", value: fiveStar, hint: "Excellent rating", icon: Star },
      { label: "Needs Attention", value: needsAttention, hint: "1-2 star reviews", icon: Star },
    ];
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    let result = [...feedbacks];
    if (categoryFilter !== "all") result = result.filter((f) => f.category === categoryFilter);
    if (ratingFilter !== "all") result = result.filter((f) => f.rating === parseInt(ratingFilter));
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [feedbacks, categoryFilter, ratingFilter, sortOrder]);

  function handleRemoveClick(feedback: Feedback) {
    setSelectedFeedback(feedback);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  function handleArchiveConfirm() {
    if (!selectedFeedback) return;
    setFeedbacks((prev) => prev.filter((f) => f.id !== selectedFeedback.id));
    setShowArchiveModal(false);
    setSelectedFeedback(null);
  }

  function handleDeleteConfirm() {
    if (!selectedFeedback) return;
    setFeedbacks((prev) => prev.filter((f) => f.id !== selectedFeedback.id));
    setShowDeleteModal(false);
    setSelectedFeedback(null);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className="h-10 w-10 text-primary" />
                  <div className="text-3xl font-semibold">{s.value}</div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start space-y-1">
                <CardTitle className="font-semibold text-primary">{s.label}</CardTitle>
                <div className="text-xs text-muted-foreground">{s.hint}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Category</option>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Rating</option>
                {[5, 4, 3, 2, 1].map((r) => (<option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="p-4 bg-white border border-gray-100 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{feedback.residentName}</h3>
                      <p className="text-xs text-gray-500">{feedback.residentEmail}</p>
                      <div className="flex items-center gap-1.5 my-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${star <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-gray-300"}`}
                          />
                        ))}
                        <span className="text-xs text-gray-500">{ratingLabels[feedback.rating]}</span>
                      </div>
                      <p className="text-sm text-gray-600">{feedback.content}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">{formatDate(feedback.createdAt)}</span>
                    <button
                      onClick={() => handleRemoveClick(feedback)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        role === "staff"
                          ? "text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50"
                          : "text-red-400 hover:text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {role === "staff" ? <Archive className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredFeedbacks.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No feedback found</h3>
                <p className="text-sm text-gray-500">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Archive Modal (Staff) */}
      {showArchiveModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Archive Feedback?</h3>
            <p className="text-sm text-gray-500 mb-5">This feedback will be moved to archive.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowArchiveModal(false); setSelectedFeedback(null); }}>Cancel</Button>
              <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={handleArchiveConfirm}>Archive</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Admin) */}
      {showDeleteModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Delete Feedback?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setSelectedFeedback(null); }}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}