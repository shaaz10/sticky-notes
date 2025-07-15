import React, { useState, useEffect } from 'react';
import { X, Code2, Tags, MessageCircle, Trash, ThumbsUp, PlayCircle } from 'lucide-react';
import { Project } from '../types';

const API_URL = 'https://openhouse-dev.vnrzone.site/api';

interface ProjectModalProps {
  user: {
    name: string;
    email: string;
    picture: string;
  };
  project: Project;
  onClose: () => void;
}

function ProjectModal({ user, project, onClose }: ProjectModalProps) {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [teamDetails, setTeamDetails] = useState<string[]>([]);

  const formatDateToIST = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(date);
  };

  useEffect(() => {
    if (project.id) {
      fetch(`${API_URL}/projects/${project.id}/comments-upvotes`)
        .then(res => res.json())
        .then(data => setComments(data.comments))
        .catch(err => console.error('Failed to fetch comments:', err));

      fetch(`${API_URL}/projects/${project.id}`)
        .then(res => res.json())
        .then(data => {
          const details = (data.team_details as string)
            ?.split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);
          setTeamDetails(details || []);
        })
        .catch(err => console.error('Failed to fetch team details:', err));

      const likedProjects = JSON.parse(localStorage.getItem('likedProjects') || '[]');
      setIsLiked(likedProjects.includes(project.id));
    }
  }, [project.id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);

    const response = await fetch(`${API_URL}/projects/${project.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: user.name, comment_text: commentText }),
    });

    if (response.ok) {
      const newComment = {
        id: Date.now(),
        user_name: user.name,
        comment_text: commentText,
        created_at: new Date().toISOString(),
      };
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
    } else {
      console.error('Error adding comment');
    }

    setIsSubmitting(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    const response = await fetch(`${API_URL}/projects/${project.id}/comment/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: user.name }),
    });

    if (response.ok) {
      const updatedCommentsResponse = await fetch(`${API_URL}/projects/${project.id}/comments-upvotes`);
      const updatedCommentsData = await updatedCommentsResponse.json();
      setComments(updatedCommentsData.comments);
    } else {
      console.error('Error deleting comment');
    }
  };

  const handleLike = async () => {
    const user_name = user.name;

    if (isLiked) {
      const response = await fetch(`${API_URL}/projects/${project.id}/remove-vote`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name }),
      });

      if (response.ok) {
        setIsLiked(false);
        const likedProjects = JSON.parse(localStorage.getItem('likedProjects') || '[]');
        const updated = likedProjects.filter((id: number) => id !== project.id);
        localStorage.setItem('likedProjects', JSON.stringify(updated));
      } else {
        console.error('Error removing like');
      }
    } else {
      const response = await fetch(`${API_URL}/projects/${project.id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name }),
      });

      if (response.ok) {
        setIsLiked(true);
        const likedProjects = JSON.parse(localStorage.getItem('likedProjects') || '[]');
        likedProjects.push(project.id);
        localStorage.setItem('likedProjects', JSON.stringify(likedProjects));
      } else {
        console.error('Error upvoting');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 shadow-2xl animate-fadeIn">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
              {project.title}
            </h2>
            <span className="bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
              {project.department}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 text-sm font-medium transition-transform duration-150 ${isLiked ? 'text-emerald-600 scale-105' : 'text-gray-600 hover:scale-105'}`}
            >
              <ThumbsUp size={20} />
              {isLiked ? 'Liked' : 'Like'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {project.images.map((image, index) => (
              <div key={index} className="aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <img
                  src={image}
                  alt={`${project.title} screenshot ${index + 1}`}
                  className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                />
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Abstract</h3>
            <p className="text-gray-600">{project.abstract}</p>
          </div>

          {project.pdfPoster && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Project Poster</h3>
              <div
                className="w-full h-64 bg-gray-100 border border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition"
                onClick={() => window.open(project.pdfPoster ?? '', '_blank')}
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/337/337946.png"
                  alt="PDF Icon"
                  className="w-12 h-12 mb-2 opacity-80"
                />
                <p className="text-blue-600 font-medium">Click to view Poster</p>
              </div>
            </div>
          )}

          {teamDetails.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Team Details</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                {teamDetails.map((member, idx) => (
                  <li key={idx}>{member}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Code2 className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Domain</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 backdrop-blur-md bg-white/60 border border-emerald-200 text-gray-800 rounded-full text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Tags className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 backdrop-blur-md bg-white/60 border border-emerald-200 text-gray-800 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {project.demoUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Demo</h3>
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-500 hover:text-blue-700"
              >
                <PlayCircle className="h-5 w-5" />
                Watch the Demo
              </a>
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Comments</h3>
            </div>
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-gray-800">{comment.user_name}</p>
                      {comment.user_name === user.name && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:underline text-sm flex items-center gap-1"
                        >
                          <Trash className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700">{comment.comment_text}</p>
                    <span className="text-xs text-gray-400">
                      {formatDateToIST(comment.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No comments yet. Be the first to comment!</p>
              )}
            </div>
            <div className="space-y-4 mt-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Add a comment..."
              />
              <button
                onClick={handleAddComment}
                disabled={isSubmitting || !commentText.trim()}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
              >
                {isSubmitting ? 'Adding Comment...' : 'Add Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectModal;
