import React, { useState, useRef } from 'react';
import './Upload.css'; // Make sure this is the CSS with the 'upld-' prefixed classes

// --- Image Import ---
import siteLogo from '../images/collegeLogo.jpg'; // Example path

const API_URL = 'https://openhouse-dev.vnrzone.site/api'; // Base URL for API requests

// --- Constants ---
const MAX_TITLE_WORDS = 20;
const MAX_ABSTRACT_WORDS = 200;
const MAX_TEAM_DETAILS_WORDS = 60;
const MAX_IMAGE_SIZE_MB = 1;
const MAX_PDF_SIZE_MB = 2;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

// Department Options
const DEPARTMENTS = [
    "CE", "EEE", "ECE", "ME", "CSE", "CS-AIML", "CS-DS",
    "CS-IOT", "CS-CyS", "AI & DS", "CSBS", "EIE", "IT", "AE"
];

// --- Types ---
interface UploadProps {
  user: { email: string; picture: string; name: string }; // Define user type
}

interface SubmitStatus {
  message: string;
  type: 'success' | 'error' | '';
}

interface Errors {
  [key: string]: string | null;
}

// --- Helper Functions ---
const countWords = (str: string): number => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
};

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// --- Upload Logic (Interacts with Backend) ---
const performActualUpload = async (formDataObject: any) => {
  console.log("Data prepared for backend submission:", formDataObject);
  const data = new FormData();

  // Append all fields expected by the backend
  data.append('title', formDataObject.title);
  data.append('abstract', formDataObject.abstract);
  data.append('team_details', formDataObject.teamDetails);
  data.append('department', formDataObject.department);
  data.append('tags', formDataObject.tags);
  data.append('domain', formDataObject.domain);
  data.append('is_software', formDataObject.isSoftwareOnly ? 'true' : 'false'); // Send as string 'true'/'false'
  // Append new fields (VERIFY KEYS WITH BACKEND)
  data.append('mentor_name', formDataObject.mentorName);
  data.append('startup_potential', formDataObject.startupPotential); // 'yes', 'no', 'maybe'
  data.append('drive_link', formDataObject.driveLink);
  data.append('user_name', formDataObject.user_name); // The Author id
  data.append('phone_number', formDataObject.phoneNumber); // The phone number of the team lead

  // Append files (VERIFY KEYS WITH BACKEND)
  if (formDataObject.methodologyFile) data.append('methodology', formDataObject.methodologyFile, formDataObject.methodologyFile.name);
  if (formDataObject.resultFile) data.append('result', formDataObject.resultFile, formDataObject.resultFile.name);
  if (formDataObject.coverPosterFile) data.append('cover_poster', formDataObject.coverPosterFile, formDataObject.coverPosterFile.name);
  if (formDataObject.pdfPosterFile) data.append('pdf_poster', formDataObject.pdfPosterFile, formDataObject.pdfPosterFile.name);

  // ---===[ Backend Endpoint URL ]===---
  const endpointUrl = `${API_URL}/projects/upload-project`;
  // ---=============================---

  console.log(`Attempting to POST to: ${endpointUrl}`);
  console.log("Sending FormData with keys:", Array.from(data.keys()));

  try {
    const response = await fetch(endpointUrl, {
        method: 'POST',
        body: data
        // No 'Content-Type' header needed for FormData, browser sets it with boundary
    });

    // Check response status
    if (!response.ok) {
      let errorBody = `Request failed: ${response.status} ${response.statusText}`;
      // Try to get more specific error from response body
      try {
        const text = await response.text();
        // Avoid parsing HTML error pages as JSON
        if (text && text.trim().toLowerCase().startsWith('<!doctype html')) {
             console.warn("Backend returned an HTML error page instead of JSON/text error.");
        } else if (text) {
          // Try parsing as JSON, fallback to raw text
          try {
            const jsonError = JSON.parse(text);
            errorBody = jsonError.message || jsonError.error || jsonError.detail || text;
          } catch (parseError) {
            errorBody = text;
          }
        }
      } catch (readError) {
        console.warn("Could not read error response body:", readError);
      }
      // Throw error to be caught by handleSubmit
      throw new Error(errorBody);
    }

    // Process successful response
    const result = await response.json();
    console.log('Upload successful! Backend response:', result);

    let responseMessage = result.message || ''; // Use existing error message if available

    if (!responseMessage && result.user_name && result.id) {
      responseMessage = `Successfully uploaded by ${result.user_name}, Project Id: ${result.id}`;
    }

    return { success: true, message: responseMessage, data: result };

  } catch (error) {
    // Handle fetch errors (network, CORS, etc.) or errors thrown above
    console.error(`Upload to ${endpointUrl} failed:`, error);
    throw error; // Re-throw for handleSubmit to catch
  }
};

// --- React Component Definition ---
function Upload({ user }: UploadProps) {
  const user_name = user.email.split('@')[0]; // Extract part before '@'

  // --- State Management ---
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [teamDetails, setTeamDetails] = useState('');
  const [department, setDepartment] = useState('');
  const [tags, setTags] = useState('');
  const [domain, setDomain] = useState('');
  const [isSoftwareOnly, setIsSoftwareOnly] = useState(false); // Boolean state
  const [methodologyFile, setMethodologyFile] = useState<File | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [coverPosterFile, setCoverPosterFile] = useState<File | null>(null);
  const [pdfPosterFile, setPdfPosterFile] = useState<File | null>(null);
  const [mentorName, setMentorName] = useState('');
  const [startupPotential, setStartupPotential] = useState(''); // '', 'yes', 'no', 'maybe'
  const [driveLink, setDriveLink] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [phoneNumber, setPhoneNumber] = useState(''); // New field for phone number
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ message: '', type: '' }); // { message: string, type: 'success' | 'error' | '' }

  // --- Refs for File Inputs (to allow clearing) ---
  const methodologyInputRef = useRef<HTMLInputElement | null>(null);
  const resultsInputRef = useRef<HTMLInputElement | null>(null);
  const coverPosterInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // --- Phone Number Validation ---
  const validatePhoneNumber = (number: string): boolean => {
    const phoneRegex = /^\d{10}$/; // 10-digit number regex
    return phoneRegex.test(number);
  };

  // --- Client-Side Validation Logic ---
  const validateField = async (name: string, value: string, file: File | null = null): Promise<boolean> => {
    let error: string | null = null;
    // Validate Text/Select Fields
    if (name === 'phoneNumber') {
      if (!value) error = 'Phone number is required.';
      else if (!validatePhoneNumber(value)) error = 'Phone number must be 10 digits.';
    }

    if (name === 'title') { if (!value.trim()) error = 'Title is required.'; else if (countWords(value) > MAX_TITLE_WORDS) error = `Title cannot exceed ${MAX_TITLE_WORDS} words.`; }
    else if (name === 'abstract') { if (!value.trim()) error = 'Abstract is required.'; else if (countWords(value) > MAX_ABSTRACT_WORDS) error = `Abstract cannot exceed ${MAX_ABSTRACT_WORDS} words.`; }
    else if (name === 'teamDetails') { if (!value.trim()) error = 'Team Details are required.'; else if (countWords(value) > MAX_TEAM_DETAILS_WORDS) error = `Team Details cannot exceed ${MAX_TEAM_DETAILS_WORDS} words.`; }
    else if (name === 'department') { if (!value || value === "") error = 'Department selection is required.'; }
    else if (name === 'tags') { if (!value.trim()) error = 'Tags (keywords) are required.'; }
    else if (name === 'domain') { if (!value.trim()) error = 'Domain is required.'; }
    else if (name === 'mentorName') { if (!value.trim()) error = 'Faculty Mentor Name is required.'; }
    else if (name === 'startupPotential') { if (!value || value === "") error = 'Startup potential selection is required.'; }
    else if (name === 'driveLink') {
        if (value.trim()) {  // If the value is not empty
            try {
                new URL(value); // Basic URL format check
            } catch (_) { error = 'Please enter a valid URL format (e.g., https://...).'; }
        }
    }
    // Validate File Fields (only if file is provided or if it's being checked on submit)
    else if (file === null) {
        // Only trigger 'required' error on submit check, not file clear
    } else { // File exists, check size and type
        if (['methodologyFile', 'resultFile', 'coverPosterFile'].includes(name)) {
            if (!file.type.startsWith('image/')) { error = `Invalid file type. Please select an image.`; }
            else if (file.size > MAX_IMAGE_SIZE_BYTES) { error = `Image exceeds ${MAX_IMAGE_SIZE_MB}MB size limit.`; }
        } else if (name === 'pdfPosterFile') {
            if (!file.type.includes('pdf')) { error = 'Invalid file type. Please select a PDF.'; }
            else if (file.size > MAX_PDF_SIZE_BYTES) { error = `PDF Poster exceeds ${MAX_PDF_SIZE_MB}MB size limit.`; }
        }
    }
    // Update errors state
    setErrors(prev => ({ ...prev, [name]: error }));
    // Return boolean indicating validity for this field
    return (error === null);
  };

  // --- Event Handlers ---
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Update corresponding state
    switch (name) {
        case 'title': setTitle(value); break;
        case 'abstract': setAbstract(value); break;
        case 'teamDetails': setTeamDetails(value); break;
        case 'tags': setTags(value); break;
        case 'domain': setDomain(value); break;
        case 'mentorName': setMentorName(value); break;
        case 'driveLink': setDriveLink(value); break;
        case 'phoneNumber': setPhoneNumber(value); break; // New handler for phone number
        default: break;
    }
     // Clear error for this field on change
     if (errors[name]) {
         setErrors(prev => ({ ...prev, [name]: null }));
     }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      if (name === 'department') {
          setDepartment(value);
          validateField('department', value); // Validate immediately
      } else if (name === 'startupPotential') {
          setStartupPotential(value);
          validateField('startupPotential', value); // Validate immediately
      }
     // Clear error for this field on change
     if (errors[name]) {
         setErrors(prev => ({ ...prev, [name]: null }));
     }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Update boolean state directly
      setIsSoftwareOnly(e.target.checked);
  };

  // Debounced blur validation
  const handleTextBlur = debounce((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     const { name, value } = e.target;
     // Validate text/url fields on blur
     if (['title', 'abstract', 'teamDetails', 'tags', 'domain', 'mentorName', 'driveLink'].includes(name)) {
        validateField(name, value);
     }
  }, 300); // 300ms delay

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const file = e.target.files ? e.target.files[0] : null;
    const inputRef = e.target; // Keep reference to the input element

    // Clear previous errors and status
    setErrors(prev => ({ ...prev, [name]: null }));
    setSubmitStatus({ message: '', type: '' });

    // Update state with the selected file
    switch (name) {
        case 'methodologyFile': setMethodologyFile(file); break;
        case 'resultFile': setResultFile(file); break;
        case 'coverPosterFile': setCoverPosterFile(file); break;
        case 'pdfPosterFile': setPdfPosterFile(file); break;
        default: break;
    }

    // Validate the selected file (if one exists)
    if (file) {
      const isValid = await validateField(name, '', file);
      // If validation fails for the *newly selected* file, clear state and input
      if (!isValid) {
          inputRef.value = ''; // Clear the file input visually
           switch (name) { // Clear the corresponding state variable
               case 'methodologyFile': setMethodologyFile(null); break;
               case 'resultFile': setResultFile(null); break;
               case 'coverPosterFile': setCoverPosterFile(null); break;
               case 'pdfPosterFile': setPdfPosterFile(null); break;
               default: break;
           }
      }
    }
    // If file is null (cleared), no immediate validation needed here
  };


  // --- Form Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser submission
    setIsSubmitting(true);
    setSubmitStatus({ message: '', type: '' }); // Clear previous status

    // --- Perform validation on ALL required fields ---
    const validationPromises = [
      validateField('title', title),
      validateField('abstract', abstract),
      validateField('teamDetails', teamDetails),
      validateField('department', department),
      validateField('tags', tags),
      validateField('domain', domain),
      validateField('mentorName', mentorName),
      validateField('startupPotential', startupPotential),
      validateField('driveLink', driveLink),
      validateField('phoneNumber', phoneNumber), // Validate phone number

      // Validate files are present (pass null file to check if state is null)
      validateField('methodologyFile', '', methodologyFile),
      validateField('resultFile', '', resultFile),
      validateField('coverPosterFile', '', coverPosterFile),
      validateField('pdfPosterFile', '', pdfPosterFile)
    ];
    
    const validationResults = await Promise.all(validationPromises);
    const formIsValid = validationResults.every(isValid => isValid);
    // --- End Validation ---

    if (!formIsValid) {
      console.log("Client-side validation failed. Errors:", errors);
       // Focus the first field with an error
       const firstErrorFieldKey = Object.keys(errors).find(key => errors[key]);
       if(firstErrorFieldKey) {
          const element = document.getElementById(firstErrorFieldKey);
          element?.focus({ preventScroll: true }); // Focus the element
          // Scroll into view smoothly, centered if possible
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
      setSubmitStatus({ message: 'Please review the form and fix the highlighted errors.', type: 'error' });
      setIsSubmitting(false); // Stop submission process
      return; // Exit handler
    }

    // If validation passes
    console.log('Client-side validation passed. Attempting backend upload...');
    const formDataToSubmit = {
        title, abstract, teamDetails, department, tags, domain,
        isSoftwareOnly, mentorName, startupPotential, driveLink,
        methodologyFile, resultFile, coverPosterFile, pdfPosterFile, user_name, phoneNumber
    };

    // --- Call the upload function ---
    try {
        console.log("Just before upload");
        console.log(user_name); // Example: Display the user object in the console

        
        const result = await performActualUpload(formDataToSubmit);
        setSubmitStatus({ message: result.message || 'Upload successful!', type: 'success' });
        console.log("Submission successful.");

        // --- Clear form fields on success ---
        setTitle('');
        setAbstract('');
        setTeamDetails('');
        setDepartment('');
        setTags('');
        setDomain('');
        setIsSoftwareOnly(false);
        setMentorName('');
        setStartupPotential('');
        setDriveLink('');
        // Clear file states
        setMethodologyFile(null);
        setResultFile(null);
        setCoverPosterFile(null);
        setPdfPosterFile(null);
        // Clear file input elements using refs
        if(methodologyInputRef.current) methodologyInputRef.current.value = '';
        if(resultsInputRef.current) resultsInputRef.current.value = '';
        if(coverPosterInputRef.current) coverPosterInputRef.current.value = '';
        if(pdfInputRef.current) pdfInputRef.current.value = '';
        // Clear errors
        setErrors({});
        // --- End Form Clear ---

    } catch (error) {
        // Handle errors from performActualUpload
        console.error('Caught submission error in handleSubmit:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setSubmitStatus({ message: `Upload Failed: ${errorMessage}`, type: 'error' });
    } finally {
        // Always stop the submitting indicator
        setIsSubmitting(false);
    }
  };


  // --- JSX Rendering ---
  return (
    <div className="upld-page-container"> {/* Prefixed class */}
      <header className="upld-header-section"> {/* Prefixed class */}
        <div className="upld-header-logo"> {/* Prefixed class */}
            <img src={siteLogo} alt="VNR VJIET Crest" className="upld-site-logo"/> {/* Prefixed class */}
            <div className="upld-logo-subtext"> {/* Prefixed class */}
                <span>EST. 1995</span>
                <span>Hyderabad, Telangana</span>
            </div>
        </div>
        <div className="upld-header-title-block"> {/* Prefixed class */}
             <span className="upld-presenter-text">VNRVJIET PRESENTS</span> {/* Prefixed class */}
             <h1 className="upld-main-headline">OPEN HOUSE</h1> {/* Prefixed class */}
        </div>
        <div className="upld-header-placeholder"></div> {/* Prefixed class */}
      </header>

      <form onSubmit={handleSubmit} className="upld-form" noValidate> {/* Prefixed class */}
        <h2>Submit Your Project Details</h2>
        {/* Prefixed class */}
        {submitStatus.message && (<div className={`upld-submit-status ${submitStatus.type}`}>{submitStatus.message}</div>)}

        {/* Title */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="title">Project Title</label>
          <input type="text" id="title" name="title" value={title} onChange={handleTextChange} onBlur={handleTextBlur} aria-describedby="title-error" aria-invalid={!!errors.title} required placeholder="Enter the main title of your project"/>
          <span className="upld-word-count">{countWords(title)}/{MAX_TITLE_WORDS} words</span> {/* Prefixed class */}
          {errors.title && <p id="title-error" className="upld-error-message">{errors.title}</p>} {/* Prefixed class */}
        </div>

        {/* Abstract */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="abstract">Abstract</label>
          <textarea id="abstract" name="abstract" value={abstract} rows={5} onChange={handleTextChange} onBlur={handleTextBlur} aria-describedby="abstract-error" aria-invalid={!!errors.abstract} required placeholder="Provide a brief summary of your project..."/>
          <span className="upld-word-count">{countWords(abstract)}/{MAX_ABSTRACT_WORDS} words</span> {/* Prefixed class */}
          {errors.abstract && <p id="abstract-error" className="upld-error-message">{errors.abstract}</p>} {/* Prefixed class */}
        </div>

        {/* Team Details */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="teamDetails">Team Details</label>
          <textarea
            id="teamDetails"
            name="teamDetails"
            value={teamDetails}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            placeholder={`e.g., Sandhya Rani 22071A1216 (Lead),\nVenu Gopal 22071A12B7`}
            aria-describedby="teamDetails-error"
            aria-invalid={!!errors.teamDetails}
            required
            rows={4}               // You can adjust the number of rows for the height
            cols={50}               // You can adjust the width by modifying the 'cols'
            maxLength={500}         // Adjust the maximum character limit
          />
          <span className="upld-word-count">{countWords(teamDetails)}/{MAX_TEAM_DETAILS_WORDS} words</span> {/* Prefixed class */}
          {errors.teamDetails && <p id="teamDetails-error" className="upld-error-message">{errors.teamDetails}</p>} {/* Prefixed class */}
        </div>

        {/* Faculty Mentor Name */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="mentorName">Faculty Mentor Name</label>
          <input type="text" id="mentorName" name="mentorName" value={mentorName} onChange={handleTextChange} onBlur={handleTextBlur} placeholder="Enter mentor's full name" aria-describedby="mentorName-error" aria-invalid={!!errors.mentorName} required />
          {errors.mentorName && <p id="mentorName-error" className="upld-error-message">{errors.mentorName}</p>} {/* Prefixed class */}
        </div>

        {/* Department Dropdown */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="department">Department</label>
          <select id="department" name="department" value={department} onChange={handleSelectChange} aria-describedby="department-error" aria-invalid={!!errors.department} required >
              <option value="" disabled>-- Select Department --</option>
              {DEPARTMENTS.map(dept => ( <option key={dept} value={dept}>{dept}</option> ))}
          </select>
          {errors.department && <p id="department-error" className="upld-error-message">{errors.department}</p>} {/* Prefixed class */}
        </div>

        {/* Startup Potential */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="startupPotential">Potential Startup?</label>
          <select id="startupPotential" name="startupPotential" value={startupPotential} onChange={handleSelectChange} aria-describedby="startupPotential-error" aria-invalid={!!errors.startupPotential} required>
            <option value="" disabled>-- Please Select --</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="maybe">Maybe / Unsure</option>
          </select>
          {errors.startupPotential && <p id="startupPotential-error" className="upld-error-message">{errors.startupPotential}</p>} {/* Prefixed class */}
        </div>

        {/* Google Drive Link */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="driveLink">Google Drive Link</label>
          <input type="url" id="driveLink" name="driveLink" value={driveLink} onChange={handleTextChange} onBlur={handleTextBlur} placeholder="https://drive.google.com/..." aria-describedby="driveLink-error" aria-invalid={!!errors.driveLink} required />
          <span className="upld-file-name">Optional, but highlily encouraged. Demo video link to your project. (Ensure link sharing is enabled)</span> {/* Prefixed class */}
          {errors.driveLink && <p id="driveLink-error" className="upld-error-message">{errors.driveLink}</p>} {/* Prefixed class */}
        </div>

        {/* Tags Input */}
        <div className="upld-form-group"> {/* Prefixed class */}
            <label htmlFor="tags">Tags</label>
            <input type="text" id="tags" name="tags" value={tags} onChange={handleTextChange} onBlur={handleTextBlur} placeholder="Technology Tags, comma separated (e.g., AI, Web, IOT, Robotics, AR-VR )" aria-describedby="tags-error" aria-invalid={!!errors.tags} required />
            {errors.tags && <p id="tags-error" className="upld-error-message">{errors.tags}</p>} {/* Prefixed class */}
        </div>

        {/* Domain Input */}
        <div className="upld-form-group"> {/* Prefixed class */}
            <label htmlFor="domain">Domain</label>
            <input type="text" id="domain" name="domain" value={domain} onChange={handleTextChange} onBlur={handleTextBlur} placeholder="e.g., ArgiTech, Healthcare Technology, EduTech, FinTech, E-commerce Platform" aria-describedby="domain-error" aria-invalid={!!errors.domain} required />
            {errors.domain && <p id="domain-error" className="upld-error-message">{errors.domain}</p>} {/* Prefixed class */}
        </div>

        {/* Software Checkbox */}
        <div className="upld-checkbox-group"> {/* Prefixed class */}
            <input type="checkbox" id="isSoftwareOnly" name="isSoftwareOnly" checked={isSoftwareOnly} onChange={handleCheckboxChange} />
            <label htmlFor="isSoftwareOnly">Is this a Software-Only Project?</label>
        </div>

        {/* Methodology File */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="methodologyFile">Methodology Image (Max {MAX_IMAGE_SIZE_MB}MB)</label>
          <input type="file" id="methodologyFile" name="methodologyFile" accept="image/*" ref={methodologyInputRef} onChange={handleFileChange} aria-describedby="methodologyFile-error" aria-invalid={!!errors.methodologyFile} required />
          {methodologyFile && !errors.methodologyFile && <span className="upld-file-name">{methodologyFile.name}</span>} {/* Prefixed class */}
          {errors.methodologyFile && <p id="methodologyFile-error" className="upld-error-message">{errors.methodologyFile}</p>} {/* Prefixed class */}
          <span className="upld-help-text"> Can be Architecture Diagram, or Flow Diagram. Take screenshot of what you presented in poster. </span>
        </div>

        {/* Result File */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="resultFile">Result Image (Max {MAX_IMAGE_SIZE_MB}MB)</label>
          <input type="file" id="resultFile" name="resultFile" accept="image/*" ref={resultsInputRef} onChange={handleFileChange} aria-describedby="resultFile-error" aria-invalid={!!errors.resultFile} required />
          {resultFile && !errors.resultFile && <span className="upld-file-name">{resultFile.name}</span>} {/* Prefixed class */}
          {errors.resultFile && <p id="resultFile-error" className="upld-error-message">{errors.resultFile}</p>} {/* Prefixed class */}
          <span className="upld-help-text"> Photo of your Application UI, Graphs etc. Take screenshot of what you presented in poster. </span>

        </div>

        {/* Cover Poster File */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="coverPosterFile">Cover Poster Image (Max {MAX_IMAGE_SIZE_MB}MB)</label>
          <input type="file" id="coverPosterFile" name="coverPosterFile" accept="image/*" ref={coverPosterInputRef} onChange={handleFileChange} aria-describedby="coverPosterFile-error" aria-invalid={!!errors.coverPosterFile} required />
          {coverPosterFile && !errors.coverPosterFile && <span className="upld-file-name">{coverPosterFile.name}</span>} {/* Prefixed class */}
          {errors.coverPosterFile && <p id="coverPosterFile-error" className="upld-error-message">{errors.coverPosterFile}</p>} {/* Prefixed class */}
          <span className="upld-help-text">
            Not your poster photo, but a cover photo to show as a thumbnail or title image. &nbsp;
            <a href="https://spiffy-salamander-7c4b66.netlify.app/" target="_blank" rel="noopener noreferrer">reference</a>
          </span>


        </div>

        {/* PDF Poster File */}
        <div className="upld-form-group"> {/* Prefixed class */}
          <label htmlFor="pdfPosterFile">Project Poster (PDF, Max {MAX_PDF_SIZE_MB}MB)</label>
          <input type="file" id="pdfPosterFile" name="pdfPosterFile" accept=".pdf,application/pdf" ref={pdfInputRef} onChange={handleFileChange} aria-describedby="pdfPosterFile-error" aria-invalid={!!errors.pdfPosterFile} required />
           {pdfPosterFile && !errors.pdfPosterFile && <span className="upld-file-name">{pdfPosterFile.name}</span>} {/* Prefixed class */}
          {errors.pdfPosterFile && <p id="pdfPosterFile-error" className="upld-error-message">{errors.pdfPosterFile}</p>} {/* Prefixed class */}
          <span className="upld-help-text"> Your actual poster that you prepared for Expo in PDF format.  </span>
        </div>

        {/* Phone Number Field */}
        <div className="upld-form-group">
          <label htmlFor="phoneNumber">Team Lead Phone Number</label>
          <input 
            type="text" 
            id="phoneNumber" 
            name="phoneNumber" 
            value={phoneNumber} 
            onChange={handleTextChange} 
            required 
            placeholder="Enter Team Lead's Phone Number (10 digits)"
          />
          {errors.phoneNumber && <p className="upld-error-message">{errors.phoneNumber}</p>}
        </div>

        {/* Submit Button */}
        <div className="upld-form-group-submit"> {/* Prefixed class */}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Project'}
          </button>
        </div>
        {submitStatus.message && (<div className={`upld-submit-status ${submitStatus.type}`}>{submitStatus.message}</div>)}
      </form>
    </div>
  );
}

export default Upload;
