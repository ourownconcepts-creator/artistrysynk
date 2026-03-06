import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_profile?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface ServiceReviewsProps {
  serviceId: string;
  averageRating?: number;
  totalReviews?: number;
}

export const ServiceReviews = ({ serviceId, averageRating = 0, totalReviews = 0 }: ServiceReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [serviceId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("service_reviews")
        .select("id, rating, review_text, created_at, reviewer_id")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch reviewer profiles
      if (data && data.length > 0) {
        const reviewerIds = data.map(r => r.reviewer_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", reviewerIds);

        const reviewsWithProfiles = data.map(review => ({
          ...review,
          reviewer_profile: profiles?.find(p => p.id === review.reviewer_id)
        }));

        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{averageRating.toFixed(1)}</div>
          <div className="flex justify-center mt-1">{renderStars(Math.round(averageRating))}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={review.reviewer_profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {review.reviewer_profile?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {review.reviewer_profile?.full_name || "Anonymous"}
                        {review.reviewer_profile?.username && (
                          <span className="text-xs text-muted-foreground ml-1">@{review.reviewer_profile.username}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="mt-1">{renderStars(review.rating)}</div>
                    {review.review_text && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {review.review_text}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
