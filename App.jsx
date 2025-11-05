import React, { useEffect, useMemo, useState } from 'react'

// Helper utils: localStorage wrapper
const LS = {
  get(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key))
      return v ?? fallback
    } catch { return fallback }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val))
  }
}

// Seed initial app data (only if empty)
function seed() {
  if (!LS.get('users')) {
    const users = [
      { id: 't1', name: 'Teacher Alice', role: 'teacher', email: 'alice@school.com' },
      { id: 's1', name: 'Student Rohini', role: 'student', email: 'rohini@example.com' },
      { id: 's2', name: 'Student Ravi', role: 'student', email: 'ravi@example.com' },
  { id: 's3', name: 'Student Yaswanth', role: 'student', email: 'yaswanth@example.com' }
    ]
    LS.set('users', users)
  }
  if (!LS.get('assignments')) {
    LS.set('assignments', [])
  }
  if (!LS.get('submissions')) {
    LS.set('submissions', [])
  }
  if (!LS.get('reviews')) {
    LS.set('reviews', [])
  }
}

// Small unique id generator
const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9)

// Simple fake auth: pick a user to "login"
function Login({ users, onLogin }){
  const [sel, setSel] = useState(users[0]?.id || '')
  return (
    <div className="card">
      <h2>Mock Login</h2>
      <select value={sel} onChange={e=>setSel(e.target.value)}>
        {users.map(u=> <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </select>
      <button onClick={()=>onLogin(users.find(u=>u.id===sel))}>Continue</button>
      <p className="muted">This is a frontend-only demo. No passwords required.</p>
    </div>
  )
}

// Rubric form for teacher to create assignment
function RubricEditor({ rubric, onChange }){
  const updateCriterion = (idx, key, val) => {
    const copy = [...rubric]
    copy[idx] = { ...copy[idx], [key]: val }
    onChange(copy)
  }
  const add = () => onChange([...rubric, { id: uid('c'), title: 'New criterion', maxScore: 5 }])
  const remove = (idx) => {
    const copy = [...rubric]
    copy.splice(idx,1)
    onChange(copy)
  }
  return (
    <div className="rubric-editor">
      <h4>Rubric</h4>
      {rubric.map((c, i)=> (
        <div key={c.id} className="rubric-row">
          <input value={c.title} onChange={e=>updateCriterion(i,'title',e.target.value)} />
          <input type="number" min={1} value={c.maxScore} onChange={e=>updateCriterion(i,'maxScore',Number(e.target.value)||1)} />
          <button onClick={()=>remove(i)}>Remove</button>
        </div>
      ))}
      <button onClick={add}>Add Criterion</button>
    </div>
  )
}

// Teacher: Create assignment
function CreateAssignment({ onCreate }){
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [rubric, setRubric] = useState([{ id: uid('c'), title:'Quality', maxScore:5 },{ id: uid('c'), title:'Completeness', maxScore:5 }])
  const submit = ()=>{
    if (!title.trim()) return alert('Title required')
    onCreate({ id: uid('a'), title, desc, rubric, createdAt: Date.now(), reviewersPerSubmission: 2 })
    setTitle(''); setDesc('')
  }
  return (
    <div className="card">
      <h3>Create Assignment</h3>
      <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
      <RubricEditor rubric={rubric} onChange={setRubric} />
      <button onClick={submit}>Create Assignment</button>
    </div>
  )
}

// Student: Submit to assignment (no files, just text or link)
function SubmitForm({ assignment, onSubmit, currentUser }){
  const [content, setContent] = useState('')
  const submit = ()=>{
    if (!content.trim()) return alert('Please enter work text or link')
    onSubmit({ id: uid('sub'), assignmentId: assignment.id, authorId: currentUser.id, content, version: 1, createdAt: Date.now() })
    setContent('')
  }
  return (
    <div className="card">
      <h4>Submit for: {assignment.title}</h4>
      <textarea placeholder="Paste your work link or text" value={content} onChange={e=>setContent(e.target.value)} />
      <button onClick={submit}>Submit</button>
    </div>
  )
}

// ReviewForm: Render rubric and collect scores+
function ReviewForm({ assignment, onSubmitReview, submission, existingReview }){
  const [scores, setScores] = useState(() => {
    if (existingReview) return existingReview.scores
    const s = {}
    assignment.rubric.forEach(c => s[c.id] = 0)
    return s
  })
  const [comment, setComment] = useState(existingReview?.comment || '')
  const setScore = (cid, val) => setScores(s=>({ ...s, [cid]: Number(val) }))
  const submit = ()=>{
    // validate
    for (let c of assignment.rubric) if (scores[c.id] == null) return alert('Please fill all scores')
    onSubmitReview({ scores, comment })
  }
  return (
    <div className="card">
      <h4>Review Submission</h4>
      <p><b>Submission:</b> {submission.content}</p>
      {assignment.rubric.map(c=> (
        <div key={c.id} className="rubric-row">
          <label>{c.title} (max {c.maxScore})</label>
          <input type="number" min={0} max={c.maxScore} value={scores[c.id]} onChange={e=>setScore(c.id,e.target.value)} />
        </div>
      ))}
      <textarea placeholder="Feedback comments" value={comment} onChange={e=>setComment(e.target.value)} />
      <button onClick={submit}>Submit Review</button>
    </div>
  )
}

// Main App
export default function App(){
  // seed on first run
  useEffect(seed, [])
  const users = LS.get('users', [])
  const [user, setUser] = useState(LS.get('currentUser', null))
  useEffect(()=> LS.set('currentUser', user), [user])

  const [assignments, setAssignments] = useState(LS.get('assignments', []))
  const [submissions, setSubmissions] = useState(LS.get('submissions', []))
  const [reviews, setReviews] = useState(LS.get('reviews', []))

  useEffect(()=> LS.set('assignments', assignments), [assignments])
  useEffect(()=> LS.set('submissions', submissions), [submissions])
  useEffect(()=> LS.set('reviews', reviews), [reviews])

  const refreshFromLS = ()=>{
    setAssignments(LS.get('assignments', []))
    setSubmissions(LS.get('submissions', []))
    setReviews(LS.get('reviews', []))
  }

  // Teacher: create assignment
  const createAssignment = (a) => {
    setAssignments(prev=>[...prev, a])
  }

  // Student: submit
  const createSubmission = (s) => {
    setSubmissions(prev=>[...prev, s])
    // automatically assign reviewers (simple random, excluding author)
    const students = users.filter(u=>u.role==='student' && u.id !== s.authorId)
    const reviewersNeeded = (assignments.find(a=>a.id===s.assignmentId)?.reviewersPerSubmission) || 2
    const chosen = []
    while (chosen.length < Math.min(reviewersNeeded, students.length)){
      const pick = students[Math.floor(Math.random()*students.length)]
      if (!chosen.includes(pick.id)) chosen.push(pick.id)
    }
    // create placeholder review assignments (unsubmitted)
    const placeholders = chosen.map(rid => ({ id: uid('ra'), submissionId: s.id, reviewerId: rid, scores: null, comment: null, assignedAt: Date.now(), status: 'pending' }))
    setReviews(prev=>[...prev, ...placeholders])
  }

  // Submit review
  const submitReview = (submissionId, reviewerId, scores, comment) => {
    // find pending placeholder and replace
    setReviews(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(r => r.submissionId===submissionId && r.reviewerId===reviewerId && r.status==='pending')
      if (idx>=0){
        copy[idx] = { ...copy[idx], scores, comment, status: 'done', submittedAt: Date.now() }
      } else {
        copy.push({ id: uid('r'), submissionId, reviewerId, scores, comment, status:'done', submittedAt: Date.now() })
      }
      return copy
    })
  }

  const logout = ()=> setUser(null)

  // derived
  const mySubmissions = useMemo(()=> submissions.filter(s=> s.authorId === user?.id), [submissions, user])
  const myAssignedReviews = useMemo(()=> reviews.filter(r=> r.reviewerId === user?.id), [reviews, user])

  if (!user) return <div className="wrap"><Login users={users} onLogin={u=>setUser(u)} /></div>

  return (
    <div className="wrap">
      <header>
        <h1>Peer Review — Demo (frontend-only)</h1>
        <div className="head-right">
          <div>{user.name} ({user.role})</div>
          <button onClick={logout}>Logout</button>
          <button onClick={refreshFromLS} title="Reload from localStorage">Reload</button>
        </div>
      </header>
      <main>
        {user.role === 'teacher' ? (
          <div className="grid">
            <div>
              <CreateAssignment onCreate={createAssignment} />
              <div className="card">
                <h3>Existing assignments</h3>
                {assignments.length===0 && <p className="muted">No assignments yet</p>}
                {assignments.map(a=> (
                  <div key={a.id} className="item">
                    <h4>{a.title}</h4>
                    <p>{a.desc}</p>
                    <small>Criteria: {a.rubric.map(r=>r.title).join(', ')}</small>
                    <div>Submissions: {submissions.filter(s=>s.assignmentId===a.id).length}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="card">
                <h3>All Submissions</h3>
                {submissions.length===0 && <p className="muted">No submissions yet</p>}
                {submissions.map(s=> (
                  <div key={s.id} className="item">
                    <b>{users.find(u=>u.id===s.authorId)?.name}</b> submitted for <i>{assignments.find(a=>a.id===s.assignmentId)?.title}</i>
                    <p>{s.content}</p>
                    <div>
                      Reviews: {reviews.filter(r=> r.submissionId===s.id && r.status==='done').length} / {reviews.filter(r=> r.submissionId===s.id).length}
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>Review Progress</h3>
                {assignments.map(a=> (
                  <div key={a.id}>
                    <h4>{a.title}</h4>
                    <ul>
                      {submissions.filter(s=> s.assignmentId===a.id).map(s=> (
                        <li key={s.id}>{users.find(u=>u.id===s.authorId)?.name} — {reviews.filter(r=> r.submissionId===s.id && r.status==='done').length}/{reviews.filter(r=> r.submissionId===s.id).length} reviews done</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid">
            <div>
              <div className="card">
                <h3>Available Assignments</h3>
                {assignments.length===0 && <p className="muted">No assignments yet</p>}
                {assignments.map(a=> (
                  <div key={a.id} className="item">
                    <b>{a.title}</b>
                    <p>{a.desc}</p>
                    <SubmitForm assignment={a} onSubmit={createSubmission} currentUser={user} />
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>My Submissions</h3>
                {mySubmissions.length===0 && <p className="muted">No submissions yet</p>}
                {mySubmissions.map(s=> (
                  <div key={s.id} className="item">
                    <b>{assignments.find(a=>a.id===s.assignmentId)?.title}</b>
                    <p>{s.content}</p>
                    <div>Reviews received: {reviews.filter(r=> r.submissionId===s.id && r.status==='done').length}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="card">
                <h3>Assigned Reviews</h3>
                {myAssignedReviews.length===0 && <p className="muted">No reviews assigned yet</p>}
                {myAssignedReviews.map(r=> (
                  <div key={r.id} className="item">
                    <b>Submission</b>
                    <p>{submissions.find(s=>s.id===r.submissionId)?.content}</p>
                    {r.status === 'pending' ? (
                      <div>
                        <h5>Fill review</h5>
                        <ReviewForm assignment={assignments.find(a=>a.id===submissions.find(s=>s.id===r.submissionId)?.assignmentId)} submission={submissions.find(s=>s.id===r.submissionId)} onSubmitReview={({ scores, comment }) => submitReview(r.submissionId, r.reviewerId, scores, comment)} />
                      </div>
                    ) : (
                      <div>Submitted</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer>
        <small>Demo — data stored in browser localStorage; refresh to reload; use "Reload" to pick up external edits.</small>
      </footer>
    </div>
  )
}

// ------------------------- index.css -------------------------
