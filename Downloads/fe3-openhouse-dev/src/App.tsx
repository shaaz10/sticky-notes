import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { MessageCircle, PlayCircle, ThumbsUp, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ProjectModal from './components/ProjectModal';
import Navbar from './components/Navbar';
import { Project } from './types';
import handleCredentialResponse from './components/handleCrendentialResponse';
import MyProjects from './components/MyProjects';
import Upload from './components/Upload';
import './App.css';
import bgImage from './images/12.png'; // adjust the path if you're in a subfolder


declare global {
  interface Window {
    google: any;
  }
}

const API_URL = 'https://openhouse-dev.vnrzone.site/api';
// Shuffle function
const shuffleArray = (array: Project[]): Project[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

// Randomize the order



export interface User {
  name: string;
  email: string;
  picture: string;
}

// ✅ Load user from cookie if available
function getUserFromCookie(): User | null {
  const userCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('user='));

  if (userCookie) {
    try {
      const value = decodeURIComponent(userCookie.split('=')[1]);
      return JSON.parse(value);
    } catch (err) {
      console.error('Failed to parse user cookie:', err);
    }
  }
  return null;
}

function App() {
  const [user, setUser] = useState<User | null>(() => getUserFromCookie());
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null); // Track selected project for modal
  const [likedProjects, setLikedProjects] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ✅ Google login button init
  useEffect(() => {
    if (window.google?.accounts?.id && !user) {
      window.google.accounts.id.initialize({
        client_id: '522460567146-ubk3ojomopil8f68hl73jt1pj0jbbm68.apps.googleusercontent.com',
        callback: (response: any) => {
          const decoded = handleCredentialResponse(response);
          setUser(decoded);
          document.cookie = `user=${encodeURIComponent(JSON.stringify(decoded))}; path=/; SameSite=Lax`;
        }
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-login-button')!,
        { theme: 'outline', size: 'large' }
      );
    }
  }, [user]);

  // ✅ Fetch projects and tags/departments only after login
  useEffect(() => {
    if (!user) return;

    fetch(`${API_URL}/projects`)
      .then(res => res.json())
      .then(data => {
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
          likes: item.aggr_upvote_count || 0, // Display the likes count
          comments: item.agggr_comment_count || 0, // Display the comment count
          department: item.department || 'General',
          team: item.team_details || '',
          mentor: item.mentor_name || '',
          isSoftware: item.is_software === 'true',
          startupPotential: item.startup_potential || '',
          uploadedBy: item.user_name || '',
          pdfPoster: item.pdf_poster
            ? `${API_URL}/uploads/${item.pdf_poster}`
            : null
        }));
        setProjects(formatted);

        // Extract unique tags and departments from the project data
        const allTags = new Set<string>();
        const allDepartments = new Set<string>();
        data.forEach((item: any) => {
          item.tags && item.tags.split(',').forEach((tag: string) => allTags.add(tag.trim()));
          item.department && allDepartments.add(item.department);
        });

        setTags([...allTags]);
        setDepartments([...allDepartments]);
      })
      .catch(err => console.error('Failed to fetch projects:', err));
  }, [user]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = new Set(prev);
      newTags.has(tag) ? newTags.delete(tag) : newTags.add(tag);
      return newTags;
    });
  };

  const handleDepartmentToggle = (department: string) => {
    setSelectedDepartments(prev => {
      const newDepartments = new Set(prev);
      newDepartments.has(department)
        ? newDepartments.delete(department)
        : newDepartments.add(department);
      return newDepartments;
    });
  };

  const filteredProjects = projects.filter(project => {
    const matchesTags = selectedTags.size === 0 || project.tags?.some(tag => selectedTags.has(tag));
    const matchesDepartment = selectedDepartments.size === 0 || selectedDepartments.has(project.department);
    return matchesTags && matchesDepartment;
  });
  const shuffledProjects = shuffleArray(filteredProjects);

  if (!user) {
    return (
      <div
  className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  {/* Optional dark overlay */}
  <div className="absolute inset-0 bg-black/50"></div>

  <div className="relative bg-white/30 backdrop-blur-md rounded-xl shadow-lg p-10 max-w-md w-full text-center border border-white/20">
    <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
      Welcome to Project Explorer
    </h1>
    <p className="text-white mb-6">
      Login with your Google account to explore exciting student projects
    </p>
    <div id="google-login-button" />
  </div>
</div>

    
    );
  }

  const handleLike = async (projectId: number) => {
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    const user_name = user.email.split('@')[0];  // Use the part before '@' as the user_name

    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_name })
      });

      if (response.ok) {
        // If successful, update the like state
        setLikedProjects(prev => {
          const newSet = new Set(prev);
          newSet.add(projectId); // Add the like
          return newSet;
        });
      } else {
        const error = await response.text();
        console.error('Failed to upvote:', error);
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
        <Navbar currentRoute="projects" user={user} setUser={setUser} onGoogleCredentialResponse={() => {}} />

        <Routes>
          <Route path="/myprojects" element={<MyProjects user={user}/>} />
          <Route path="/upload" element={<Upload user={user}/>} />
          <Route path="/" element={
            <main className="container mx-auto px-4 py-8">
              {/* Filter Toggle */}
              <div className="relative mb-8">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full bg-white rounded-xl shadow-lg p-4 flex items-center justify-between border"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-2 rounded-lg">
                      <Filter className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Filter Projects</span>
                    {(selectedTags.size > 0 || selectedDepartments.size > 0) && (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-sm">
                        {selectedTags.size + selectedDepartments.size} selected
                      </span>
                    )}
                  </div>
                  {isFilterOpen ? <ChevronUp /> : <ChevronDown />}
                </button>

                <div className={`absolute w-full bg-white rounded-xl shadow-xl mt-2 p-4 border transition-all duration-300 z-10 ${isFilterOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Departments</h3>
                      <div className="flex flex-wrap gap-2">
                        {departments.map(department => (
                          <button
                            key={department}
                            onClick={() => handleDepartmentToggle(department)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedDepartments.has(department) ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md scale-105' : 'bg-gradient-to-r from-purple-50 to-indigo-50 text-gray-800 hover:from-purple-100 hover:to-indigo-100'}`}
                          >
                            {department}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleTagToggle(tag)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedTags.has(tag) ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md scale-105' : 'bg-gradient-to-r from-emerald-50 to-cyan-50 text-gray-800 hover:from-emerald-100 hover:to-cyan-100'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shuffledProjects.map(project => (
                  <div key={project.id} className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl border">
                    <div onClick={() => setSelectedProject(project)} className="relative cursor-pointer h-48 overflow-hidden">
                      <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-sm">{project.department}</div>
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
                            <MessageCircle size={18} />
                            <span className="text-sm">{project.comments}</span>
                          </div>

                          <div className="flex items-center space-x-1 text-gray-600">
                            <ThumbsUp size={18} />
                            <span className="text-sm">{project.likes}</span>
                          </div>
                        </div>
                        <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-800">
                          <PlayCircle size={18} />
                          <span className="text-sm">Demo</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          } />
        </Routes>

        {selectedProject && (
          <ProjectModal user={user} project={selectedProject} onClose={() => setSelectedProject(null)} />
        )}
      </div>
    </Router>
  );
}

export default App;
