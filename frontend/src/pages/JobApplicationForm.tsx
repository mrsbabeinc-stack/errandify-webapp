import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../components/Toast';

interface EmploymentHistory {
  company_name: string;
  job_title: string;
  start_date: string;
  end_date: string;
  currently_working: boolean;
  responsibilities: string;
}

interface EducationRecord {
  institution_name: string;
  qualification: string;
  field_of_study: string;
  graduation_year: string;
  gpa?: string;
}

interface RefereeContact {
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
}

interface ApplicationData {
  // Personal
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  home_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;

  /** 'authorised' | 'requires_sponsorship' — asked instead of nationality. */
  work_authorisation?: string;
  /** Can they do the essential duties, with or without adjustment. */
  can_perform_duties?: boolean;
  adjustments_needed?: string;

  // NRIC, residential status and emergency contacts are deliberately absent.
  // They are collected at hire, into the staff record — see the note on the
  // intake route in backend/src/routes/recruitment.ts.

  // Employment
  position_applied?: string;
  expected_salary?: number;
  notice_period_days?: number;
  available_start_date?: string;
  years_of_experience?: number;
  employment_history?: EmploymentHistory[];

  // Education
  highest_qualification?: string;
  field_of_study?: string;
  key_skills?: string;
  education_records?: EducationRecord[];

  // References
  referee_contacts?: RefereeContact[];

  // Documents
  cv_file?: File;

  // Health & Declaration
  agreements?: {
    agree_to_terms?: boolean;
    agree_to_privacy?: boolean;
    agree_to_background_check?: boolean;
    agree_to_work_authorization?: boolean;
  };
}

