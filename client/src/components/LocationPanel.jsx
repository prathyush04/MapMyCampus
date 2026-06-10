import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocationSocket } from '../hooks/useLocationSocket';
import {
  getLocation, createReview, voteReview, createPost, deletePost, toggleBookmark,
} from '../api';
import CategoryBadge from './CategoryBadge';
import StarRating from './StarRating';

const POST_TYPE_COLORS = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-red-50 border-red-200',
  event: 'bg-green-50 border-green-200',
  food: 'bg-orange-50 border-orange-200',
};

export default function LocationPanel({ locationId, onClose, onGetDirections }) {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, body: '' });
  const [postForm, setPostForm]     = useState({ body: '', post_type: 'info', expires_at: '' });
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [votedReviews, setVotedReviews] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { posts, reviews, seedPosts, seedReviews } = useLocationSocket(locationId);

  useEffect(() => {
    if (!locationId) return;
    getLocation(locationId).then(({ data }) => {
      setLocation(data);
      seedPosts(data.posts || []);
      seedReviews(data.reviews || []);
      setTotalReviews(data.review_count || 0);
    });
  }, [locationId]);

  const handleReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview({ location_id: locationId, ...reviewForm });
      setReviewForm({ rating: 5, body: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPost({ location_id: locationId, ...postForm });
      setPostForm({ body: '', post_type: 'info', expires_at: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (reviewId) => {
    const { data } = await voteReview(reviewId);
    setVotedReviews((prev) => {
      const s = new Set(prev);
      data.voted ? s.add(reviewId) : s.delete(reviewId);
      return s;
    });
  };

  const handleBookmark = async () => {
    const { data } = await toggleBookmark(locationId);
    setBookmarked(data.bookmarked);
  };

  const handleDeletePost = async (id) => {
    await deletePost(id);
    seedPosts(posts.filter((p) => p.id !== id));
  };

  if (!location) {
    return (
      <div className="fixed sm:relative bottom-0 left-0 right-0 h-48 sm:inset-auto sm:w-96 bg-white sm:h-full flex items-center justify-center text-gray-400 text-sm z-[998] rounded-t-2xl sm:rounded-none shadow-xl">
        Loading…
      </div>
    );
  }

  const hours = location.operating_hours || {};

  return (
    <div className="fixed sm:relative bottom-0 left-0 right-0 sm:inset-auto sm:w-96 bg-white sm:h-full flex flex-col shadow-xl overflow-hidden z-[1001] rounded-t-2xl sm:rounded-none max-h-[75vh] sm:max-h-full">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>
      {/* Header */}
      <div className="flex items-start p-4 border-b gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{location.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <CategoryBadge category={location.category} />
            <StarRating value={location.avg_rating} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleBookmark}
            className="text-xl"
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            {bookmarked ? '🔖' : '📌'}
          </button>
          <button
            onClick={() => onGetDirections(locationId)}
            className="text-xs bg-campus-blue text-white px-2 py-1 rounded"
          >
            Directions
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Photos */}
        {location.photos?.length > 0 && (
          <div className="flex gap-1 p-2 overflow-x-auto">
            {location.photos.map((p, i) => (
              <img key={i} src={p} alt="" className="h-28 w-40 object-cover rounded shrink-0" />
            ))}
          </div>
        )}

        {/* Description */}
        {location.description && (
          <p className="px-4 pt-3 pb-1 text-sm text-gray-600">{location.description}</p>
        )}

        {/* Hours */}
        {Object.keys(hours).length > 0 && (
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Hours</p>
            {Object.entries(hours).map(([day, time]) => (
              <div key={day} className="flex justify-between text-xs text-gray-700">
                <span className="capitalize">{day}</span>
                <span>{time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Live Posts */}
        <div className="px-4 py-2 border-t">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Live Updates</p>
          {posts.length === 0 && <p className="text-xs text-gray-400">No updates yet.</p>}
          {posts.map((p) => (
            <div key={p.id} className={`border rounded p-2 mb-2 text-sm ${POST_TYPE_COLORS[p.post_type] || ''}`}>
              <div className="flex justify-between items-start">
                <span className="font-medium capitalize">[{p.post_type}]</span>
                {(user?.id === p.user_id || user?.role === 'admin') && (
                  <button onClick={() => handleDeletePost(p.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                )}
              </div>
              <p className="mt-0.5">{p.body}</p>
              <p className="text-xs text-gray-400 mt-1">{p.user_name} · {new Date(p.created_at).toLocaleString()}</p>
            </div>
          ))}

          {user && (
            <form onSubmit={handlePost} className="mt-2 space-y-1">
              <select
                value={postForm.post_type}
                onChange={(e) => setPostForm((f) => ({ ...f, post_type: e.target.value }))}
                className="w-full border rounded text-xs p-1"
              >
                {['info','warning','event','food'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <textarea
                value={postForm.body}
                onChange={(e) => setPostForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Post an update…"
                rows={2}
                className="w-full border rounded text-xs p-1 resize-none"
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-campus-blue text-white text-xs py-1 rounded disabled:opacity-50"
              >
                Post Update
              </button>
            </form>
          )}
        </div>

        {/* Reviews */}
        {location.category !== 'academic' && (
        <div className="px-4 py-2 border-t">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Reviews ({totalReviews})
          </p>
          {reviews.map((r) => (
            <div key={r.id} className="border rounded p-2 mb-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{r.user_name}</span>
                <StarRating value={r.rating} />
              </div>
              {r.body && <p className="text-gray-600 mt-1 text-xs">{r.body}</p>}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => handleVote(r.id)}
                  className={`text-xs ${votedReviews.has(r.id) ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-600`}
                >
                  👍 {r.helpful_count}
                </button>
                <span className="text-xs text-gray-300">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {reviews.length < totalReviews && (
            <button
              onClick={() => setReviewPage((p) => p + 1)}
              className="text-xs text-campus-blue hover:underline"
            >
              Load more
            </button>
          )}

          {user && (
            <form onSubmit={handleReview} className="mt-3 space-y-1 border-t pt-2">
              <p className="text-xs font-semibold">Write a Review</p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}
                    className={`text-xl ${s <= reviewForm.rating ? 'text-amber-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={reviewForm.body}
                onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Your review (optional)"
                rows={2}
                className="w-full border rounded text-xs p-1 resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-campus-blue text-white text-xs py-1 rounded disabled:opacity-50"
              >
                Submit Review
              </button>
            </form>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
