import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Trash, MessageCircle, PlayCircle, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = 'https://openhouse-dev.vnrzone.site/api';


interface MyProjectsProps {
  user: { email: string; name: string; picture: string } | null;
}

const MyProjects: React.FC<MyProjectsProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects only after user is logged in
  useEffect(() => {
    const fetchProjects = async () => {
      if (user?.email) {
        const username = user.email.split('@')[0]; // Extract username from email
        console.log('Fetching projects for user:', username);
        
        try {
          setLoading(true);
          // Use the endpoint that gets the current user's projects
          const response = await fetch(`${API_URL}/projects/me`, {
            method: 'GET', // Assuming it's a GET request, you can change this if the API requires POST or another method
            headers: {
              'Content-Type': 'application/json',
              'user_name': username, // Send the user_name in headers
            },
          
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch projects');
          }
          
          const data = await response.json();
          
          // Format the data to match the Project type
          const formatted = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            abstract: item.abstract,
            techStack: item.domain ? [item.domain] : [],
            tags: item.tags ? item.tags.split(',').map((tag: string) => tag.trim()) : [],
            thumbnail: item.cover_poster
              ? `${API_URL}/uploads/${item.cover_poster}`
              : 'https://via.placeholder.com/500x300?text=No+Cover',
            images: [
              item.cover_poster
                ? `${API_URL}/uploads/${item.cover_poster}`
                : 'https://via.placeholder.com/800x500?text=No+Cover',
              item.result
                ? `${API_URL}/uploads/${item.result}`
                : 'https://via.placeholder.com/800x500?text=No+Result',
              item.methodology
                ? `${API_URL}/uploads/${item.methodology}`
                : 'https://via.placeholder.com/800x500?text=No+Methodology'
            ],
            demoUrl: item.drive_link || '#',
            likes: item.votes_count || 0,
            comments: item.comments_count || 0,
            department: item.department || 'General',
            team: item.team_details || '',
            mentor: item.mentor_name || '',
            isSoftware: item.is_software === 'true',
            startupPotential: item.startup_potential || '',
            uploadedBy: item.user_name || '',
            pdfPoster: item.pdf_poster
              ? `https://openhouse-dev.vnrzone.site/api/uploads/${item.pdf_poster}`
              : null
          }));
          
          setProjects(formatted);
        } catch (err) {
          console.error('Failed to fetch projects:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchProjects();
  }, [user]);

  const handleDeleteProject = async (projectId: number) => {
    if (!user?.email) return;
    
    const username = user.email.split('@')[0]; // Extract username from email
    
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        // Send a DELETE request to delete the project
        const response = await fetch(`${API_URL}/projects/${projectId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_name: username }),
        });
        
        if (response.ok) {
          // Remove the deleted project from the UI
          setProjects((prevProjects) => prevProjects.filter((project) => project.id !== projectId));
        } else {
          console.error('Error deleting project');
          alert('Failed to delete the project. Please try again.');
        }
      } catch (error) {
        console.error('Error while deleting project:', error);
        alert('An error occurred while deleting the project.');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Projects</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-600 mb-4">You haven't uploaded any projects yet.</p>
          <Link 
            to="/upload" 
            className="inline-block bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            Upload Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl border">
              <div className="relative cursor-pointer h-48 overflow-hidden">
                <img 
                  src={project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-sm">
                  {project.department}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold">{project.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{project.abstract}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags?.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 text-white shadow"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <ThumbsUp size={18} />
                      <span className="text-sm">{project.likes}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-gray-600">
                      <MessageCircle size={18} />
                      <span className="text-sm">{project.comments}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <a 
                      href={project.demoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-800"
                    >
                      <PlayCircle size={18} />
                      <span className="text-sm">Demo</span>
                    </a>
                    
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-800"
                    >
                      <Trash size={18} />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProjects;