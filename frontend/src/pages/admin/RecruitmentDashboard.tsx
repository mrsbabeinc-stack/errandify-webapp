import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { jobOpeningAPI } from '../../services/adminAPI';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  reportingTo: string;
  teamSize: number;
  jobDescription: string;
  requirements: string;
  responsibilities: string;
  salaryRange: { min: number; max: number };
  workArrangement: 'onsite' | 'remote' | 'hybrid' | 'flexible';
  screeningQuestions: ScreeningQuestion[];
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  publishedAt?: string;
  closedAt?: string;
  candidatesCount: number;
}

interface ScreeningQuestion {
  id: string;
  category: 'technical' | 'experience' | 'behavioral' | 'motivation' | 'availability' | 'red-flag';
  question: string;
  questionType: 'text' | 'multiple-choice' | 'scale' | 'ranking';
  options?: string[];
  weightage: number; // 1-5, importance for scoring
  expectedAnswer?: string; // For auto-scoring guidance
}

interface CandidateApplication {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  resumeUrl?: string;
  inviteLink: string;
  inviteLinkExpiry: string;
  uniqueId: string;
  status: 'sent' | 'clicked' | 'in-progress' | 'completed' | 'expired';
  linkSentDate: string;
  firstAccessDate?: string;
  completionDate?: string;
  score?: number; // 0-100
  answers: { questionId: string; answer: string }[];
  recommendation?: 'pass' | 'flag' | 'contact';
  redFlags: string[];
  interviewScheduled?: string;
  createdAt: string;
}

interface InterviewPrep {
  candidateName: string;
  score: number;
  keyStrengths: string[];
  keyGaps: string[];
  talkingPoints: string[];
  redFlags: string[];
  recommendation: 'pass' | 'flag' | 'contact';
}

const RecruitmentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'openings' | 'screening' | 'candidates' | 'analytics'>('openings');
  const [activeStep, setActiveStep] = useState<'jobs' | 'create' | 'invite' | 'track'>('jobs');

  // Job Opening State
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobOpening | null>(null);
  const [interviewStep, setInterviewStep] = useState(0);

  // Candidate State
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedJobForInvite, setSelectedJobForInvite] = useState<string>('');

  // Interview Prep State
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateApplication | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);

  const [jobForm, setJobForm] = useState({
    title: '',
    department: '',
    reportingTo: '',
    teamSize: 1,
    workArrangement: 'hybrid' as const,
    salaryMin: 0,
    salaryMax: 0,
  });

  const [interviewAnswers, setInterviewAnswers] = useState({
    roleOverview: '',
    responsibilities: '',
    requirements: '',
  });

  const [inviteForm, setInviteForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    linkExpireDays: 7,
  });

  /**
   * Openings come from the API. The candidate list below still does not:
   * the invite-link/scoring flow this screen models has no store yet, so
   * `applications` stays empty rather than showing invented candidates.
   * Real applications are visible on the Recruitment Applications screen,
   * which reads /api/recruitment/applications.
   */
  const loadOpenings = async () => {
    try {
      const res = await jobOpeningAPI.getAll();
      setJobOpenings(
        (res.data || []).map((o: any) => ({
          id: String(o.id),
          title: o.title,
          department: o.department || '',
          reportingTo: o.reporting_to || '',
          teamSize: Number(o.team_size) || 0,
          jobDescription: o.job_description || '',
          requirements: o.requirements || '',
          responsibilities: o.responsibilities || '',
          salaryRange: {
            min: Number(o.salary_min) || 0,
            max: Number(o.salary_max) || 0,
          },
          workArrangement: (o.work_arrangement || 'onsite') as JobOpening['workArrangement'],
          screeningQuestions: [],
          // The database calls the live state 'open'; this screen calls it
          // 'published'.
          status: (o.status === 'open' ? 'published' : o.status) as JobOpening['status'],
          createdAt: o.created_at || '',
          publishedAt: o.published_at || undefined,
          closedAt: o.closed_at || undefined,
          candidatesCount: Number(o.candidates_count) || 0,
        }))
      );
    } catch (error: any) {
      console.error('Failed to load job openings:', error);
      showToast(`⚠️ ${error.message || 'Could not load job openings'}`, 'error');
    }
  };

  useEffect(() => {
    loadOpenings();
  }, []);

  const generateScreeningQuestions = (roleOverview: string, responsibilities: string, requirements: string): ScreeningQuestion[] => {
    // Qwen AI would generate these, but we'll create realistic demo questions
    return [
      {
        id: `q_${Date.now()}_1`,
        category: 'technical',
        question: `Based on the requirements for this role (${requirements}), describe your experience and proficiency level with these technologies.`,
        questionType: 'text',
        weightage: 5,
      },
      {
        id: `q_${Date.now()}_2`,
        category: 'technical',
        question: 'Tell us about your most significant technical achievement or project you led.',
        questionType: 'text',
        weightage: 4,
      },
      {
        id: `q_${Date.now()}_3`,
        category: 'experience',
        question: `How does your experience align with these key responsibilities: ${responsibilities.substring(0, 80)}?`,
        questionType: 'text',
        weightage: 4,
      },
      {
        id: `q_${Date.now()}_4`,
        category: 'experience',
        question: 'Describe a challenging situation you faced and how you overcame it.',
        questionType: 'text',
        weightage: 3,
      },
      {
        id: `q_${Date.now()}_5`,
        category: 'behavioral',
        question: 'How do you handle disagreements or conflicts with team members?',
        questionType: 'text',
        weightage: 3,
      },
      {
        id: `q_${Date.now()}_6`,
        category: 'behavioral',
        question: 'Describe a time when you had to adapt quickly to changing requirements.',
        questionType: 'text',
        weightage: 3,
      },
      {
        id: `q_${Date.now()}_7`,
        category: 'motivation',
        question: 'Why are you interested in this role specifically? What attracts you to our company?',
        questionType: 'text',
        weightage: 2,
      },
      {
        id: `q_${Date.now()}_8`,
        category: 'availability',
        question: 'What is your notice period and when can you start?',
        questionType: 'text',
        weightage: 2,
      },
      {
        id: `q_${Date.now()}_9`,
        category: 'availability',
        question: 'What are your salary expectations for this role?',
        questionType: 'text',
        weightage: 2,
      },
      {
        id: `q_${Date.now()}_10`,
        category: 'red-flag',
        question: 'Are there any gaps in your employment history? Please explain.',
        questionType: 'text',
        weightage: 1,
      },
      {
        id: `q_${Date.now()}_11`,
        category: 'red-flag',
        question: 'How many companies have you worked for in the past 5 years?',
        questionType: 'text',
        weightage: 1,
      },
      {
        id: `q_${Date.now()}_12`,
        category: 'red-flag',
        question: 'Is there anything else we should know about your qualifications or background?',
        questionType: 'text',
        weightage: 1,
      },
    ];
  };

  const generateUniqueId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };

  const handleCreateJobStart = () => {
    setInterviewStep(0);
    setShowJobForm(true);
  };

  const handleJobInterviewNext = () => {
    if (interviewStep === 0 && !jobForm.title) {
      showToast('❌ Please enter job title', 'error');
      return;
    }
    setInterviewStep(interviewStep + 1);
  };

  const handleGenerateJD = () => {
    if (!interviewAnswers.roleOverview || !interviewAnswers.responsibilities || !interviewAnswers.requirements) {
      showToast('❌ Please fill in all fields', 'error');
      return;
    }

    const questions = generateScreeningQuestions(
      interviewAnswers.roleOverview,
      interviewAnswers.responsibilities,
      interviewAnswers.requirements
    );

    void (async () => {
      try {
        const created = await jobOpeningAPI.create({
          title: jobForm.title,
          department: jobForm.department,
          reporting_to: jobForm.reportingTo,
          team_size: jobForm.teamSize,
          work_arrangement: jobForm.workArrangement,
          salary_min: jobForm.salaryMin,
          salary_max: jobForm.salaryMax,
          job_description: `${interviewAnswers.roleOverview}\n\nResponsibilities:\n${interviewAnswers.responsibilities}\n\nRequirements:\n${interviewAnswers.requirements}`,
          responsibilities: interviewAnswers.responsibilities,
          requirements: interviewAnswers.requirements,
        });

        // Questions are persisted against the opening rather than living in
        // component state, so they survive a reload and can be scored later.
        const openingId = created.data.id;
        for (const q of questions) {
          await jobOpeningAPI.addQuestion(openingId, {
            category: q.category,
            question: q.question,
            question_type: q.questionType,
            options: q.options,
            weightage: q.weightage,
            expected_answer: q.expectedAnswer,
          });
        }

        await loadOpenings();
        showToast('✅ Job opening created with screening questions', 'success');
      } catch (error: any) {
        showToast(`❌ ${error.message || 'Could not create job opening'}`, 'error');
      }
    })();

    setShowJobForm(false);
    setInterviewStep(0);
    setJobForm({
      title: '',
      department: '',
      reportingTo: '',
      teamSize: 1,
      workArrangement: 'hybrid',
      salaryMin: 0,
      salaryMax: 0,
    });
    setInterviewAnswers({
      roleOverview: '',
      responsibilities: '',
      requirements: '',
    });
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      // The server maps "published" onto the DB's 'open', which is the state
      // application intake checks before accepting a candidate.
      await jobOpeningAPI.update(Number(jobId), { status: 'published' });
      await loadOpenings();
      showToast('✅ Job opening published', 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not publish job opening'}`, 'error');
    }
  };

  const handleInviteCandidate = async () => {
    if (!selectedJobForInvite || !inviteForm.candidateName || !inviteForm.candidateEmail) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }

    try {
      // The link used to be a cosmetic string built from Date.now() that
      // resolved to nothing. The server now issues a real random token and
      // stores the invite; this returns the path to send the candidate.
      const res = await jobOpeningAPI.invite(Number(selectedJobForInvite), {
        candidate_name: inviteForm.candidateName,
        candidate_email: inviteForm.candidateEmail,
      });

      const link = `${window.location.origin}${res.data.invite_path}`;
      try {
        await navigator.clipboard.writeText(link);
        showToast(`✅ Invite created for ${inviteForm.candidateName} — link copied to clipboard`, 'success');
      } catch {
        // Clipboard can be blocked; the link still has to be visible.
        showToast(`✅ Invite created. Link: ${link}`, 'success');
      }

      setShowInviteForm(false);
      setInviteForm({
        candidateName: '',
        candidateEmail: '',
        candidatePhone: '',
        linkExpireDays: 7,
      });
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not create invite'}`, 'error');
    }
  };

  const generateInterviewPrep = (application: CandidateApplication, job: JobOpening): InterviewPrep => {
    // Qwen AI would analyze answers, for now we'll create demo analysis
    const strengths = application.score! >= 80 ? ['Strong technical foundation', 'Clear communication'] : ['Shows potential', 'Willing to learn'];
    const gaps = application.score! < 75 ? ['Some experience gaps', 'May need training'] : [];

    return {
      candidateName: application.candidateName,
      score: application.score || 0,
      keyStrengths: strengths,
      keyGaps: gaps,
      talkingPoints: [
        `Discuss their score (${application.score}/100) and what impressed you`,
        'Deep dive on their most significant project',
        `Explore their motivation for joining Errandify`,
        'Discuss team dynamics and collaboration style',
        `Address any red flags: ${application.redFlags.join(', ') || 'None'}`,
      ],
      redFlags: application.redFlags,
      recommendation: application.recommendation || 'contact',
    };
  };

  const stats = {
    totalJobs: jobOpenings.length,
    publishedJobs: jobOpenings.filter(j => j.status === 'published').length,
    totalCandidates: applications.length,
    completed: applications.filter(a => a.status === 'completed').length,
    avgScore: applications.filter(a => a.score).length > 0
      ? Math.round(applications.filter(a => a.score).reduce((sum, a) => sum + (a.score || 0), 0) / applications.filter(a => a.score).length)
      : 0,
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              🎯 AI Recruitment & Hiring
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            AI-powered job descriptions, screening questionnaires, candidate evaluation, and interview preparation
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32', marginBottom: '4px' }}>Active Job Openings</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#4CAF50' }}>{stats.publishedJobs}</div>
            <div style={{ fontSize: '11px', color: '#2E7D32', marginTop: '4px' }}>of {stats.totalJobs} total</div>
          </div>
          <div style={{ padding: '16px', background: '#E3F2FD', borderRadius: '8px', border: '2px solid #2196F3' }}>
            <div style={{ fontSize: '12px', color: '#0D47A1', marginBottom: '4px' }}>Total Candidates</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#2196F3' }}>{stats.totalCandidates}</div>
            <div style={{ fontSize: '11px', color: '#0D47A1', marginTop: '4px' }}>{stats.completed} completed</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Avg Screening Score</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF9800' }}>{stats.avgScore}/100</div>
            <div style={{ fontSize: '11px', color: '#E65100', marginTop: '4px' }}>quality indicator</div>
          </div>
          <div style={{ padding: '16px', background: '#F3E5F5', borderRadius: '8px', border: '2px solid #9C27B0' }}>
            <div style={{ fontSize: '12px', color: '#4A148C', marginBottom: '4px' }}>Pending Response</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#9C27B0' }}>{applications.filter(a => a.status === 'sent' || a.status === 'in-progress').length}</div>
            <div style={{ fontSize: '11px', color: '#4A148C', marginTop: '4px' }}>awaiting completion</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['openings', 'screening', 'candidates', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'openings' && '📋 Job Openings'}
              {tab === 'screening' && '❓ Screening'}
              {tab === 'candidates' && '👥 Candidates'}
              {tab === 'analytics' && '📈 Analytics'}
            </button>
          ))}
        </div>

        {/* JOB OPENINGS TAB */}
        {activeTab === 'openings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Job Openings</h3>
              <button
                onClick={handleCreateJobStart}
                style={{
                  padding: '8px 16px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showJobForm ? '✕ Cancel' : '+ New Job Opening'}
              </button>
            </div>

            {showJobForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                  Step {interviewStep + 1}: {interviewStep === 0 ? 'Job Details' : interviewStep === 1 ? 'Role Overview' : 'Responsibilities & Requirements'}
                </div>

                {interviewStep === 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Job Title *"
                      value={jobForm.title}
                      onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Department *"
                      value={jobForm.department}
                      onChange={e => setJobForm({ ...jobForm, department: e.target.value })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Reporting To"
                      value={jobForm.reportingTo}
                      onChange={e => setJobForm({ ...jobForm, reportingTo: e.target.value })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="number"
                      placeholder="Team Size"
                      value={jobForm.teamSize}
                      onChange={e => setJobForm({ ...jobForm, teamSize: parseInt(e.target.value) || 1 })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <select
                      value={jobForm.workArrangement}
                      onChange={e => setJobForm({ ...jobForm, workArrangement: e.target.value as any })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="onsite">Onsite</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="flexible">Flexible</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Salary Min (SGD)"
                      value={jobForm.salaryMin}
                      onChange={e => setJobForm({ ...jobForm, salaryMin: parseInt(e.target.value) || 0 })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="number"
                      placeholder="Salary Max (SGD)"
                      value={jobForm.salaryMax}
                      onChange={e => setJobForm({ ...jobForm, salaryMax: parseInt(e.target.value) || 0 })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                )}

                {interviewStep === 1 && (
                  <textarea
                    placeholder="Role Overview - Describe the role, team context, and why this position is important"
                    value={interviewAnswers.roleOverview}
                    onChange={e => setInterviewAnswers({ ...interviewAnswers, roleOverview: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px', fontFamily: 'inherit' }}
                  />
                )}

                {interviewStep === 2 && (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <textarea
                      placeholder="Key Responsibilities - What will this person do day-to-day?"
                      value={interviewAnswers.responsibilities}
                      onChange={e => setInterviewAnswers({ ...interviewAnswers, responsibilities: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px', fontFamily: 'inherit' }}
                    />
                    <textarea
                      placeholder="Requirements - Skills, experience, education needed"
                      value={interviewAnswers.requirements}
                      onChange={e => setInterviewAnswers({ ...interviewAnswers, requirements: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px', fontFamily: 'inherit' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={interviewStep === 2 ? handleGenerateJD : handleJobInterviewNext}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {interviewStep === 2 ? '✓ Generate JD & Questions' : 'Next →'}
                  </button>
                  {interviewStep > 0 && (
                    <button
                      onClick={() => setInterviewStep(interviewStep - 1)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ← Previous
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {jobOpenings.map(job => (
                <div key={job.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{job.title}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {job.department} • {job.workArrangement} • SGD {job.salaryRange.min.toLocaleString()}-{job.salaryRange.max.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: job.status === 'published' ? '#E8F5E9' : '#FFF3E0',
                      color: job.status === 'published' ? '#2E7D32' : '#E65100',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {job.status === 'published' ? '✓ Published' : job.status === 'closed' ? 'Closed' : 'Draft'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                    {job.screeningQuestions.length} screening questions • {job.candidatesCount} candidates
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {job.status !== 'published' && (
                      <button
                        onClick={() => handlePublishJob(job.id)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedJobForInvite(job.id);
                        setShowInviteForm(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      Invite Candidate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCREENING QUESTIONS TAB */}
        {activeTab === 'screening' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Screening Questions</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {jobOpenings
                .filter(j => j.screeningQuestions.length > 0)
                .map(job => (
                  <div key={job.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                      {job.title}
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {job.screeningQuestions.map((q, idx) => (
                        <div key={q.id} style={{ padding: '12px', background: '#F5F5F5', borderRadius: '4px', borderLeft: '3px solid #FF6B35' }}>
                          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                            Q{idx + 1} • {q.category.toUpperCase()} • Weight: {q.weightage}/5
                          </div>
                          <div style={{ fontSize: '13px', color: '#333' }}>{q.question}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CANDIDATES TAB */}
        {activeTab === 'candidates' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Candidate Applications</h3>
              {showInviteForm && selectedJobForInvite && (
                <button
                  onClick={() => setShowInviteForm(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕ Cancel
                </button>
              )}
            </div>

            {showInviteForm && selectedJobForInvite && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Candidate Name *"
                  value={inviteForm.candidateName}
                  onChange={e => setInviteForm({ ...inviteForm, candidateName: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={inviteForm.candidateEmail}
                  onChange={e => setInviteForm({ ...inviteForm, candidateEmail: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={inviteForm.candidatePhone}
                  onChange={e => setInviteForm({ ...inviteForm, candidatePhone: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <select
                  value={inviteForm.linkExpireDays}
                  onChange={e => setInviteForm({ ...inviteForm, linkExpireDays: parseInt(e.target.value) })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value={3}>Link expires in 3 days</option>
                  <option value={7}>Link expires in 7 days</option>
                  <option value={14}>Link expires in 14 days</option>
                  <option value={30}>Link expires in 30 days</option>
                </select>
                <button
                  onClick={handleInviteCandidate}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  📧 Send Invite Link
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {applications.map(app => {
                const job = jobOpenings.find(j => j.id === app.jobId);
                return (
                  <div key={app.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{app.candidateName}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{job?.title || 'Unknown Job'}</div>
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: app.status === 'completed' ? '#E8F5E9' : app.status === 'sent' ? '#FFF3E0' : '#E3F2FD',
                        color: app.status === 'completed' ? '#2E7D32' : app.status === 'sent' ? '#E65100' : '#0D47A1',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {app.status === 'completed' ? '✓ Completed' : app.status === 'sent' ? '📧 Sent' : '⏳ In Progress'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      <div>Email: <strong>{app.candidateEmail}</strong></div>
                      <div>Phone: <strong>{app.candidatePhone || 'N/A'}</strong></div>
                      {app.score !== undefined && <div>Score: <strong style={{ color: '#FF9800' }}>{app.score}/100</strong></div>}
                      <div>Sent: <strong>{app.linkSentDate}</strong></div>
                      <div>Link Expires: <strong>{app.inviteLinkExpiry}</strong></div>
                      {app.interviewScheduled && <div>Interview: <strong style={{ color: '#4CAF50' }}>{app.interviewScheduled}</strong></div>}
                    </div>
                    {app.redFlags.length > 0 && (
                      <div style={{ padding: '8px 12px', background: '#FFEBEE', borderRadius: '3px', marginBottom: '8px', fontSize: '11px', color: '#C62828' }}>
                        🚩 Red Flags: {app.redFlags.join(', ')}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedCandidate(app);
                          const job = jobOpenings.find(j => j.id === app.jobId);
                          if (job) {
                            setInterviewPrep(generateInterviewPrep(app, job));
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        📋 Interview Prep
                      </button>
                      {app.status === 'completed' && (
                        <button
                          style={{
                            padding: '6px 12px',
                            background: app.recommendation === 'pass' ? '#4CAF50' : app.recommendation === 'flag' ? '#FF9800' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          {app.recommendation === 'pass' ? '✓ Pass' : app.recommendation === 'flag' ? '🚩 Flag' : '📞 Contact'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Recruitment Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>📊 Jobs by Status</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Published:</span>
                    <strong>{jobOpenings.filter(j => j.status === 'published').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Draft:</span>
                    <strong>{jobOpenings.filter(j => j.status === 'draft').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Closed:</span>
                    <strong>{jobOpenings.filter(j => j.status === 'closed').length}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>👥 Candidates by Status</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Completed:</span>
                    <strong style={{ color: '#4CAF50' }}>{applications.filter(a => a.status === 'completed').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sent:</span>
                    <strong style={{ color: '#FF9800' }}>{applications.filter(a => a.status === 'sent').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>In Progress:</span>
                    <strong style={{ color: '#2196F3' }}>{applications.filter(a => a.status === 'in-progress').length}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>📈 Screening Results</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Passed (≥75%):</span>
                    <strong style={{ color: '#4CAF50' }}>{applications.filter(a => a.score && a.score >= 75).length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Flagged (50-74%):</span>
                    <strong style={{ color: '#FF9800' }}>{applications.filter(a => a.score && a.score >= 50 && a.score < 75).length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rejected (Less than 50%):</span>
                    <strong style={{ color: '#F44336' }}>{applications.filter(a => a.score && a.score < 50).length}</strong>
                  </div>
                </div>
              </div>
            </div>

            {selectedCandidate && interviewPrep && (
              <div style={{ marginTop: '24px', padding: '16px', background: '#FFF8F5', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                  📋 Interview Prep: {interviewPrep.candidateName} (Score: {interviewPrep.score}/100)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#333', marginBottom: '8px' }}>✨ Key Strengths</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#666', display: 'grid', gap: '4px' }}>
                      {interviewPrep.keyStrengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#333', marginBottom: '8px' }}>📍 Gaps to Address</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#666', display: 'grid', gap: '4px' }}>
                      {interviewPrep.keyGaps.length > 0 ? interviewPrep.keyGaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      )) : <li>None identified</li>}
                    </ul>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: '#E3F2FD', borderRadius: '4px' }}>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#0D47A1', marginBottom: '8px' }}>💬 Talking Points</div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#0D47A1', display: 'grid', gap: '4px' }}>
                    {interviewPrep.talkingPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RecruitmentDashboard;