const NATIONALITIES = ['Singaporean', 'Malaysian', 'Indian', 'Chinese', 'Filipino', 'Vietnamese', 'Thai', 'Indonesian', 'Pakistani', 'Bangladeshi', 'Other'];
const RESIDENTIAL_STATUS = ['Citizen', 'PR', 'Work Permit', 'Visit Pass'];
const QUALIFICATIONS = ['High School', 'Diploma', 'Bachelors', 'Masters', 'PhD', 'Professional Certificate'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary'];

const JobApplicationForm: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [currentStep, setCurrentStep] = useState<'cv_upload' | 'personal' | 'eligibility' | 'employment' | 'education' | 'referee' | 'declaration' | 'review'>('cv_upload');
  const [loading, setLoading] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [cvExtracted, setCvExtracted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<ApplicationData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    home_address: '',
    city: '',
    postal_code: '',
    country: 'Singapore',
    work_authorisation: '',
    can_perform_duties: undefined,
    adjustments_needed: '',
    position_applied: '',
    expected_salary: 0,
    notice_period_days: 30,
    available_start_date: '',
    years_of_experience: 0,
    highest_qualification: 'Bachelors',
    field_of_study: '',
    key_skills: '',
    employment_history: [],
    education_records: [],
    referee_contacts: [],
    agreements: {
      agree_to_terms: false,
      agree_to_privacy: false,
      agree_to_background_check: false,
      agree_to_work_authorization: false,
    },
  });

  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        // In a real app, fetch job details from API
        // For now, use mock data
        setJobDetails({
          job_id: jobId,
          job_title: 'Software Engineer',
          department: 'Engineering',
          description: 'We are looking for an experienced software engineer...',
        });
      } catch (error) {
        showToast('Failed to load job details', 'error');
      }
    };

    loadJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        navigate('/my-kampung', { state: { tab: 'join-us' } });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [submitted, navigate]);

  const handleCVUpload = async (file: File) => {
    try {
      setLoading(true);
      showToast('🔄 Analyzing CV with AI...', 'info');

      // Simulate AI CV parsing (in production, call backend API)
      const cvText = await file.text();

      // AI-powered extraction simulation
      const extractedData = extractCVData(cvText);

      // Auto-populate form fields
      setForm(prev => ({
        ...prev,
        first_name: extractedData.firstName || '',
        last_name: extractedData.lastName || '',
        email: extractedData.email || '',
        phone: extractedData.phone || '',
        years_of_experience: extractedData.yearsOfExperience || 0,
        key_skills: extractedData.skills.join(', '),
        highest_qualification: extractedData.qualification || 'Bachelors',
        field_of_study: extractedData.fieldOfStudy || '',
        cv_file: file,
      }));

      setCvExtracted(true);
      showToast(`✅ CV analyzed! Found ${extractedData.skills.length} skills`, 'success');
    } catch (error) {
      showToast('❌ Error processing CV', 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractCVData = (text: string) => {
    // Simulate AI CV parsing
    const skills = extractSkills(text);
    const yearsExp = extractYearsOfExperience(text);
    const qualification = extractQualification(text);
    const { firstName, lastName } = extractName(text);
    const email = extractEmail(text);
    const phone = extractPhone(text);

    return {
      firstName,
      lastName,
      email,
      phone,
      skills,
      yearsOfExperience: yearsExp,
      qualification,
      fieldOfStudy: extractFieldOfStudy(text),
    };
  };

  const extractSkills = (text: string): string[] => {
    // Simulate skill extraction
    const skillPatterns = [
      /\b(python|java|javascript|react|angular|node|express|sql|mongodb|aws|docker|kubernetes|git|ci\/cd)\b/gi,
      /\b(project management|agile|scrum|leadership|communication|problem solving)\b/gi,
    ];

    const skills: string[] = [];
    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        skills.push(...matches.map(s => s.toLowerCase()));
      }
    });

    return [...new Set(skills)].slice(0, 10); // Return unique skills
  };

  const extractYearsOfExperience = (text: string): number => {
    const patterns = [
      /(\d+)\s*(?:\+)?\s*years?\s+(?:of\s+)?experience/gi,
      /experience:\s*(\d+)\s*years?/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numbers = match[0].match(/\d+/);
        if (numbers) return parseInt(numbers[0]);
      }
    }

    return 0;
  };

  const extractQualification = (text: string): string => {
    const qualifications = QUALIFICATIONS;
    for (const qual of qualifications) {
      if (text.toLowerCase().includes(qual.toLowerCase())) {
        return qual;
      }
    }
    return 'Bachelors';
  };

  const extractName = (text: string): { firstName: string; lastName: string } => {
    // Try to find name in first few lines
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 3 && cleanLine.length < 60) {
        const words = cleanLine.split(/\s+/);
        if (words.length >= 2) {
          return {
            firstName: words[0],
            lastName: words.slice(1).join(' '),
          };
        }
      }
    }
    return { firstName: '', lastName: '' };
  };

  const extractEmail = (text: string): string => {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : '';
  };

  const extractPhone = (text: string): string => {
    const phonePatterns = [
      /(\+?65)?[\s.-]?\d{4}[\s.-]?\d{4}/,
      /(\+?60)?[\s.-]?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/,
      /(\+\d{1,3})?[\s.-]?\d{7,12}/,
    ];
    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return '';
  };

  const extractFieldOfStudy = (text: string): string => {
    const fields = ['Computer Science', 'Engineering', 'Business', 'Finance', 'Marketing', 'Design', 'Education', 'Healthcare'];
    for (const field of fields) {
      if (text.toLowerCase().includes(field.toLowerCase())) {
        return field;
      }
    }
    return 'Engineering';
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!form.first_name || !form.last_name || !form.email) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }

    if (!form.agreements?.agree_to_terms || !form.agreements?.agree_to_privacy) {
      showToast('❌ Please accept all declarations to continue', 'error');
      return;
    }

    try {
      setLoading(true);
      showToast('📝 Submitting application...', 'info');

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/recruitment/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, ...form }),
      });

      const result = await response.json();

      // Only claim success once the application is actually stored. This used
      // to show the success screen unconditionally with no request sent at all,
      // so applicants believed they had applied and no record existed.
      if (!response.ok) {
        showToast(`❌ ${result.error || 'Could not submit your application'}`, 'error');
        return;
      }

      setSubmitted(true);
      showToast(`✅ Application submitted — reference ${result.data.application_id}`, 'success');
    } catch (error) {
      showToast('❌ Error submitting application', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Address, emergency contact and the health/disability declaration were
  // removed: they cannot bear on a hiring decision, and asking for a
  // disability before an offer is what a discrimination complaint would point
  // at. All three are collected at hire, into the staff record.
  const steps = ['cv_upload', 'personal', 'eligibility', 'employment', 'education', 'referee', 'declaration', 'review'] as const;
  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const stepStyle = (step: typeof steps[number]) => ({
    padding: '8px 12px',
    background: currentStep === step ? '#FF6B35' : steps.indexOf(step) < currentIndex ? '#FF6B35' : '#f0f0f0',
    color: currentStep === step || steps.indexOf(step) < currentIndex ? 'white' : '#666',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '11px',
  });

  const formFieldStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    boxSizing: 'border-box' as const,
  };

  // Success screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FF5722 100%)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ maxWidth: '500px', background: 'white', borderRadius: '16px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'pulse 1s ease-in-out infinite' }}>
            ❤️
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>
            Welcome to Our Kampung!
          </h1>
          <p style={{ fontSize: '16px', color: '#666', margin: '0 0 24px 0', lineHeight: 1.7 }}>
            Thank you for applying. We're excited to review your application and get to know you better.
          </p>
          <p style={{ fontSize: '14px', color: '#999', margin: '0 0 32px 0' }}>
            We'll be in touch within 2-3 business days. Check your email for updates.
          </p>
          <button
            onClick={() => navigate('/my-kampung', { state: { tab: 'join-us' } })}
            style={{
              padding: '14px 40px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            Back to Careers →
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '24px' }}>
            (Automatically redirecting in 10 seconds...)
          </p>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FF5722 100%)', padding: '20px' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', position: 'relative' }}>
        {/* Close Button */}
        <button
          onClick={() => navigate('/my-kampung', { state: { tab: 'join-us' } })}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            background: '#f5f5f5',
            border: 'none',
            borderRadius: '50%',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#FF6B35';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
            (e.currentTarget as HTMLButtonElement).style.color = '#666';
          }}
          title="Close"
        >
          ✕
        </button>

        {/* Header */}
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#333', margin: '0 0 8px 0' }}>
          Job Application
        </h1>
        {jobDetails && (
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0' }}>
            Applying for: <strong>{jobDetails.job_title}</strong> at <strong>{jobDetails.department}</strong>
          </p>
        )}

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ height: '100%', background: '#FF6B35', width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Step {currentIndex + 1} of {steps.length}
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
          {steps.map(step => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              disabled={steps.indexOf(step) > currentIndex}
              style={{
                ...stepStyle(step),
                opacity: steps.indexOf(step) > currentIndex ? 0.5 : 1,
                cursor: steps.indexOf(step) > currentIndex ? 'not-allowed' : 'pointer',
              }}
            >
              {step === 'cv_upload' && '📄 CV'}
              {step === 'personal' && '👤 Personal'}
              {step === 'eligibility' && '✅ Eligibility'}
              {step === 'employment' && '💼 Employment History'}
              {step === 'education' && '🎓 Education'}
              {step === 'referee' && '👥 References'}
              {step === 'declaration' && '✔️ Declaration'}
              {step === 'review' && '👀 Review'}
            </button>
          ))}
        </div>

        {/* Form Steps */}
        <div style={{ minHeight: '400px', marginBottom: '24px' }}>
          {/* CV UPLOAD - FIRST STEP */}
          {currentStep === 'cv_upload' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: '#333' }}>📄 Upload Your CV</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', lineHeight: 1.6 }}>
                Start by uploading your CV. Our AI will analyze it and help auto-fill your information to save you time. No manual typing needed! ✨
              </p>

              <div style={{ padding: '40px 20px', background: '#E3F2FD', border: '3px dashed #2196F3', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📤</div>
                <p style={{ fontSize: '16px', color: '#0D47A1', fontWeight: '700', margin: '0 0 8px 0' }}>
                  Drop your CV here
                </p>
                <p style={{ fontSize: '14px', color: '#1565C0', margin: '0 0 16px 0' }}>
                  or
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={e => e.target.files && handleCVUpload(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="cv-upload-first"
                />
                <label htmlFor="cv-upload-first" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  <button
                    type="button"
                    style={{
                      padding: '12px 32px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#1976D2';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#2196F3';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                  >
                    Click to browse
                  </button>
                </label>
                <p style={{ fontSize: '12px', color: '#666', margin: '16px 0 0 0' }}>
                  Supported formats: PDF, DOC, DOCX, TXT (Max 5MB)
                </p>
                {form.cv_file && (
                  <div style={{ marginTop: '20px', padding: '12px', background: '#FFE0B2', borderRadius: '6px' }}>
                    <p style={{ fontSize: '13px', color: '#E65100', fontWeight: '600', margin: '0 0 8px 0' }}>
                      ✅ {form.cv_file.name}
                    </p>
                    {cvExtracted && (
                      <p style={{ fontSize: '12px', color: '#BF360C', margin: 0 }}>
                        AI has extracted your information. Ready to proceed! 🎉
                      </p>
                    )}
                  </div>
                )}
              </div>

              {loading && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#E65100', fontWeight: '600', margin: 0 }}>
                    🔄 Analyzing your CV with AI... Please wait
                  </p>
                </div>
              )}

              <div style={{ marginTop: '24px', padding: '16px', background: '#F3E5F5', borderRadius: '8px', borderLeft: '4px solid #9C27B0' }}>
                <p style={{ fontSize: '13px', color: '#4A148C', margin: 0, lineHeight: 1.6 }}>
                  💡 <strong>Tip:</strong> Make sure your CV includes your name, email, phone, work experience, skills, and education. The AI will extract these to auto-fill the form.
                </p>
              </div>
            </div>
          )}

          {/* PERSONAL */}
          {currentStep === 'personal' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>👤 Personal Information</h3>
                {cvExtracted && (
                  <span style={{ fontSize: '11px', background: '#FF6B35', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    ✅ Auto-filled from CV
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                    First Name * {cvExtracted && form.first_name && <span style={{ fontSize: '10px', color: '#FF6B35' }}>✅</span>}
                  </label>
                  <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} style={formFieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                    Last Name * {cvExtracted && form.last_name && <span style={{ fontSize: '10px', color: '#FF6B35' }}>✅</span>}
                  </label>
                  <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={formFieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                    Email * {cvExtracted && form.email && <span style={{ fontSize: '10px', color: '#FF6B35' }}>✅</span>}
                  </label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={formFieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                    Phone {cvExtracted && form.phone && <span style={{ fontSize: '10px', color: '#FF6B35' }}>✅</span>}
                  </label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={formFieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} style={formFieldStyle} />
                </div>
                {/* NRIC and nationality used to be asked here too.
                    NRIC is barred at this stage by PDPC's NRIC guidelines; age
                    and nationality are the protected characteristics the Fair
                    Consideration Framework is most concerned with, and none of
                    the three helps decide a shortlist. They are collected at
                    hire instead. */}
              </div>
            </div>
          )}

          {/* ELIGIBILITY — the lawful replacements for nationality and the
              health declaration, plus the address fields. Work authorisation
              asks the question actually needed (can you work here, do we need
              to sponsor a pass) without recording nationality. The capability
              question asks whether you can do the job, not what is wrong with
              you; the adjustments box exists to support the applicant, and is
              carried onto the staff record if they are hired. */}
          {currentStep === 'eligibility' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>✅ Eligibility &amp; Location</h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#666' }}>
                  Are you legally authorised to work in Singapore? *
                </label>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {[
                    { v: 'authorised', l: 'Yes — I am a citizen, PR, or already hold a valid pass' },
                    { v: 'requires_sponsorship', l: 'No — I would need a work pass sponsored' },
                  ].map(o => (
                    <label key={o.v} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#333' }}>
                      <input
                        type="radio"
                        name="work_authorisation"
                        value={o.v}
                        checked={form.work_authorisation === o.v}
                        onChange={e => setForm({ ...form, work_authorisation: e.target.value })}
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#666' }}>
                  Can you carry out the essential duties of this role, with or without reasonable adjustments? *
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(o => (
                    <label key={String(o.v)} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', color: '#333' }}>
                      <input
                        type="radio"
                        name="can_perform_duties"
                        checked={form.can_perform_duties === o.v}
                        onChange={() => setForm({ ...form, can_perform_duties: o.v })}
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>
                  We do not ask about medical conditions or disabilities at this stage.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                  Any adjustments you would like for the interview? (optional)
                </label>
                <textarea
                  value={form.adjustments_needed}
                  onChange={e => setForm({ ...form, adjustments_needed: e.target.value })}
                  placeholder="e.g. step-free access, a written test instead of a verbal one"
                  style={{ ...formFieldStyle, minHeight: '70px' }}
                />
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>Where you are based</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Address</label>
                  <textarea value={form.home_address} onChange={e => setForm({ ...form, home_address: e.target.value })} style={{ ...formFieldStyle, minHeight: '70px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Postal Code</label>
                    <input type="text" value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} style={formFieldStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Country</label>
                    <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} style={formFieldStyle} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'employment' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>💼 Employment History</h3>
              <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
                <p style={{ fontSize: '13px', color: '#E65100', margin: 0, lineHeight: 1.6 }}>
                  📝 Tell us about your work experience, starting with your most recent role. Include companies you've worked for, positions held, and key achievements.
                </p>
              </div>

              {/* Job Application Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                    Position Applied For * {cvExtracted && form.position_applied && <span style={{ fontSize: '10px', color: '#FF6B35' }}>✅</span>}
                  </label>
                  <input type="text" value={form.position_applied} onChange={e => setForm({ ...form, position_applied: e.target.value })} style={formFieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                    Total Years of Experience {cvExtracted && form.years_of_experience && <span style={{ fontSize: '10px', color: '#FF6B35' }}>✅</span>}
                  </label>
                  <input type="number" value={form.years_of_experience} onChange={e => setForm({ ...form, years_of_experience: parseInt(e.target.value) })} style={formFieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Expected Salary (SGD)</label>
                  <input type="number" value={form.expected_salary} onChange={e => setForm({ ...form, expected_salary: parseInt(e.target.value) })} style={formFieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Notice Period (days)</label>
                  <input type="number" value={form.notice_period_days} onChange={e => setForm({ ...form, notice_period_days: parseInt(e.target.value) })} style={formFieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Available Start Date</label>
                  <input type="date" value={form.available_start_date} onChange={e => setForm({ ...form, available_start_date: e.target.value })} style={formFieldStyle} />
                </div>
              </div>

              {/* Employment History Records */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Company & Role History</label>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      employment_history: [...(form.employment_history || []), { company_name: '', job_title: '', start_date: '', end_date: '', currently_working: false, responsibilities: '' }]
                    })}
                    style={{
                      padding: '6px 12px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Company
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {(form.employment_history || []).map((emp, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <input type="text" placeholder="Company Name" value={emp.company_name} onChange={e => {
                          const updated = [...(form.employment_history || [])];
                          updated[idx].company_name = e.target.value;
                          setForm({ ...form, employment_history: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <input type="text" placeholder="Job Title" value={emp.job_title} onChange={e => {
                          const updated = [...(form.employment_history || [])];
                          updated[idx].job_title = e.target.value;
                          setForm({ ...form, employment_history: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input type="date" placeholder="Start Date" value={emp.start_date} onChange={e => {
                            const updated = [...(form.employment_history || [])];
                            updated[idx].start_date = e.target.value;
                            setForm({ ...form, employment_history: updated });
                          }} style={{ ...formFieldStyle, padding: '8px' }} />

                          <input type="date" placeholder="End Date" value={emp.end_date} onChange={e => {
                            const updated = [...(form.employment_history || [])];
                            updated[idx].end_date = e.target.value;
                            setForm({ ...form, employment_history: updated });
                          }} style={{ ...formFieldStyle, padding: '8px' }} />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={emp.currently_working || false}
                            onChange={e => {
                              const updated = [...(form.employment_history || [])];
                              updated[idx].currently_working = e.target.checked;
                              setForm({ ...form, employment_history: updated });
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span>Currently working here</span>
                        </label>

                        <textarea
                          placeholder="Key responsibilities and achievements in this role"
                          value={emp.responsibilities}
                          onChange={e => {
                            const updated = [...(form.employment_history || [])];
                            updated[idx].responsibilities = e.target.value;
                            setForm({ ...form, employment_history: updated });
                          }}
                          style={{ ...formFieldStyle, padding: '8px', minHeight: '80px' }}
                        />
                      </div>
                      {(form.employment_history || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            employment_history: (form.employment_history || []).filter((_, i) => i !== idx)
                          })}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#ffebee',
                            color: '#c62828',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {currentStep === 'education' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>🎓 Education & Skills</h3>

              {/* Key Skills Section */}
              <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#666' }}>Key Skills *</label>
                <textarea
                  placeholder="e.g., Python, React, Leadership, Project Management, Communication"
                  value={form.key_skills}
                  onChange={e => setForm({ ...form, key_skills: e.target.value })}
                  style={{ ...formFieldStyle, minHeight: '100px' }}
                />
                {cvExtracted && (
                  <p style={{ fontSize: '11px', color: '#FF6B35', marginTop: '4px' }}>✅ Auto-extracted from CV</p>
                )}
              </div>

              {/* Education Records */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Education Records</label>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      education_records: [...(form.education_records || []), { institution_name: '', qualification: '', field_of_study: '', graduation_year: '', gpa: '' }]
                    })}
                    style={{
                      padding: '6px 12px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Education
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {(form.education_records || []).map((edu, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <input type="text" placeholder="Institution/University" value={edu.institution_name} onChange={e => {
                          const updated = [...(form.education_records || [])];
                          updated[idx].institution_name = e.target.value;
                          setForm({ ...form, education_records: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <select value={edu.qualification} onChange={e => {
                          const updated = [...(form.education_records || [])];
                          updated[idx].qualification = e.target.value;
                          setForm({ ...form, education_records: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }}>
                          <option value="">Select Qualification</option>
                          {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>

                        <input type="text" placeholder="Field of Study" value={edu.field_of_study} onChange={e => {
                          const updated = [...(form.education_records || [])];
                          updated[idx].field_of_study = e.target.value;
                          setForm({ ...form, education_records: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input type="text" placeholder="Graduation Year (e.g., 2020)" value={edu.graduation_year} onChange={e => {
                            const updated = [...(form.education_records || [])];
                            updated[idx].graduation_year = e.target.value;
                            setForm({ ...form, education_records: updated });
                          }} style={{ ...formFieldStyle, padding: '8px' }} />

                          <input type="text" placeholder="GPA (optional)" value={edu.gpa} onChange={e => {
                            const updated = [...(form.education_records || [])];
                            updated[idx].gpa = e.target.value;
                            setForm({ ...form, education_records: updated });
                          }} style={{ ...formFieldStyle, padding: '8px' }} />
                        </div>
                      </div>
                      {(form.education_records || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            education_records: (form.education_records || []).filter((_, i) => i !== idx)
                          })}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#ffebee',
                            color: '#c62828',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CV UPLOAD */}
          {currentStep === 'cv' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>📄 Upload CV</h3>
              <div style={{ padding: '20px', background: '#E3F2FD', border: '2px dashed #2196F3', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                <p style={{ fontSize: '13px', color: '#0D47A1', fontWeight: '600', margin: '0 0 12px 0' }}>
                  Drop your CV here or click to select
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => e.target.files && handleCVUpload(e.target.files[0])}
                  style={{ display: 'none', width: '100%' }}
                  id="cv-upload"
                />
                <label htmlFor="cv-upload" style={{ cursor: 'pointer', textDecoration: 'underline', color: '#2196F3' }}>
                  Click to browse
                </label>
                <p style={{ fontSize: '11px', color: '#666', margin: '12px 0 0 0' }}>
                  Supported formats: PDF, DOC, DOCX (Max 5MB)
                </p>
                {form.cv_file && (
                  <p style={{ fontSize: '12px', color: '#FF6B35', marginTop: '12px', fontWeight: '600' }}>
                    ✅ {form.cv_file.name} uploaded
                  </p>
                )}
              </div>
            </div>
          )}

          {/* REFEREE REFERENCES */}
          {currentStep === 'referee' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>👥 Professional References</h3>
              <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
                <p style={{ fontSize: '13px', color: '#E65100', margin: 0, lineHeight: 1.6 }}>
                  📞 Please provide at least 2 professional references who can speak to your work experience and character. These could be former managers, colleagues, or clients.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>References ({(form.referee_contacts || []).length}/3)</label>
                  {(form.referee_contacts || []).length < 3 && (
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        referee_contacts: [...(form.referee_contacts || []), { name: '', position: '', company: '', phone: '', email: '' }]
                      })}
                      style={{
                        padding: '6px 12px',
                        background: '#FF6B35',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      + Add Reference
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {(form.referee_contacts || []).map((referee, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <input type="text" placeholder="Full Name *" value={referee.name} onChange={e => {
                          const updated = [...(form.referee_contacts || [])];
                          updated[idx].name = e.target.value;
                          setForm({ ...form, referee_contacts: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <input type="text" placeholder="Position/Title" value={referee.position} onChange={e => {
                          const updated = [...(form.referee_contacts || [])];
                          updated[idx].position = e.target.value;
                          setForm({ ...form, referee_contacts: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <input type="text" placeholder="Company/Organization" value={referee.company} onChange={e => {
                          const updated = [...(form.referee_contacts || [])];
                          updated[idx].company = e.target.value;
                          setForm({ ...form, referee_contacts: updated });
                        }} style={{ ...formFieldStyle, padding: '8px' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input type="tel" placeholder="Phone *" value={referee.phone} onChange={e => {
                            const updated = [...(form.referee_contacts || [])];
                            updated[idx].phone = e.target.value;
                            setForm({ ...form, referee_contacts: updated });
                          }} style={{ ...formFieldStyle, padding: '8px' }} />

                          <input type="email" placeholder="Email *" value={referee.email} onChange={e => {
                            const updated = [...(form.referee_contacts || [])];
                            updated[idx].email = e.target.value;
                            setForm({ ...form, referee_contacts: updated });
                          }} style={{ ...formFieldStyle, padding: '8px' }} />
                        </div>
                      </div>
                      {(form.referee_contacts || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            referee_contacts: (form.referee_contacts || []).filter((_, i) => i !== idx)
                          })}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#ffebee',
                            color: '#c62828',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* The health/disability declaration that stood here has been removed.
              It asked every applicant about medical conditions and disabilities
              before any offer, reassuring them it "will not affect hiring
              decisions" — which is the argument against collecting it at this
              point, not for it. Where it genuinely cannot affect the outcome,
              PDPA minimisation says do not ask yet; where it could, asking it
              pre-offer is the evidence a discrimination complaint rests on.
              Job-relevant medical checks and any workplace adjustments are
              handled after an offer. */}

          {currentStep === 'declaration' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>✔️ Declarations & Agreements</h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <input
                    type="checkbox"
                    checked={form.agreements?.agree_to_terms || false}
                    onChange={e => setForm({
                      ...form,
                      agreements: { ...form.agreements!, agree_to_terms: e.target.checked }
                    })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '13px', color: '#333' }}>
                    I declare that all information provided is true and complete. I understand that providing false information may result in rejection or termination.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <input
                    type="checkbox"
                    checked={form.agreements?.agree_to_privacy || false}
                    onChange={e => setForm({
                      ...form,
                      agreements: { ...form.agreements!, agree_to_privacy: e.target.checked }
                    })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '13px', color: '#333' }}>
                    I consent to the processing of my personal data in accordance with the <strong>Personal Data Protection Act (PDPA)</strong> for recruitment purposes.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <input
                    type="checkbox"
                    checked={form.agreements?.agree_to_background_check || false}
                    onChange={e => setForm({
                      ...form,
                      agreements: { ...form.agreements!, agree_to_background_check: e.target.checked }
                    })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '13px', color: '#333' }}>
                    I authorize a background check including criminal history and employment verification.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <input
                    type="checkbox"
                    checked={form.agreements?.agree_to_work_authorization || false}
                    onChange={e => setForm({
                      ...form,
                      agreements: { ...form.agreements!, agree_to_work_authorization: e.target.checked }
                    })}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '13px', color: '#333' }}>
                    I confirm that I am authorized to work in Singapore and possess valid work documentation if required.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* REVIEW */}
          {currentStep === 'review' && (
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>👀 Review Your Application</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '6px', borderLeft: '4px solid #FF6B35' }}>
                  <p style={{ fontSize: '12px', color: '#BF360C', margin: 0 }}>
                    ✅ All required fields are complete. Ready to submit!
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Summary</h4>
                  <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#666' }}>
                    <p><strong>Name:</strong> {form.first_name} {form.last_name}</p>
                    <p><strong>Email:</strong> {form.email}</p>
                    <p><strong>Position:</strong> {form.position_applied || 'Not specified'}</p>
                    <p><strong>Experience:</strong> {form.years_of_experience} years</p>
                    <p><strong>Skills:</strong> {form.key_skills ? form.key_skills.substring(0, 50) + '...' : 'Not provided'}</p>
                    {cvExtracted && <p style={{ color: '#FF6B35', fontWeight: '600' }}>📄 CV uploaded and analyzed</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <button
            onClick={() => {
              const currentIdx = steps.indexOf(currentStep);
              if (currentIdx > 0) setCurrentStep(steps[currentIdx - 1]);
            }}
            disabled={currentStep === 'personal'}
            style={{
              padding: '12px 24px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: currentStep === 'personal' ? 'not-allowed' : 'pointer',
              opacity: currentStep === 'personal' ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>

          <button
            onClick={() => {
              const currentIdx = steps.indexOf(currentStep);
              if (currentIdx < steps.length - 1) {
                setCurrentStep(steps[currentIdx + 1]);
              }
            }}
            disabled={currentStep === 'review'}
            style={{
              padding: '12px 24px',
              background: currentStep === 'review' ? '#FF6B35' : '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: currentStep === 'review' ? 'pointer' : 'pointer',
              fontSize: '13px',
            }}
            onMouseEnter={e => {
              if (currentStep !== 'review') (e.target as HTMLButtonElement).style.background = '#FF5722';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = currentStep === 'review' ? '#FF6B35' : '#FF6B35';
            }}
          >
            {currentStep === 'review' ? (
              <span onClick={handleSubmit} style={{ cursor: 'pointer' }}>🚀 Submit Application</span>
            ) : (
              'Next ➜'
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '20px', color: 'white', fontSize: '12px' }}>
        <p>Have questions? Contact HR at <strong>hr@company.com</strong></p>
      </div>
    </div>
  );
};

export default JobApplicationForm;
