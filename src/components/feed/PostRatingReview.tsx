import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

interface PostRatingReviewProps {
  postId: string;
  postOwnerId: string;
  currentUserId: string;
  averageRating: number;
  totalRatings: number;
  userRating: number | null;
}

const StarRating = ({ rating, onRate, interactive = false, size = "w-4 h-4" }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: string;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <Star
        key={star}
        className={cn(
          size,
          interactive && "cursor-pointer hover:scale-110 transition-transform",
          star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
        )}
        onClick={() => interactive && onRate?.(star)}
      />
    ))}
  </div>
);

export const PostRatingReview = ({
  postId,
  postOwnerId,
  currentUserId,
  averageRating,
  totalRatings,
  userRating: initialUserRating,
}: PostRatingReviewProps) => {
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedRating, setSelectedRating] = useState(initialUserRating || 0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avgRating, setAvgRating] = useState(averageRating);
  const [totalCount, setTotalCount] = useState(totalRatings);
  const [myRating, setMyRating] = useState(initialUserRating);

  const isOwnPost = postOwnerId === currentUserId;

  const loadReviews = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setLoadingReviews(true);
    const { data } = await supabase
      .from("collaboration_post_ratings")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    const userIds = [...new Set((data || []).map(r => r.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    setReviews((data || []).map(r => ({ ...r, profile: profileMap[r.user_id] as any })));

    const existing = (data || []).find(r => r.user_id === currentUserId);
    if (existing) {
      setSelectedRating(existing.rating);
      setReviewText(existing.review_text || "");
    }

    setLoadingReviews(false);
    setExpanded(true);
  };

  const submitReview = async () => {
    if (selectedRating === 0 || isOwnPost) return;
    setSubmitting(true);

    if (myRating) {
      const { error } = await supabase
        .from("collaboration_post_ratings")
        .update({ rating: selectedRating, review_text: reviewText.trim() || null, updated_at: new Date().toISOString() })
        .eq("post_id", postId)
        .eq("user_id", currentUserId);
      if (error) toast.error("Failed to update review");
      else toast.success("Review updated!");
    } else {
      const { error } = await supabase
        .from("collaboration_post_ratings")
        .insert({ post_id: postId, user_id: currentUserId, rating: selectedRating, review_text: reviewText.trim() || null });
      if (error) toast.error("Failed to submit review");
      else {
        toast.success("Review submitted!");
        setTotalCount(prev => prev + 1);
      }
    }

    setMyRating(selectedRating);
    // Recalculate average
    const { data: allRatings } = await supabase
      .from("collaboration_post_ratings")
      .select("rating")
      .eq("post_id", postId);
    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setTotalCount(allRatings.length);
    }

    setSubmitting(false);
    loadReviews();
  };

  return (
    <div className="w-full">
      {/* Rating summary */}
      <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 px-2" onClick={loadReviews}>
        <StarRating rating={Math.round(avgRating)} />
        <span className="text-xs">
          {avgRating > 0 ? `${avgRating}` : ""} ({totalCount})
        </span>
      </Button>

      {expanded && (
        <div className="w-full space-y-4 border-t pt-3 mt-2">
          {/* Submit rating (not for own posts) */}
          {!isOwnPost && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground">
                {myRating ? "Update your review" : "Rate this post"}
              </p>
              <StarRating rating={selectedRating} onRate={setSelectedRating} interactive size="w-5 h-5" />
              <Textarea
                placeholder="Write a review (optional)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
              <Button
                size="sm"
                onClick={submitReview}
                disabled={selectedRating === 0 || submitting}
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                {myRating ? "Update" : "Submit"}
              </Button>
            </div>
          )}

          {/* Reviews list */}
          {loadingReviews ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="flex gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={review.profile?.avatar_url} />
                    <AvatarFallback className="text-xs">{review.profile?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{review.profile?.full_name}</span>
                      <StarRating rating={review.rating} size="w-3 h-3" />
                    </div>
                    {review.review_text && (
                      <p className="text-xs text-muted-foreground mt-0.5">{review.review_text}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No reviews yet</p>
          )}
        </div>
      )}
    </div>
  );
};
